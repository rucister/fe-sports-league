import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import App from '../App.vue'
import leagues from './fixtures/leagues.json'
import leaguesMultiSport from './fixtures/leagues-multi-sport.json'
// The real league 4328 response, trimmed to three seasons, with the newest badge set to null,
// so here the most recent season with a badge is 1995-1996.
import seasonsLatestWithoutBadge from './fixtures/seasons-latest-without-badge.json'
import seasonsNoBadge from './fixtures/seasons-no-badge.json'

// Integration tests: real components and stores, only the network is faked.
const fetchMock = vi.fn<typeof fetch>()

/** Answers the leagues request, and each league's seasons request by league id (an Error fails it). */
function serveApi(leaguesBody: unknown, seasonsByLeagueId: Record<string, unknown> = {}) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/all_leagues.php')) return new Response(JSON.stringify(leaguesBody))
    if (url.pathname.endsWith('/search_all_seasons.php')) {
      const body = seasonsByLeagueId[url.searchParams.get('id') ?? '']
      if (body instanceof Error) throw body
      if (body) return new Response(JSON.stringify(body))
    }
    throw new Error(`Unexpected request: ${url}`)
  })
}

const serveLeagues = (body: unknown) => serveApi(body)

async function mountApp() {
  const wrapper = mount(App, {
    global: { plugins: [createPinia()] },
    attachTo: document.body, // so focus can be checked
  })
  await flushPromises()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountApp>>
const cardNames = (wrapper: Wrapper) =>
  wrapper.findAll('[data-testid="league-name"]').map((name) => name.text())
const countLabel = (wrapper: Wrapper) => wrapper.get('[aria-live]').text()
const badgeRequests = () =>
  fetchMock.mock.calls.filter(([input]) => String(input).includes('search_all_seasons')).length

function cardButton(wrapper: Wrapper, leagueName: string) {
  const button = wrapper.findAll('h2 button').find((b) => b.text().includes(leagueName))
  if (!button) throw new Error(`No card for ${leagueName}`)
  return button
}

async function toggleCard(wrapper: Wrapper, leagueName: string) {
  await cardButton(wrapper, leagueName).trigger('click')
  await flushPromises()
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  sessionStorage.clear() // the badges store keeps results there between page loads
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('league list', () => {
  it('shows each league with its name and sport', async () => {
    serveLeagues(leagues)
    const wrapper = await mountApp()

    expect(cardNames(wrapper)).toEqual([
      'English Premier League',
      'English League Championship',
      'Scottish Premier League',
    ])
    expect(wrapper.get('li').text()).toContain('Soccer')
    expect(countLabel(wrapper)).toBe('3 leagues')
  })
})

describe('search', () => {
  it('narrows the list as you type, without new requests', async () => {
    serveLeagues(leagues)
    const wrapper = await mountApp()

    await wrapper.get('input').setValue('  SCOTTISH ')

    expect(cardNames(wrapper)).toEqual(['Scottish Premier League'])
    expect(countLabel(wrapper)).toBe('1 of 3 leagues')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('clears the search and keeps the focus in the search box', async () => {
    serveLeagues(leagues)
    const wrapper = await mountApp()
    const input = wrapper.get('input')
    await input.setValue('premier')

    await wrapper.get('button[aria-label="Clear search"]').trigger('click')

    expect(input.element.value).toBe('')
    expect(document.activeElement).toBe(input.element)
    expect(cardNames(wrapper)).toHaveLength(3)
    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(false)
  })
})

describe('sport filter', () => {
  it('is hidden when the feed has only one sport', async () => {
    serveLeagues(leagues)
    const wrapper = await mountApp()

    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('offers each sport when the feed has several, and filters by it', async () => {
    serveLeagues(leaguesMultiSport)
    const wrapper = await mountApp()
    const select = wrapper.get('select')

    expect(select.findAll('option').map((option) => option.text())).toEqual([
      'All sports',
      'Basketball',
      'Motorsport',
      'Soccer',
    ])

    await select.setValue('Basketball')

    expect(cardNames(wrapper)).toEqual(['NBA'])
    expect(countLabel(wrapper)).toBe('1 of 5 leagues')
  })
})

describe('season badge', () => {
  const PREMIER_LEAGUE = 'English Premier League'
  const CHAMPIONSHIP = 'English League Championship'
  const SEASONS = { '4328': seasonsLatestWithoutBadge, '4329': seasonsNoBadge }

  it('opens a league and shows the badge of its most recent season that has one', async () => {
    serveApi(leagues, SEASONS)
    const wrapper = await mountApp()

    await toggleCard(wrapper, PREMIER_LEAGUE)

    expect(cardButton(wrapper, PREMIER_LEAGUE).attributes('aria-expanded')).toBe('true')
    const img = wrapper.get('img')
    expect(img.attributes('alt')).toBe('English Premier League badge, season 1995-1996')
    expect(img.attributes('src')).toBe(`${seasonsLatestWithoutBadge.seasons[1]?.strBadge}/small`)
    expect(badgeRequests()).toBe(1)
  })

  it('shows a loading placeholder until the badge arrives', async () => {
    serveApi(leagues, SEASONS)
    const wrapper = await mountApp()
    let respond!: (response: Response) => void
    fetchMock.mockReturnValueOnce(new Promise((r) => (respond = r)))

    await toggleCard(wrapper, PREMIER_LEAGUE)

    expect(cardButton(wrapper, PREMIER_LEAGUE).attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Loading badge')
    expect(wrapper.find('img').exists()).toBe(false)

    respond(new Response(JSON.stringify(seasonsLatestWithoutBadge)))
    await flushPromises()

    expect(wrapper.text()).not.toContain('Loading badge')
    expect(wrapper.find('img').exists()).toBe(true)
  })

  it('makes no new request when a league is closed and opened again', async () => {
    serveApi(leagues, SEASONS)
    const wrapper = await mountApp()

    await toggleCard(wrapper, PREMIER_LEAGUE)
    await toggleCard(wrapper, PREMIER_LEAGUE)
    expect(cardButton(wrapper, PREMIER_LEAGUE).attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('img').exists()).toBe(false)
    await toggleCard(wrapper, PREMIER_LEAGUE)

    expect(wrapper.find('img').exists()).toBe(true)
    expect(badgeRequests()).toBe(1)
  })

  it('keeps only one league open at a time', async () => {
    serveApi(leagues, SEASONS)
    const wrapper = await mountApp()

    await toggleCard(wrapper, PREMIER_LEAGUE)
    await toggleCard(wrapper, CHAMPIONSHIP)

    expect(cardButton(wrapper, PREMIER_LEAGUE).attributes('aria-expanded')).toBe('false')
    expect(cardButton(wrapper, CHAMPIONSHIP).attributes('aria-expanded')).toBe('true')
  })

  it('says so when a league has no badge', async () => {
    serveApi(leagues, SEASONS)
    const wrapper = await mountApp()

    await toggleCard(wrapper, CHAMPIONSHIP)

    expect(wrapper.text()).toContain('No badge for this league')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows an error with Retry when the request fails, and Retry asks again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    serveApi(leagues, { '4328': new TypeError('Failed to fetch') })
    const wrapper = await mountApp()

    await toggleCard(wrapper, PREMIER_LEAGUE)
    expect(wrapper.get('[role="alert"]').text()).toContain("Couldn't load the badge")

    serveApi(leagues, SEASONS)
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('img').exists()).toBe(true)
    expect(badgeRequests()).toBe(2)
  })

  it('reloads only the image when the image itself fails to load', async () => {
    serveApi(leagues, SEASONS)
    const wrapper = await mountApp()
    await toggleCard(wrapper, PREMIER_LEAGUE)

    await wrapper.get('img').trigger('error')
    expect(wrapper.get('[role="alert"]').text()).toContain("Couldn't load the badge")

    await wrapper.get('[role="alert"] button').trigger('click')

    expect(wrapper.find('img').exists()).toBe(true)
    expect(badgeRequests()).toBe(1)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import App from '../App.vue'
import leagues from './fixtures/leagues.json'
import leaguesMultiSport from './fixtures/leagues-multi-sport.json'

// Integration tests: real components and stores, only the network is faked.
const fetchMock = vi.fn<typeof fetch>()

function serveLeagues(body: unknown) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    if (url.endsWith('/all_leagues.php')) return new Response(JSON.stringify(body))
    throw new Error(`Unexpected request: ${url}`)
  })
}

async function mountApp() {
  const wrapper = mount(App, {
    global: { plugins: [createPinia()] },
    attachTo: document.body, // so focus can be checked
  })
  await flushPromises()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountApp>>
const cardNames = (wrapper: Wrapper) => wrapper.findAll('li h2').map((h2) => h2.text())
const countLabel = (wrapper: Wrapper) => wrapper.get('[aria-live]').text()

enableAutoUnmount(afterEach)

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
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

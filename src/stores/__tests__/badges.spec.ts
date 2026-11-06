import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { fetchSeasonBadge } from '@/api/sportsdb'
import type { SeasonBadge } from '@/types/league'
import { BADGES_STORAGE_KEY, useBadgesStore } from '../badges'

vi.mock('@/api/sportsdb')

const PREMIER_LEAGUE_BADGE: SeasonBadge = {
  url: 'https://r2.thesportsdb.com/images/media/league/badgearchive/02egea1661959225.png',
  season: '1992-1993',
}

/** A fresh Pinia is what a page reload gives the app; sessionStorage survives it. */
function reloadPage() {
  setActivePinia(createPinia())
}

beforeEach(() => {
  sessionStorage.clear()
  reloadPage()
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

describe('loadBadge()', () => {
  it('stores the badge and makes no new request on the next call', async () => {
    vi.mocked(fetchSeasonBadge).mockResolvedValueOnce(PREMIER_LEAGUE_BADGE)
    const store = useBadgesStore()

    await store.loadBadge('4328')
    await store.loadBadge('4328')

    expect(fetchSeasonBadge).toHaveBeenCalledTimes(1)
    expect(fetchSeasonBadge).toHaveBeenCalledWith('4328')
    expect(store.badgesByLeagueId['4328']).toEqual({ status: 'ready', ...PREMIER_LEAGUE_BADGE })
  })

  it('shares one request between concurrent calls for the same league', async () => {
    let resolve!: (badge: SeasonBadge | null) => void
    vi.mocked(fetchSeasonBadge).mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const store = useBadgesStore()

    const first = store.loadBadge('4328')
    const second = store.loadBadge('4328')
    expect(store.badgesByLeagueId['4328']).toEqual({ status: 'loading' })
    resolve(PREMIER_LEAGUE_BADGE)
    await Promise.all([first, second])

    expect(fetchSeasonBadge).toHaveBeenCalledTimes(1)
    expect(store.badgesByLeagueId['4328']).toEqual({ status: 'ready', ...PREMIER_LEAGUE_BADGE })
  })

  it('remembers that a league has no badge, without asking again', async () => {
    vi.mocked(fetchSeasonBadge).mockResolvedValueOnce(null)
    const store = useBadgesStore()

    await store.loadBadge('4329')
    await store.loadBadge('4329')

    expect(fetchSeasonBadge).toHaveBeenCalledTimes(1)
    expect(store.badgesByLeagueId['4329']).toEqual({ status: 'empty' })
  })

  it('resolves on failure with an error state, and logs the cause', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cause = new Error('offline')
    vi.mocked(fetchSeasonBadge).mockRejectedValueOnce(cause)
    const store = useBadgesStore()

    await expect(store.loadBadge('4328')).resolves.toBeUndefined()

    expect(store.badgesByLeagueId['4328']).toEqual({ status: 'error' })
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('4328'), cause)
  })

  it('does not cache a failure: the next call makes a new request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchSeasonBadge)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(PREMIER_LEAGUE_BADGE)
    const store = useBadgesStore()

    await store.loadBadge('4328')
    await store.loadBadge('4328')

    expect(fetchSeasonBadge).toHaveBeenCalledTimes(2)
    expect(store.badgesByLeagueId['4328']).toEqual({ status: 'ready', ...PREMIER_LEAGUE_BADGE })
  })

  it('keeps a separate request and state for each league', async () => {
    vi.mocked(fetchSeasonBadge).mockImplementation(async (leagueId) =>
      leagueId === '4328' ? PREMIER_LEAGUE_BADGE : null,
    )
    const store = useBadgesStore()

    await Promise.all([store.loadBadge('4328'), store.loadBadge('4329')])

    expect(fetchSeasonBadge).toHaveBeenCalledTimes(2)
    expect(store.badgesByLeagueId).toEqual({
      '4328': { status: 'ready', ...PREMIER_LEAGUE_BADGE },
      '4329': { status: 'empty' },
    })
  })
})

describe('saved for the browser session', () => {
  it('keeps badges and "no badge" results across a reload, so they are not fetched again', async () => {
    vi.mocked(fetchSeasonBadge).mockImplementation(async (leagueId) =>
      leagueId === '4328' ? PREMIER_LEAGUE_BADGE : null,
    )
    await Promise.all([useBadgesStore().loadBadge('4328'), useBadgesStore().loadBadge('4329')])

    reloadPage()
    const store = useBadgesStore()
    await store.loadBadge('4328')
    await store.loadBadge('4329')

    expect(fetchSeasonBadge).toHaveBeenCalledTimes(2) // both before the reload, none after
    expect(store.badgesByLeagueId).toEqual({
      '4328': { status: 'ready', ...PREMIER_LEAGUE_BADGE },
      '4329': { status: 'empty' },
    })
  })

  it('saves only finished results, never failures or requests still in progress', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchSeasonBadge).mockImplementation(async (leagueId) => {
      if (leagueId === '4328') throw new Error('offline')
      if (leagueId === '4330') return new Promise<null>(() => {}) // never settles
      return null
    })
    const store = useBadgesStore()

    await store.loadBadge('4328') // fails
    void store.loadBadge('4330') // still loading
    await store.loadBadge('4329') // finishes, which saves

    expect(JSON.parse(sessionStorage.getItem(BADGES_STORAGE_KEY) ?? 'null')).toEqual({
      '4329': { status: 'empty' },
    })
  })

  it('still works in memory when storage is blocked or full', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    vi.mocked(fetchSeasonBadge).mockResolvedValueOnce(PREMIER_LEAGUE_BADGE)
    const store = useBadgesStore()

    await store.loadBadge('4328')

    expect(store.badgesByLeagueId['4328']).toEqual({ status: 'ready', ...PREMIER_LEAGUE_BADGE })
  })

  it('starts empty when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })

    expect(useBadgesStore().badgesByLeagueId).toEqual({})
  })

  it('ignores saved data it cannot use', () => {
    sessionStorage.setItem(
      BADGES_STORAGE_KEY,
      JSON.stringify({ '1': { status: 'ready' }, '2': { status: 'empty' }, '3': 'oops' }),
    )
    expect(useBadgesStore().badgesByLeagueId).toEqual({ '2': { status: 'empty' } })

    reloadPage()
    sessionStorage.setItem(BADGES_STORAGE_KEY, 'not json')
    expect(useBadgesStore().badgesByLeagueId).toEqual({})
  })
})

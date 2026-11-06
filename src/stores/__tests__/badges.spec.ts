import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { fetchSeasonBadge } from '@/api/sportsdb'
import type { SeasonBadge } from '@/types/league'
import { useBadgesStore } from '../badges'

vi.mock('@/api/sportsdb')

const PREMIER_LEAGUE_BADGE: SeasonBadge = {
  url: 'https://r2.thesportsdb.com/images/media/league/badgearchive/02egea1661959225.png',
  season: '1992-1993',
}

beforeEach(() => {
  setActivePinia(createPinia())
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

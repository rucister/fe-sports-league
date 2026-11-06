import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { fetchLeagues } from '@/api/sportsdb'
import type { League } from '@/types/league'
import { ALL_SPORTS, useLeaguesStore } from '../leagues'

vi.mock('@/api/sportsdb')

const SOCCER: League[] = [
  { id: '1', name: 'English Premier League', sport: 'Soccer' },
  { id: '2', name: 'German Bundesliga', sport: 'Soccer' },
  { id: '3', name: 'Spanish La Liga', sport: 'Soccer' },
]

const MULTI_SPORT: League[] = [
  ...SOCCER,
  { id: '4', name: 'NBA', sport: 'Basketball' },
  { id: '5', name: 'EuroLeague', sport: 'Basketball' },
  { id: '6', name: 'Formula 1', sport: 'Motorsport' },
]

const names = (leagues: League[]) => leagues.map((league) => league.name)

async function storeWith(leagues: League[]) {
  vi.mocked(fetchLeagues).mockResolvedValueOnce(leagues)
  const store = useLeaguesStore()
  await store.loadLeagues()
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

describe('filtering', () => {
  it('searches names ignoring case and surrounding spaces', async () => {
    const store = await storeWith(SOCCER)

    store.searchQuery = '  BUNDES '

    expect(names(store.filteredLeagues)).toEqual(['German Bundesliga'])
  })

  it('returns an empty list when the search matches nothing', async () => {
    const store = await storeWith(SOCCER)

    store.searchQuery = 'hockey'

    expect(store.filteredLeagues).toEqual([])
  })

  it('combines the search and the sport filter', async () => {
    const store = await storeWith(MULTI_SPORT)

    store.searchQuery = 'league'
    expect(names(store.filteredLeagues)).toEqual(['English Premier League', 'EuroLeague'])

    store.selectedSport = 'Basketball'
    expect(names(store.filteredLeagues)).toEqual(['EuroLeague'])
  })

  it('lists each sport once, sorted', async () => {
    const store = await storeWith(MULTI_SPORT)

    expect(store.availableSports).toEqual(['Basketball', 'Motorsport', 'Soccer'])
    expect(store.hasMultipleSports).toBe(true)
  })

  it('ignores the sport filter when the feed has only one sport', async () => {
    const store = await storeWith(SOCCER)

    store.selectedSport = 'Basketball'

    expect(store.hasMultipleSports).toBe(false)
    expect(store.filteredLeagues).toHaveLength(3)
  })

  it('clearFilters() resets the search and the sport', async () => {
    const store = await storeWith(MULTI_SPORT)
    store.searchQuery = 'nba'
    store.selectedSport = 'Basketball'

    store.clearFilters()

    expect(store.searchQuery).toBe('')
    expect(store.selectedSport).toBe(ALL_SPORTS)
    expect(store.filteredLeagues).toHaveLength(MULTI_SPORT.length)
  })
})

describe('loadLeagues()', () => {
  it('shares one request between concurrent calls and makes none once loaded', async () => {
    let resolve!: (leagues: League[]) => void
    vi.mocked(fetchLeagues).mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const store = useLeaguesStore()

    const first = store.loadLeagues()
    const second = store.loadLeagues()
    expect(store.status).toBe('loading')
    resolve(SOCCER)
    await Promise.all([first, second])
    await store.loadLeagues()

    expect(fetchLeagues).toHaveBeenCalledTimes(1)
    expect(store.status).toBe('ready')
    expect(store.allLeagues).toEqual(SOCCER)
  })

  it('resolves on failure with the error status and an empty list, and logs the cause', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cause = new Error('offline')
    vi.mocked(fetchLeagues).mockRejectedValueOnce(cause)
    const store = useLeaguesStore()

    await expect(store.loadLeagues()).resolves.toBeUndefined()

    expect(store.status).toBe('error')
    expect(store.allLeagues).toEqual([])
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), cause)
  })

  it('tries again on the next call after a failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchLeagues).mockRejectedValueOnce(new Error('offline'))
    const store = useLeaguesStore()
    await store.loadLeagues()

    vi.mocked(fetchLeagues).mockResolvedValueOnce(SOCCER)
    await store.loadLeagues()

    expect(fetchLeagues).toHaveBeenCalledTimes(2)
    expect(store.status).toBe('ready')
    expect(store.allLeagues).toEqual(SOCCER)
  })
})

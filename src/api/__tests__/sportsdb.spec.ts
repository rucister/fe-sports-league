import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import leagues from '@/__tests__/fixtures/leagues.json'
// The real league 4328 response, trimmed to three seasons, with the newest badge set to null.
import seasonsLatestWithoutBadge from '@/__tests__/fixtures/seasons-latest-without-badge.json'
import seasonsNoBadge from '@/__tests__/fixtures/seasons-no-badge.json'
import seasonsNull from '@/__tests__/fixtures/seasons-null.json'
import { fetchLeagues, fetchSeasonBadge } from '../sportsdb'

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123'
const fetchMock = vi.fn<typeof fetch>()

function respondWith(body: string, init?: ResponseInit) {
  fetchMock.mockResolvedValueOnce(new Response(body, init))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchLeagues', () => {
  it('requests the leagues endpoint with a 10-second timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    respondWith(JSON.stringify(leagues))

    await fetchLeagues()

    expect(timeout).toHaveBeenCalledWith(10_000)
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/all_leagues.php`, {
      signal: timeout.mock.results[0]?.value,
    })
  })

  it('maps the raw fields to { id, name, sport }', async () => {
    respondWith(JSON.stringify(leagues))

    await expect(fetchLeagues()).resolves.toEqual([
      { id: '4328', name: 'English Premier League', sport: 'Soccer' },
      { id: '4329', name: 'English League Championship', sport: 'Soccer' },
      { id: '4330', name: 'Scottish Premier League', sport: 'Soccer' },
    ])
  })

  it('returns an empty list when the API sends leagues: null', async () => {
    respondWith('{"leagues":null}')

    await expect(fetchLeagues()).resolves.toEqual([])
  })
})

describe('fetchSeasonBadge', () => {
  it('returns the most recent season that has a badge', async () => {
    respondWith(JSON.stringify(seasonsLatestWithoutBadge))

    await expect(fetchSeasonBadge('4328')).resolves.toEqual({
      season: '1995-1996',
      url: 'https://r2.thesportsdb.com/images/media/league/badgearchive/8h3l7z1661959246.png',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/search_all_seasons.php?badge=1&id=4328`,
      expect.anything(),
    )
  })

  it('finds the most recent season even when the response is not in order', async () => {
    // Neither the first nor the last season with a badge is the most recent one here.
    const badge = (file: string) =>
      `https://r2.thesportsdb.com/images/media/league/badgearchive/${file}`
    respondWith(
      JSON.stringify({
        seasons: [
          { strSeason: '1993-1994', strBadge: badge('d9hqy61661959233.png') },
          { strSeason: '1995-1996', strBadge: badge('8h3l7z1661959246.png') },
          { strSeason: '1994-1995', strBadge: badge('doefe31661959239.png') },
          { strSeason: '1996-1997', strBadge: null },
        ],
      }),
    )

    await expect(fetchSeasonBadge('4328')).resolves.toEqual({
      season: '1995-1996',
      url: badge('8h3l7z1661959246.png'),
    })
  })

  it.each([
    ['seasons is null', seasonsNull],
    ['no season has a badge', seasonsNoBadge],
    ['the only badge is an empty string', { seasons: [{ strSeason: '2020-2021', strBadge: '' }] }],
  ])('returns null when %s', async (_, body) => {
    respondWith(JSON.stringify(body))

    await expect(fetchSeasonBadge('4329')).resolves.toBeNull()
  })
})

describe('errors', () => {
  it('rejects when the server answers with an error status', async () => {
    respondWith('', { status: 500 })

    await expect(fetchLeagues()).rejects.toThrow('TheSportsDB request failed: HTTP 500')
  })

  it('rejects when the request itself fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(fetchLeagues()).rejects.toThrow('Failed to fetch')
  })

  it('rejects when the body is not JSON', async () => {
    respondWith('<!doctype html><title>Error</title>')

    await expect(fetchSeasonBadge('4328')).rejects.toMatchObject({ name: 'SyntaxError' })
  })
})

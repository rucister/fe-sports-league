import type { League, SeasonBadge } from '@/types/league'

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123'
const TIMEOUT_MS = 10_000

// Raw response shapes. API field names never leave this file.
interface LeaguesResponse {
  leagues: { idLeague: string; strLeague: string; strSport: string }[] | null
}

interface SeasonsResponse {
  seasons: { strSeason: string; strBadge: string | null }[] | null
}

/**
 * GETs a TheSportsDB path and parses the JSON. Rejects on a network failure, a timeout, an error
 * status or invalid JSON. The API's rate-limit response (429) has no CORS headers, so in the
 * browser it arrives as a network failure, not as a status code.
 */
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`TheSportsDB request failed: HTTP ${response.status}`)
  return (await response.json()) as T
}

export async function fetchLeagues(): Promise<League[]> {
  const { leagues } = await fetchJson<LeaguesResponse>('/all_leagues.php')
  return (leagues ?? []).map((raw) => ({
    id: raw.idLeague,
    name: raw.strLeague,
    sport: raw.strSport,
  }))
}

/** The badge of the league's most recent season that has one, or null if no season has a badge. */
export async function fetchSeasonBadge(leagueId: string): Promise<SeasonBadge | null> {
  const query = new URLSearchParams({ badge: '1', id: leagueId })
  const { seasons } = await fetchJson<SeasonsResponse>(`/search_all_seasons.php?${query}`)
  // The API docs don't promise any order for seasons, so sort newest first instead of trusting
  // the response. Season names start with the year, so text order is date order.
  const latest = [...(seasons ?? [])]
    .sort((a, b) => b.strSeason.localeCompare(a.strSeason))
    .find((season) => season.strBadge)
  return latest?.strBadge ? { url: latest.strBadge, season: latest.strSeason } : null
}

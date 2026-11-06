/** A league as the app uses it. The API's raw field names stay in `api/sportsdb.ts`. */
export interface League {
  id: string
  name: string
  sport: string
}

/** The badge image of one season of a league. */
export interface SeasonBadge {
  url: string
  season: string
}

/** Where a one-off request stands. `idle` means it hasn't been made yet. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

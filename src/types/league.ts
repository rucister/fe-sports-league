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

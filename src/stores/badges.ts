import { ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'

import { fetchSeasonBadge } from '@/api/sportsdb'
import type { BadgeState } from '@/types/league'

// The badge endpoint sends no caching headers, so without this every reload would fetch the
// badges again, against a free API that rate-limits after about 10 requests a minute.
export const BADGES_STORAGE_KEY = 'fe-sports-league:badges'

type FinishedBadgeState = Extract<BadgeState, { status: 'ready' | 'empty' }>

/** A result worth keeping: a badge, or the fact that the league has none. */
function isFinished(state: unknown): state is FinishedBadgeState {
  if (typeof state !== 'object' || state === null) return false
  const { status, url, season } = state as Record<string, unknown>
  return (
    status === 'empty' ||
    (status === 'ready' && typeof url === 'string' && typeof season === 'string')
  )
}

/** Results saved earlier in this browser tab. Anything unreadable or unexpected is ignored. */
function readSavedBadges(): Record<string, BadgeState> {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(BADGES_STORAGE_KEY) ?? '{}')
    if (typeof saved !== 'object' || saved === null) return {}
    return Object.fromEntries(Object.entries(saved).filter(([, state]) => isFinished(state)))
  } catch {
    return {} // storage blocked or corrupted: start empty
  }
}

/** Saves the finished results, so a reload in this tab doesn't fetch them again. */
function saveBadges(badges: Record<string, BadgeState>) {
  const finished = Object.entries(badges).filter(([, state]) => isFinished(state))
  try {
    sessionStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(Object.fromEntries(finished)))
  } catch {
    // Storage blocked or full: the in-memory cache still works for this page.
  }
}

export const useBadgesStore = defineStore('badges', () => {
  // One entry per league whose badge was requested. Lives in the store, not in the card, so the
  // cache survives cards being filtered out and back in. Starts with this tab's saved results.
  const badgesByLeagueId = ref<Record<string, BadgeState>>(readSavedBadges())

  // Requests in flight, by league id, shared by concurrent callers. Not state, so not returned.
  const pending = new Map<string, Promise<void>>()

  async function request(leagueId: string) {
    badgesByLeagueId.value[leagueId] = { status: 'loading' }
    try {
      const badge = await fetchSeasonBadge(leagueId)
      badgesByLeagueId.value[leagueId] = badge ? { status: 'ready', ...badge } : { status: 'empty' }
      saveBadges(badgesByLeagueId.value)
    } catch (error) {
      console.error(`[badges] Failed to load the badge of league ${leagueId}:`, error)
      badgesByLeagueId.value[leagueId] = { status: 'error' } // not cached: the next call retries
    }
  }

  /**
   * Loads a league's badge once. A badge, or the fact that there is none, is cached; concurrent
   * calls for the same league share one request. Never rejects: a failure shows up as an `error`
   * state, and the next call tries again.
   */
  function loadBadge(leagueId: string): Promise<void> {
    const state = badgesByLeagueId.value[leagueId]
    if (state?.status === 'ready' || state?.status === 'empty') return Promise.resolve()

    let inFlight = pending.get(leagueId)
    if (!inFlight) {
      inFlight = request(leagueId).finally(() => pending.delete(leagueId))
      pending.set(leagueId, inFlight)
    }
    return inFlight
  }

  return { badgesByLeagueId, loadBadge }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBadgesStore, import.meta.hot))
}

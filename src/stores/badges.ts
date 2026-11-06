import { ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'

import { fetchSeasonBadge } from '@/api/sportsdb'
import type { BadgeState } from '@/types/league'

export const useBadgesStore = defineStore('badges', () => {
  // One entry per league whose badge was requested. Lives in the store, not in the card, so the
  // cache survives cards being filtered out and back in.
  const badgesByLeagueId = ref<Record<string, BadgeState>>({})

  // Requests in flight, by league id, shared by concurrent callers. Not state, so not returned.
  const pending = new Map<string, Promise<void>>()

  async function request(leagueId: string) {
    badgesByLeagueId.value[leagueId] = { status: 'loading' }
    try {
      const badge = await fetchSeasonBadge(leagueId)
      badgesByLeagueId.value[leagueId] = badge ? { status: 'ready', ...badge } : { status: 'empty' }
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

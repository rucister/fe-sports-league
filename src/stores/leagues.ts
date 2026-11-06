import { computed, ref, shallowRef } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'

import { fetchLeagues } from '@/api/sportsdb'
import type { League, LoadStatus } from '@/types/league'

/** The `selectedSport` value meaning "no sport filter". Also the value of the "All sports" option. */
export const ALL_SPORTS = ''

export const useLeaguesStore = defineStore('leagues', () => {
  // Replaced as a whole on each load, never edited in place, so a shallow ref is enough.
  const allLeagues = shallowRef<League[]>([])
  const status = ref<LoadStatus>('idle')
  const searchQuery = ref('')
  const selectedSport = ref(ALL_SPORTS)

  // The request in flight, shared by concurrent callers. Not state, so it isn't returned.
  let pending: Promise<void> | null = null

  const availableSports = computed(() =>
    [...new Set(allLeagues.value.map((league) => league.sport))].sort((a, b) => a.localeCompare(b)),
  )
  const hasMultipleSports = computed(() => availableSports.value.length > 1)

  const filteredLeagues = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    // With a single sport the dropdown is hidden, so a stale sport choice must not filter.
    const activeSport = hasMultipleSports.value ? selectedSport.value : ALL_SPORTS
    return allLeagues.value.filter(
      (league) =>
        (activeSport === ALL_SPORTS || league.sport === activeSport) &&
        league.name.toLowerCase().includes(query),
    )
  })

  async function request() {
    status.value = 'loading'
    try {
      allLeagues.value = await fetchLeagues()
      status.value = 'ready'
    } catch (error) {
      // The UI shows a generic message; the real cause goes to the console for debugging.
      console.error('[leagues] Failed to load leagues:', error)
      status.value = 'error' // not cached: the next loadLeagues() tries again
    }
  }

  /**
   * Loads the leagues once. Concurrent calls share one request; calls after success make none.
   * Never rejects: a failure shows up as `status === 'error'`.
   */
  function loadLeagues(): Promise<void> {
    if (status.value === 'ready') return Promise.resolve()
    pending ??= request().finally(() => {
      pending = null
    })
    return pending
  }

  function clearFilters() {
    searchQuery.value = ''
    selectedSport.value = ALL_SPORTS
  }

  return {
    allLeagues,
    status,
    searchQuery,
    selectedSport,
    availableSports,
    hasMultipleSports,
    filteredLeagues,
    loadLeagues,
    clearFilters,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useLeaguesStore, import.meta.hot))
}

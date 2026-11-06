<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'

import LeagueFilters from '@/components/LeagueFilters.vue'
import LeagueList from '@/components/LeagueList.vue'
import { useBadgesStore } from '@/stores/badges'
import { useLeaguesStore } from '@/stores/leagues'

const leaguesStore = useLeaguesStore()
const {
  allLeagues,
  filteredLeagues,
  status,
  searchQuery,
  selectedSport,
  availableSports,
  hasMultipleSports,
} = storeToRefs(leaguesStore)

// Called during setup rather than in onMounted, so the request starts before the first render.
leaguesStore.loadLeagues()

const countLabel = computed(() => {
  const total = allLeagues.value.length
  const shown = filteredLeagues.value.length
  const noun = total === 1 ? 'league' : 'leagues'
  return shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`
})

const badgesStore = useBadgesStore()
const { badgesByLeagueId } = storeToRefs(badgesStore)

// One league open at a time, like an accordion.
const openLeagueId = shallowRef<string | null>(null)

function toggleLeague(leagueId: string) {
  if (openLeagueId.value === leagueId) {
    openLeagueId.value = null
    return
  }
  openLeagueId.value = leagueId
  badgesStore.loadBadge(leagueId) // no request if this league's badge is already known
}
</script>

<template>
  <div class="flex flex-col gap-5 sm:gap-7">
    <div class="flex flex-col gap-3">
      <LeagueFilters
        v-model:search-query="searchQuery"
        v-model:selected-sport="selectedSport"
        :sports="availableSports"
        :show-sport="hasMultipleSports"
      />
      <p v-if="status === 'ready'" aria-live="polite" class="text-sm font-medium text-ink-2">
        {{ countLabel }}
      </p>
    </div>
    <LeagueList
      :leagues="filteredLeagues"
      :open-league-id="openLeagueId"
      :badges-by-league-id="badgesByLeagueId"
      @toggle="toggleLeague"
      @retry="badgesStore.loadBadge"
    />
  </div>
</template>

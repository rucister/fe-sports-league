<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'

import LeagueFilters from '@/components/LeagueFilters.vue'
import LeagueList from '@/components/LeagueList.vue'
import LeagueListSkeleton from '@/components/LeagueListSkeleton.vue'
import StateMessage from '@/components/StateMessage.vue'
import { useBadgesStore } from '@/stores/badges'
import { ALL_SPORTS, useLeaguesStore } from '@/stores/leagues'

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

// The dropdown only offers sports that have leagues, so when leagues exist but none are shown,
// it's the search text that matched nothing: within the chosen sport, if one is chosen.
const noMatchTitle = computed(() => {
  const query = `“${searchQuery.value.trim()}”`
  return selectedSport.value === ALL_SPORTS
    ? `No leagues match ${query}`
    : `No ${selectedSport.value} leagues match ${query}`
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
    <StateMessage
      v-if="status === 'error'"
      variant="error"
      title="Couldn't load leagues"
      description="Check your connection, or wait a minute: the free API limits how often it can be called."
      action-label="Retry"
      @action="leaguesStore.loadLeagues()"
    />
    <LeagueListSkeleton v-else-if="status !== 'ready'" />
    <StateMessage
      v-else-if="allLeagues.length === 0"
      variant="empty"
      title="No leagues available"
      description="TheSportsDB returned an empty list. Try again later."
    />
    <StateMessage
      v-else-if="filteredLeagues.length === 0"
      variant="empty"
      :title="noMatchTitle"
      description="Try another name or clear the filters."
      action-label="Clear filters"
      @action="leaguesStore.clearFilters()"
    />
    <LeagueList
      v-else
      :leagues="filteredLeagues"
      :open-league-id="openLeagueId"
      :badges-by-league-id="badgesByLeagueId"
      @toggle="toggleLeague"
      @retry="badgesStore.loadBadge"
    />
  </div>
</template>

<script setup lang="ts">
import LeagueCard from '@/components/LeagueCard.vue'
import type { BadgeState, League } from '@/types/league'

defineProps<{
  leagues: League[]
  openLeagueId: string | null
  badgesByLeagueId: Record<string, BadgeState>
}>()

const emit = defineEmits<{ toggle: [leagueId: string]; retry: [leagueId: string] }>()
</script>

<template>
  <ul
    class="grid grid-cols-1 items-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] sm:gap-4"
  >
    <li v-for="league in leagues" :key="league.id">
      <LeagueCard
        :league="league"
        :open="league.id === openLeagueId"
        :badge="badgesByLeagueId[league.id]"
        @toggle="emit('toggle', league.id)"
        @retry="emit('retry', league.id)"
      />
    </li>
  </ul>
</template>

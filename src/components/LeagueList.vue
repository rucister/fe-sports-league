<script setup lang="ts">
import LeagueCard from '@/components/LeagueCard.vue'
import type { League } from '@/types/league'

defineProps<{ leagues: League[] }>()
</script>

<template>
  <ul
    class="grid grid-cols-1 items-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] sm:gap-4"
  >
    <li v-for="league in leagues" :key="league.id">
      <LeagueCard :league="league" />
    </li>
  </ul>
</template>

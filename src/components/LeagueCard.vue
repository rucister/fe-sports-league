<script setup lang="ts">
import type { League } from '@/types/league'

defineProps<{ league: League }>()
</script>

<template>
  <div class="rounded-card border border-line bg-white">
    <div
      class="flex min-h-[76px] flex-col items-start justify-center gap-1.5 p-4 sm:min-h-[88px] sm:gap-2 sm:p-5"
    >
      <h2 class="text-base leading-[1.3] font-semibold">{{ league.name }}</h2>
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-subtle px-[9px] py-[3px] text-xs font-medium text-ink-2 sm:px-2.5 sm:py-1 sm:text-[13px]"
      >
        <span aria-hidden="true" class="size-1.5 rounded-full bg-brand"></span>
        {{ league.sport }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

import LeagueBadge from '@/components/LeagueBadge.vue'
import type { BadgeState, League } from '@/types/league'

defineProps<{
  league: League
  open: boolean
  badge?: BadgeState
}>()

const emit = defineEmits<{ toggle: []; retry: [] }>()

const panelId = useId()
</script>

<template>
  <div
    class="rounded-card border bg-white motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200"
    :class="open ? 'border-brand shadow-card' : 'border-line'"
  >
    <!-- Accordion pattern: a heading containing the button that shows and hides the panel. -->
    <h2>
      <button
        type="button"
        :aria-expanded="open"
        :aria-controls="open ? panelId : undefined"
        class="group flex min-h-[76px] w-full cursor-pointer items-center gap-3 rounded-card p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-[88px] sm:gap-4 sm:p-5"
        @click="emit('toggle')"
      >
        <span class="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:gap-2">
          <span data-testid="league-name" class="text-base leading-[1.3] font-semibold">
            {{ league.name }}
          </span>
          <span
            class="inline-flex items-center gap-1.5 rounded-full bg-subtle px-[9px] py-[3px] text-xs font-medium text-ink-2 sm:px-2.5 sm:py-1 sm:text-[13px]"
          >
            <span aria-hidden="true" class="size-1.5 rounded-full bg-brand"></span>
            {{ league.sport }}
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5 shrink-0 text-muted group-hover:text-ink motion-safe:transition-transform motion-safe:duration-200"
          :class="{ 'rotate-180': open }"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </h2>

    <!-- aria-live: screen readers announce the badge, or "No badge", when it arrives. -->
    <div v-if="open" :id="panelId" aria-live="polite" class="border-t border-line p-4 sm:p-5">
      <LeagueBadge :badge="badge" :league-name="league.name" @retry="emit('retry')" />
    </div>
  </div>
</template>

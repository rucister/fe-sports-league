<script setup lang="ts">
import { shallowRef } from 'vue'

import type { BadgeState } from '@/types/league'

defineProps<{
  /** Undefined until the badge is first requested, and shown as loading. */
  badge?: BadgeState
  leagueName: string
}>()

const emit = defineEmits<{ retry: [] }>()

// The image itself can fail to load even when the API answered. Retrying then only reloads the
// image: the error message replaces the <img>, so clearing the flag mounts a fresh one, which the
// browser requests again. No new API call.
const imageFailed = shallowRef(false)

function retry() {
  if (imageFailed.value) {
    imageFailed.value = false
  } else {
    emit('retry')
  }
}
</script>

<template>
  <div v-if="!badge || badge.status === 'loading'" class="flex items-center gap-4 sm:gap-5">
    <div
      class="skeleton size-[72px] shrink-0 rounded-card motion-safe:animate-shimmer sm:size-[88px]"
    ></div>
    <div class="flex flex-1 flex-col gap-2.5">
      <div class="skeleton h-3 w-1/2 rounded-md motion-safe:animate-shimmer"></div>
      <div class="skeleton h-4 w-[70%] rounded-md motion-safe:animate-shimmer"></div>
    </div>
    <span class="sr-only">Loading badge</span>
  </div>

  <div
    v-else-if="badge.status === 'error' || imageFailed"
    role="alert"
    class="flex items-center gap-3.5"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-6 shrink-0 text-brand"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </svg>
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-[15px] font-semibold">Couldn't load the badge</span>
      <span class="text-[13px] text-muted">Try again in a minute.</span>
    </div>
    <button
      type="button"
      class="h-11 shrink-0 cursor-pointer rounded-control border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      @click="retry"
    >
      Retry
    </button>
  </div>

  <div v-else-if="badge.status === 'empty'" class="flex items-center gap-4 sm:gap-5">
    <svg aria-hidden="true" viewBox="0 0 88 88" class="size-[72px] shrink-0 sm:size-[88px]">
      <rect
        x="1"
        y="1"
        width="86"
        height="86"
        rx="12"
        stroke-dasharray="4 4"
        class="fill-ground stroke-line-dashed"
      />
      <path
        d="M44 22 60 28v14c0 11-7 18-16 23-9-5-16-12-16-23V28z"
        fill="none"
        stroke-width="2"
        class="stroke-line-strong"
      />
    </svg>
    <div class="flex flex-col gap-1">
      <span class="text-[15px] font-semibold">No badge for this league</span>
      <span class="text-[13px] text-muted">No season has a badge image yet.</span>
    </div>
  </div>

  <div v-else class="flex items-center gap-4 sm:gap-5">
    <!-- The API's docs: "/small" serves a 250px version (about 17 KB instead of 42 KB), still
         sharp in this 88px slot on high-resolution screens. -->
    <img
      :src="`${badge.url}/small`"
      :alt="`${leagueName} badge, season ${badge.season}`"
      width="88"
      height="88"
      decoding="async"
      class="size-[72px] shrink-0 rounded-card bg-ground object-contain sm:size-[88px]"
      @error="imageFailed = true"
    />
    <div class="flex min-w-0 flex-col gap-[3px] sm:gap-1">
      <span class="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase sm:text-xs">
        Season badge
      </span>
      <span class="text-[17px] font-semibold sm:text-lg">{{ badge.season }}</span>
    </div>
  </div>
</template>

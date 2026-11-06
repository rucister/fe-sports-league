<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'

import { ALL_SPORTS } from '@/stores/leagues'

defineProps<{
  sports: string[]
  /** The brief asks for the sport dropdown only when the feed has more than one sport. */
  showSport: boolean
}>()

const searchQuery = defineModel<string>('searchQuery', { required: true })
const selectedSport = defineModel<string>('selectedSport', { required: true })

const searchId = useId()
const sportId = useId()
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')

function clearSearch() {
  searchQuery.value = ''
  // The clear button disappears once the search is empty, so keep the keyboard focus in the box.
  searchInput.value?.focus()
}
</script>

<template>
  <div
    role="search"
    class="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
  >
    <div class="relative min-w-0 sm:flex-[999_1_320px]">
      <label :for="searchId" class="sr-only">Search leagues</label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="pointer-events-none absolute top-4 left-4 size-5 text-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        :id="searchId"
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        autocomplete="off"
        placeholder="Search leagues"
        class="h-[52px] w-full rounded-control border border-line bg-white pr-[52px] pl-[46px] text-base text-ink placeholder:text-muted hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-[15px]"
      />
      <button
        v-if="searchQuery"
        type="button"
        aria-label="Clear search"
        class="absolute top-1 right-1 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        @click="clearSearch"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-[18px]"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="showSport" class="relative sm:min-w-[200px] sm:flex-[1_1_220px]">
      <label :for="sportId" class="sr-only">Filter by sport</label>
      <select
        :id="sportId"
        v-model="selectedSport"
        class="h-[52px] w-full cursor-pointer appearance-none rounded-control border border-line bg-white pr-11 pl-4 text-base text-ink hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-[15px]"
      >
        <option :value="ALL_SPORTS">All sports</option>
        <option v-for="sport in sports" :key="sport" :value="sport">{{ sport }}</option>
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="pointer-events-none absolute top-[17px] right-4 size-[18px] text-muted"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
const { count = 6 } = defineProps<{ count?: number }>()

// Varied name widths so the placeholders read as different leagues, not one repeated card.
const nameWidths = ['w-[62%]', 'w-[48%]', 'w-[56%]']
</script>

<template>
  <div>
    <ul
      aria-hidden="true"
      class="grid grid-cols-1 items-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] sm:gap-4"
    >
      <li
        v-for="n in count"
        :key="n"
        class="flex min-h-[76px] flex-col justify-center gap-2.5 rounded-card border border-line bg-white p-4 sm:min-h-[88px] sm:p-5"
      >
        <div
          class="skeleton h-3.5 rounded-md motion-safe:animate-shimmer"
          :class="nameWidths[(n - 1) % nameWidths.length]"
        ></div>
        <div class="skeleton h-5 w-[72px] rounded-full motion-safe:animate-shimmer"></div>
      </li>
    </ul>
    <p role="status" class="sr-only">Loading leagues</p>
  </div>
</template>

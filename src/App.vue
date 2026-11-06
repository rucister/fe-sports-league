<script setup lang="ts">
import LeagueBrowser from '@/components/LeagueBrowser.vue'
</script>

<template>
  <div aria-hidden="true" class="h-1 bg-brand"></div>
  <div
    class="mx-auto flex max-w-[1120px] flex-col gap-5 px-5 pt-7 pb-10 sm:gap-7 sm:px-6 sm:pt-12 sm:pb-16"
  >
    <header class="flex flex-col gap-1.5 sm:gap-2">
      <h1
        class="font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.01em] italic sm:text-[44px]"
      >
        Leagues<span class="text-brand">.</span>
      </h1>
      <p class="text-[15px] leading-normal text-muted sm:text-base">
        Search, filter by sport, and open a league to see its season badge.
      </p>
    </header>

    <main>
      <LeagueBrowser />
    </main>

    <footer class="text-[13px] text-muted">
      Data:
      <a
        href="https://www.thesportsdb.com"
        class="text-brand-ink underline underline-offset-2 hover:text-brand-ink-hover"
        >TheSportsDB</a
      >
      free API
    </footer>
  </div>
</template>

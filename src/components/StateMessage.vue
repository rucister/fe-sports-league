<script setup lang="ts">
defineProps<{
  /** `error`: something failed (announced to screen readers). `empty`: nothing to show. */
  variant: 'error' | 'empty'
  title: string
  description: string
  actionLabel?: string
}>()

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div
    :role="variant === 'error' ? 'alert' : undefined"
    class="flex flex-col items-center gap-2.5 rounded-card border bg-white px-6 text-center"
    :class="variant === 'error' ? 'border-line py-10' : 'border-dashed border-line-dashed py-12'"
  >
    <svg
      v-if="variant === 'error'"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-7 text-brand"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </svg>
    <svg
      v-else
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-7 text-muted"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>

    <p class="text-base font-semibold">{{ title }}</p>
    <p class="max-w-md text-sm text-muted">{{ description }}</p>

    <button
      v-if="actionLabel"
      type="button"
      class="mt-1 h-11 cursor-pointer rounded-control px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      :class="
        variant === 'error'
          ? 'bg-brand text-white hover:bg-brand-hover'
          : 'border border-line bg-white text-ink hover:bg-subtle'
      "
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

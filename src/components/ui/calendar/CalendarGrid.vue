<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CalendarGrid } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <CalendarGrid :class="cn('w-full border-collapse select-none space-y-1', props.class)">
    <slot />
  </CalendarGrid>
</template>

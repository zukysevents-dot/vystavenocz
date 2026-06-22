<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CalendarHeader } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <CalendarHeader
    :class="cn('relative flex w-full items-center justify-between pt-1', props.class)"
  >
    <slot />
  </CalendarHeader>
</template>

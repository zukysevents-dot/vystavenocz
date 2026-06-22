<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CalendarGridRow } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <CalendarGridRow :class="cn('flex', props.class)">
    <slot />
  </CalendarGridRow>
</template>

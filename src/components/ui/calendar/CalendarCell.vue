<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CalendarCell, type CalendarCellProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<CalendarCellProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <CalendarCell
    :date="props.date"
    :class="
      cn(
        'relative h-8 w-8 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:rounded-md [&:has([data-selected])]:bg-accent [&:has([data-selected][data-outside-view])]:bg-accent/50',
        props.class,
      )
    "
  >
    <slot />
  </CalendarCell>
</template>

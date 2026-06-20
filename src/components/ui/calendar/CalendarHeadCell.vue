<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CalendarHeadCell } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <CalendarHeadCell
    :class="cn('w-8 rounded-md text-[0.8rem] font-normal text-muted-foreground', props.class)"
  >
    <slot />
  </CalendarHeadCell>
</template>

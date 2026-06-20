<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CalendarHeading } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <CalendarHeading v-slot="{ headingValue }" :class="cn('text-sm font-medium', props.class)">
    <slot :heading-value="headingValue">
      {{ headingValue }}
    </slot>
  </CalendarHeading>
</template>

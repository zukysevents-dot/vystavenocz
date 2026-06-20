<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Separator } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical'
    decorative?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    orientation: 'horizontal',
    decorative: true,
  },
)
</script>

<template>
  <Separator
    :orientation="orientation"
    :decorative="decorative"
    :class="
      cn(
        'shrink-0 bg-border',
        orientation === 'vertical' ? 'h-full w-[1px]' : 'h-[1px] w-full',
        props.class,
      )
    "
  />
</template>

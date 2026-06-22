<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ProgressIndicator, ProgressRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    class?: HTMLAttributes['class']
  }>(),
  {
    modelValue: 0,
  },
)
</script>

<template>
  <ProgressRoot
    :model-value="modelValue"
    :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', props.class)"
  >
    <ProgressIndicator
      class="h-full w-full flex-1 bg-primary transition-all"
      :style="`transform: translateX(-${100 - (modelValue ?? 0)}%);`"
    />
  </ProgressRoot>
</template>

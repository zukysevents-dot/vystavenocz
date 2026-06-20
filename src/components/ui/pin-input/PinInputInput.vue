<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { PinInputInput } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  index: number
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <PinInputInput
    :index="index"
    :class="
      cn(
        'relative flex h-9 w-9 items-center justify-center rounded-md border border-input text-center text-sm shadow-sm transition-all focus:z-10 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed',
        props.class,
      )
    "
  />
</template>

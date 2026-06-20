<script setup lang="ts">
import { type HTMLAttributes, inject } from 'vue'
import { ToggleGroupItem } from 'reka-ui'
import { type ToggleVariants, toggleVariants } from '@/components/ui/toggle'
import { TOGGLE_GROUP_INJECTION_KEY } from './injectionKeys'
import { cn } from '@/lib/utils'

const props = defineProps<{
  value: string
  variant?: ToggleVariants['variant']
  size?: ToggleVariants['size']
  class?: HTMLAttributes['class']
}>()

const context = inject(TOGGLE_GROUP_INJECTION_KEY, { variant: 'default', size: 'default' })
</script>

<template>
  <ToggleGroupItem
    :value="value"
    :class="
      cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        props.class,
      )
    "
  >
    <slot />
  </ToggleGroupItem>
</template>

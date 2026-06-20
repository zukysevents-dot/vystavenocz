<script setup lang="ts">
import { type HTMLAttributes, provide } from 'vue'
import { ToggleGroupRoot } from 'reka-ui'
import type { ToggleVariants } from '@/components/ui/toggle'
import { TOGGLE_GROUP_INJECTION_KEY } from './injectionKeys'
import { cn } from '@/lib/utils'

const modelValue = defineModel<string | string[]>()

const props = withDefaults(
  defineProps<{
    type?: 'single' | 'multiple'
    variant?: ToggleVariants['variant']
    size?: ToggleVariants['size']
    class?: HTMLAttributes['class']
  }>(),
  {
    type: 'single',
    variant: 'default',
    size: 'default',
  },
)

provide(TOGGLE_GROUP_INJECTION_KEY, { variant: props.variant, size: props.size })
</script>

<template>
  <ToggleGroupRoot
    v-model="modelValue"
    :type="type"
    :class="cn('flex items-center justify-center gap-1', props.class)"
  >
    <slot />
  </ToggleGroupRoot>
</template>

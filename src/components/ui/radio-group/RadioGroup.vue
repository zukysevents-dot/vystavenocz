<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { RadioGroupRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

const modelValue = defineModel<string>()

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <RadioGroupRoot v-model="modelValue" :class="cn('grid gap-2', props.class)">
    <slot />
  </RadioGroupRoot>
</template>

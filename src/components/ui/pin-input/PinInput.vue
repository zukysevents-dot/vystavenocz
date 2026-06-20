<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { PinInputRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

const modelValue = defineModel<string[]>()

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <PinInputRoot
    v-model="modelValue"
    :class="cn('flex items-center gap-2 has-[:disabled]:opacity-50', props.class)"
  >
    <slot />
  </PinInputRoot>
</template>

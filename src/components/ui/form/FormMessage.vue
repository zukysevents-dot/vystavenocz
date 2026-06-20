<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useFormField } from './useFormField'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const { error, formMessageId } = useFormField()
</script>

<template>
  <p
    v-if="error"
    :id="formMessageId"
    :class="cn('text-[0.8rem] font-medium text-destructive', props.class)"
  >
    {{ error }}
  </p>
</template>

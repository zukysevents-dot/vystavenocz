<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Label } from '@/components/ui/label'
import { useFormField } from './useFormField'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const { error, formItemId } = useFormField()
</script>

<template>
  <Label :for="formItemId" :class="cn(error && 'text-destructive', props.class)">
    <slot />
  </Label>
</template>

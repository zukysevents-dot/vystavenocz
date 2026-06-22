<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <nav aria-label="breadcrumb" :class="$props.class">
    <slot />
  </nav>
</template>

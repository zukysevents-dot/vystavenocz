<script setup lang="ts">
import { DrawerRoot } from 'vaul-vue'

withDefaults(defineProps<{ shouldScaleBackground?: boolean }>(), {
  shouldScaleBackground: true,
})
</script>

<template>
  <DrawerRoot :should-scale-background="shouldScaleBackground">
    <slot />
  </DrawerRoot>
</template>

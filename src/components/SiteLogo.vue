<script setup lang="ts">
import { RouterLink } from 'vue-router'
import iconUrl from '@/assets/vystaveno-icon-small.png'

withDefaults(defineProps<{ variant?: 'full' | 'mark' }>(), { variant: 'full' })
</script>

<template>
  <img
    v-if="variant === 'mark'"
    :src="iconUrl"
    alt="Vystaveno.cz"
    width="36"
    height="36"
    class="h-9 w-9 rounded-lg"
  />
  <RouterLink v-else to="/" class="flex items-center gap-2" aria-label="Vystaveno.cz">
    <img :src="iconUrl" alt="" width="36" height="36" class="h-9 w-9 rounded-lg" />
    <span class="text-lg font-bold tracking-tight text-foreground">
      Vystaveno<span class="text-primary">.cz</span>
    </span>
  </RouterLink>
</template>

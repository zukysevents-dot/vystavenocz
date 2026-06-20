<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <main
    class="flex min-h-svh flex-col items-center justify-center gap-2 bg-background text-foreground"
  >
    <h1 class="text-3xl font-semibold tracking-tight">
      {{ route.meta.title ?? 'Vystaveno.cz' }}
    </h1>
    <p class="text-sm text-muted-foreground">Placeholder — {{ route.path }}</p>
  </main>
</template>

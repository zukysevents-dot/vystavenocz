<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ route.meta.title ?? 'Vystaveno.cz' }}
    </h1>
    <p class="mt-1 text-sm text-muted-foreground">Placeholder — {{ route.path }}</p>
  </div>
</template>

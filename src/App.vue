<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'

const route = useRoute()
const layouts = { public: PublicLayout, app: AppLayout } as const
const layout = computed(() => layouts[route.meta.layout ?? 'public'])
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

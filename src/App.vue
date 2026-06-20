<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import PublicLayout from '@/layouts/PublicLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import CookieBanner from '@/components/CookieBanner.vue'
import { useTheme } from '@/composables/useTheme'
import { defaultSeo, seoByRouteName, siteName } from '@/lib/seo'

// Inicializace tématu (aplikuje .dark dřív, než se vykreslí obsah).
useTheme()

const route = useRoute()
const layouts = { public: PublicLayout, app: AppLayout } as const
const layout = computed(() => layouts[route.meta.layout ?? 'public'])

// SEO meta — reaktivně podle aktuální routy (fallback na default).
const seo = computed(() => {
  const name = typeof route.name === 'string' ? route.name : undefined
  return (name && seoByRouteName[name]) || defaultSeo
})

useHead({
  title: () => seo.value.title,
  meta: [
    { name: 'description', content: () => seo.value.description },
    { property: 'og:title', content: () => seo.value.ogTitle ?? seo.value.title },
    { property: 'og:description', content: () => seo.value.ogDescription ?? seo.value.description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
  ],
})
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
  <CookieBanner />
</template>

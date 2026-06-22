<script setup lang="ts">
import SiteNavbar from '@/components/landing/SiteNavbar.vue'
import SiteFooter from '@/components/landing/SiteFooter.vue'
import StickyMobileCta from '@/components/landing/StickyMobileCta.vue'
</script>

<template>
  <div class="flex min-h-svh flex-col bg-background text-foreground">
    <SiteNavbar />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
    <StickyMobileCta />
  </div>
</template>

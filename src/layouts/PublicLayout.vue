<script setup lang="ts">
import SiteNavbar from '@/components/landing/SiteNavbar.vue'
import SiteFooter from '@/components/landing/SiteFooter.vue'
import StickyMobileCta from '@/components/landing/StickyMobileCta.vue'
</script>

<template>
  <div class="relative flex min-h-svh flex-col text-foreground">
    <!-- Kontinuální aura plátno (main.css .landing-aura): fixed vrstva přes celý
         viewport, takže značkové záře pokrývají každý screen — žádná mrtvá místa. -->
    <div
      class="landing-aura pointer-events-none fixed inset-0 -z-10 bg-background"
      aria-hidden="true"
    />
    <SiteNavbar />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
    <StickyMobileCta />
  </div>
</template>

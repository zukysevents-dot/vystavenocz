<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
import PricingSection from '@/components/landing/PricingSection.vue'
import FaqSection from '@/components/landing/FaqSection.vue'
</script>

<template>
  <PageHeader
    eyebrow="Ceník"
    title="Plať jen za to, co používáš."
    subtitle="Modulární systém pro celý provoz — zapneš jen moduly, které potřebuješ. Bez limitů na počet dokladů, klientů ani uživatelů, bez závazku."
  />
  <PricingSection />
  <FaqSection />
</template>

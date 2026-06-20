<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
import PricingSection from '@/components/landing/PricingSection.vue'
import FaqSection from '@/components/landing/FaqSection.vue'
</script>

<template>
  <PageHeader
    eyebrow="Ceník"
    title="Stovka měsíčně. Hotovo."
    subtitle="Bez limitů na počet faktur, klientů ani uživatelů. Co je v ceně, je opravdu v ceně."
  />
  <PricingSection />
  <FaqSection />
</template>

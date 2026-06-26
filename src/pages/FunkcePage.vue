<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
import FeaturesSection from '@/components/landing/FeaturesSection.vue'
import CtaSection from '@/components/landing/CtaSection.vue'
</script>

<template>
  <PageHeader
    eyebrow="Funkce"
    title="Jeden systém pro celý provoz."
    subtitle="Pokladna, restaurace a kuchyně, sklad, docházka, rezervace i fakturace. Zapneš jen moduly, které potřebuješ — a platíš jen za ně."
  />
  <FeaturesSection />
  <CtaSection />
</template>

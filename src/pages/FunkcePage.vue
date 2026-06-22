<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
import FeaturesSection from '@/components/landing/FeaturesSection.vue'
import CtaSection from '@/components/landing/CtaSection.vue'
</script>

<template>
  <PageHeader
    eyebrow="Funkce"
    title="Všechno potřebné. Nic navíc."
    subtitle="Pro živnostníky a malé firmy, kterým se nechce řešit účetnictví — chtějí prostě vystavit fakturu a jít dál."
  />
  <FeaturesSection />
  <CtaSection />
</template>

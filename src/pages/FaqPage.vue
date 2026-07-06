<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
import FaqSection from '@/components/landing/FaqSection.vue'
import CtaSection from '@/components/landing/CtaSection.vue'
</script>

<template>
  <PageHeader
    eyebrow="Časté otázky"
    title="Na co se nejčastěji ptáte"
    subtitle="Moduly, ceník, early access, pokladna, sklad, receptury i fakturace. Pokud tu odpověď nenajdete, napište nám — během chvilky vám odepíšeme."
  />
  <FaqSection />
  <CtaSection />
</template>

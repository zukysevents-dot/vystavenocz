<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
import PricingSection from '@/components/landing/PricingSection.vue'
import FaqSection from '@/components/landing/FaqSection.vue'
</script>

<template>
  <PageHeader
    eyebrow="Ceník"
    title="Systém, který roste"
    title-accent="s vaším podnikáním."
    subtitle="Začněte jednoduše a zapněte jen moduly, které vám reálně pomáhají vydělávat, šetřit čas nebo držet provoz pod kontrolou. Bez limitů na počet dokladů, klientů ani uživatelů, bez závazku. Ceny jsou bez DPH. Fakturace a klienti jsou zdarma navždy; prvních 500 firem má kompletní balík natrvalo za zaváděcí cenu."
  />
  <PricingSection />
  <FaqSection />
</template>

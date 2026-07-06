<script setup lang="ts">
import HeroSection from '@/components/landing/HeroSection.vue'
import TrustBar from '@/components/landing/TrustBar.vue'
import LifecycleStrip from '@/components/landing/LifecycleStrip.vue'
import HighlightFeatures from '@/components/landing/HighlightFeatures.vue'
import InlineCta from '@/components/landing/InlineCta.vue'
import AudienceSection from '@/components/landing/AudienceSection.vue'
import AiDemo from '@/components/landing/AiDemo.vue'
import RapidUpdatesShort from '@/components/landing/RapidUpdatesShort.vue'
import RoadmapSection from '@/components/landing/RoadmapSection.vue'
import PricingTeaser from '@/components/landing/PricingTeaser.vue'
import CtaSection from '@/components/landing/CtaSection.vue'
</script>

<template>
  <HeroSection />
  <!-- Trust bar hned pod Hero — důvěryhodné mikrosignály ještě před scrollováním. -->
  <TrustBar />
  <!-- Provozní tok jako první obsahová sekce — hlavní odlišení od „jen pokladny". -->
  <LifecycleStrip />
  <!-- Hlavní moduly v krátké podobě. -->
  <HighlightFeatures />
  <!-- CTA po modulech — uživatel právě viděl šíři systému. -->
  <InlineCta title="Zní to dobře? Ukážeme vám Vystaveno na vašem provozu." />
  <!-- Pro koho systém stavíme — konkrétní use-cases místo generických frází. -->
  <AudienceSection />
  <!-- AI ukázka fakturace — wow moment pro fakturační část. -->
  <AiDemo />
  <!-- Krátký důkaz, že produkt rychle vylepšujeme. -->
  <RapidUpdatesShort />
  <!-- Roadmapa — poctivě: co je hotové, co připravujeme. -->
  <RoadmapSection />
  <!-- Ceník teaser před závěrečným CTA — cena až po hodnotě/důvěře; detail je na /cenik. -->
  <PricingTeaser />
  <CtaSection />
</template>

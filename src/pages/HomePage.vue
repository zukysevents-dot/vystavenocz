<script setup lang="ts">
import HeroSection from '@/components/landing/HeroSection.vue'
import TrustBar from '@/components/landing/TrustBar.vue'
import AiDemo from '@/components/landing/AiDemo.vue'
import InlineCta from '@/components/landing/InlineCta.vue'
import LifecycleStrip from '@/components/landing/LifecycleStrip.vue'
import HighlightFeatures from '@/components/landing/HighlightFeatures.vue'
import TestimonialsSection from '@/components/landing/TestimonialsSection.vue'
import RapidUpdatesShort from '@/components/landing/RapidUpdatesShort.vue'
import RoadmapSection from '@/components/landing/RoadmapSection.vue'
import PricingSection from '@/components/landing/PricingSection.vue'
import CtaSection from '@/components/landing/CtaSection.vue'
</script>

<template>
  <HeroSection />
  <!-- Trust bar hned pod Hero — důvěryhodné mikrosignály ještě před scrollováním. -->
  <TrustBar />
  <!-- AI sekce jako hlavní wow moment — živá ukázka schopností. -->
  <AiDemo />
  <!-- CTA po AI sekci — uživatel právě viděl value, pojď ho registrovat. -->
  <InlineCta title="Zní to jednoduše? Zkus to na vlastní faktuře." />
  <!-- Lifecycle — krátké připomenutí, že pokrýváme celý život faktury. -->
  <LifecycleStrip />
  <!-- Hlavní funkce v krátké podobě (3 karty). -->
  <HighlightFeatures />
  <!-- CTA po funkcích — klasické rozhodovací místo. -->
  <InlineCta
    title="Máš všechno, co potřebuješ. Otestuj to zdarma."
    hint="Žádná karta · plný přístup 14 dní"
  />
  <!-- Social proof před závěrečným CTA. -->
  <TestimonialsSection />
  <!-- Krátký důkaz, že produkt rychle vylepšujeme. -->
  <RapidUpdatesShort />
  <!-- Roadmapa — řeší námitku „chybí mi feature X" a buduje důvěru. -->
  <RoadmapSection />
  <!-- Ceník (modulární + oborové balíčky) před závěrečným CTA — cena až po hodnotě/důvěře. -->
  <PricingSection />
  <CtaSection />
</template>

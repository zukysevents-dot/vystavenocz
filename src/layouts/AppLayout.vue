<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/app/AppSidebar.vue'
import TrialBanner from '@/components/app/TrialBanner.vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useCompanyStore } from '@/stores/company'

// Mock předplatné (14denní trial) — inicializace pro TrialBanner.
useSubscriptionStore().init()
// Profil firmy: API režim ho natáhne ze serveru (jednou), mock z localStorage. Fire-and-forget —
// stránky čtou companyStore.company reaktivně, takže se po načtení samy překreslí.
const companyStore = useCompanyStore()
void companyStore.load()
void companyStore.loadCompanies()

const route = useRoute()
const operationalMode = computed(() => route.meta.operational === true)
</script>

<template>
  <div
    class="flex min-h-svh bg-background text-foreground"
    :class="operationalMode ? 'h-svh overflow-hidden' : 'md:h-screen md:overflow-hidden'"
    :data-layout="operationalMode ? 'operational' : 'app'"
  >
    <AppSidebar v-if="!operationalMode" />
    <main
      class="flex min-w-0 flex-1 flex-col"
      :class="operationalMode ? 'overflow-hidden' : 'pt-14 md:overflow-hidden md:pt-0'"
    >
      <TrialBanner v-if="!operationalMode" />
      <div class="flex-1" :class="operationalMode ? 'min-h-0 overflow-hidden' : 'md:overflow-auto'">
        <slot />
      </div>
    </main>
  </div>
</template>

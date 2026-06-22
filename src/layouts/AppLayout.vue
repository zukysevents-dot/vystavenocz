<script setup lang="ts">
import AppSidebar from '@/components/app/AppSidebar.vue'
import TrialBanner from '@/components/app/TrialBanner.vue'
import { useSubscriptionStore } from '@/stores/subscription'

// Mock předplatné (14denní trial) — inicializace pro TrialBanner.
useSubscriptionStore().init()
</script>

<template>
  <div class="flex min-h-svh bg-background text-foreground md:h-screen md:overflow-hidden">
    <AppSidebar />
    <main class="flex min-w-0 flex-1 flex-col pt-14 md:overflow-hidden md:pt-0">
      <TrialBanner />
      <div class="flex-1 md:overflow-auto">
        <slot />
      </div>
    </main>
  </div>
</template>

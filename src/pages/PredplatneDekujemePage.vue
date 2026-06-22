<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { PartyPopper } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useSubscriptionStore } from '@/stores/subscription'

const subStore = useSubscriptionStore()

onMounted(() => subStore.init())
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col items-center p-4 py-16 text-center sm:p-8">
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-coral">
      <PartyPopper class="h-8 w-8" />
    </div>
    <h1 class="mt-6 text-3xl font-bold tracking-tight">Děkujeme!</h1>
    <p class="mt-2 text-muted-foreground">
      Tarif <span class="font-semibold text-foreground">Vystaveno Pro</span> je aktivní. Můžete
      fakturovat bez omezení.
    </p>

    <div class="mt-8 flex flex-col gap-3 sm:flex-row">
      <Button variant="coral" as-child>
        <RouterLink to="/app/faktury/editor">Vystavit fakturu</RouterLink>
      </Button>
      <Button variant="outline" as-child>
        <RouterLink to="/app">Přejít na přehled</RouterLink>
      </Button>
    </div>
  </div>
</template>

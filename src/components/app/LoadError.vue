<script setup lang="ts">
// Chybový stav načtení dat — místo zavádějícího „prázdna" při výpadku serveru.
// Použití: <LoadError v-if="loadError && !loading" :retrying="loading" @retry="load" />
import { ServerCrash, RotateCcw, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

withDefaults(
  defineProps<{
    /** Vlastní hláška; jinak obecná „server nedostupný". */
    message?: string
    /** True = probíhá nový pokus (spinner na tlačítku). */
    retrying?: boolean
  }>(),
  { message: '', retrying: false },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
    <ServerCrash class="mx-auto h-12 w-12 text-muted-foreground" />
    <h2 class="mt-4 text-lg font-semibold">Obsah se nepodařilo načíst</h2>
    <p class="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
      {{ message || 'Zkontrolujte internetové připojení a zkuste to znovu.' }}
    </p>
    <Button variant="outline" class="mt-4" :disabled="retrying" @click="$emit('retry')">
      <Loader2 v-if="retrying" class="h-4 w-4 animate-spin" />
      <RotateCcw v-else class="h-4 w-4" />
      Zkusit znovu
    </Button>
  </div>
</template>

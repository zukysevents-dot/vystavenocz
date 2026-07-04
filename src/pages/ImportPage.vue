<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Users, Package } from 'lucide-vue-next'
import ImportWizard from '@/import/components/ImportWizard.vue'
import { clientsConfig, productsConfig } from '@/import/configs'

// Výchozí entita z URL (?entity=products — sem míří tlačítko na Skladu), dál přepínatelná v UI.
const route = useRoute()
const entity = ref<'clients' | 'products'>(
  route.query.entity === 'products' ? 'products' : 'clients',
)
</script>

<template>
  <div>
    <!-- Přepínač: co importovat -->
    <div class="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6 md:px-8 md:pt-8">
      <div class="inline-flex rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="
            entity === 'clients'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="entity = 'clients'"
        >
          <Users class="h-4 w-4" /> Klienti
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="
            entity === 'products'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="entity = 'products'"
        >
          <Package class="h-4 w-4" /> Produkty
        </button>
      </div>
    </div>

    <!-- v-if/v-else drží konkrétní typ configu a přepnutí průvodce samo restartuje. -->
    <ImportWizard v-if="entity === 'products'" :config="productsConfig" />
    <ImportWizard v-else :config="clientsConfig" />
  </div>
</template>

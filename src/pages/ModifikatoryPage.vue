<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, Loader2, ListChecks, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ModifierGroupDialog from '@/components/app/ModifierGroupDialog.vue'
import { useModifierGroups } from '@/composables/useModifierGroups'
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import type { ModifierGroup, ModifierOption } from '@/lib/types'

const api = useModifierGroups()
const apiMode = isApiMode()

const loading = ref(true)
const groups = ref<ModifierGroup[]>([])
const editing = ref<ModifierGroup | null>(null)
const dialogOpen = ref(false)

const sortedGroups = computed(() =>
  [...groups.value].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'cs')),
)

async function reload() {
  if (!apiMode) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    groups.value = await api.list()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(group: ModifierGroup) {
  editing.value = group
  dialogOpen.value = true
}

function typeLabel(group: ModifierGroup): string {
  if (group.selectionType === 'Single') return 'Jedna volba'
  return group.maxSelect ? `Více voleb (max ${group.maxSelect})` : 'Více voleb'
}

function optionLabel(option: ModifierOption): string {
  if (option.priceDelta === 0) return option.name
  const sign = option.priceDelta > 0 ? '+' : ''
  return `${option.name} (${sign}${formatCZK(option.priceDelta)})`
}

onMounted(reload)
</script>

<template>
  <div class="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Modifikátory</h1>
        <p class="mt-1 text-muted-foreground">
          Volby a příplatky k produktům (velikost, příloha, „bez cibule"). Skupinu přiřadíte k
          produktu v katalogu Sklad.
        </p>
      </div>
      <Button v-if="apiMode" variant="coral" @click="openCreate">
        <Plus class="h-4 w-4" /> Nová skupina
      </Button>
    </div>

    <div
      v-if="!apiMode"
      class="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground"
    >
      Modifikátory jsou dostupné po připojení k API.
    </div>

    <div v-else class="mt-6 rounded-2xl border border-border bg-card">
      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div v-else-if="!sortedGroups.length" class="flex flex-col items-center p-12 text-center">
        <ListChecks class="h-10 w-10 text-muted-foreground" />
        <h3 class="mt-3 text-lg font-semibold">Zatím žádné skupiny modifikátorů</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Např. Velikost (malá / velká), Příloha, Extra přísady…
        </p>
        <Button variant="coral" class="mt-4" @click="openCreate">
          <Plus class="h-4 w-4" /> Přidat skupinu
        </Button>
      </div>
      <div v-else class="divide-y divide-border">
        <button
          v-for="group in sortedGroups"
          :key="group.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40"
          @click="openEdit(group)"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold">{{ group.name }}</span>
              <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {{ typeLabel(group) }}
              </span>
              <span
                v-if="group.isRequired"
                class="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary"
              >
                Povinná
              </span>
            </div>
            <div class="mt-1 truncate text-sm text-muted-foreground">
              {{ group.options.map(optionLabel).join(' · ') || 'Bez voleb' }}
            </div>
          </div>
          <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </div>

    <ModifierGroupDialog v-model:open="dialogOpen" :group="editing" @saved="reload" />
  </div>
</template>

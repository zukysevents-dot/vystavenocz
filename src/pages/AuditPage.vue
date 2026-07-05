<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { History, Loader2, ShieldCheck } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import LoadError from '@/components/app/LoadError.vue'
import { useAudit } from '@/composables/useAudit'
import { isApiMode } from '@/lib/http'
import {
  AUDIT_ACTION_LABELS,
  auditActionLabel,
  auditDataValue,
  auditEntityLabel,
  parseAuditData,
  type AuditEntry,
} from '@/lib/audit'

const apiMode = isApiMode()
const auditApi = useAudit()

const loading = ref(true)
const loadError = ref(false)
const entries = ref<AuditEntry[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const action = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const ACTION_OPTIONS = [
  { value: '', label: 'Všechny akce' },
  { value: 'SaleCancelled', label: AUDIT_ACTION_LABELS.SaleCancelled },
  { value: 'OrderDiscountUpdated', label: AUDIT_ACTION_LABELS.OrderDiscountUpdated },
  { value: 'DayClosed', label: AUDIT_ACTION_LABELS.DayClosed },
  { value: 'ProductPriceChanged', label: AUDIT_ACTION_LABELS.ProductPriceChanged },
]

async function load(targetPage = page.value): Promise<void> {
  if (!apiMode) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = false
  try {
    const res = await auditApi.list({
      page: targetPage,
      pageSize,
      sort: '-createdAt',
      action: action.value || undefined,
    })
    entries.value = res.items
    total.value = res.total
    page.value = res.page
  } catch (e) {
    console.warn('Načtení auditu selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function selectAction(next: string): void {
  if (action.value === next) return
  action.value = next
  load(1)
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dataEntries(entry: AuditEntry): [string, unknown][] {
  const data = parseAuditData(entry.dataJson)
  return data ? Object.entries(data) : []
}

function actor(entry: AuditEntry): string {
  if (entry.actorEmail) return entry.actorEmail
  return entry.userId === '00000000-0000-0000-0000-000000000000' ? 'Systém' : 'Neznámý uživatel'
}

onMounted(() => load())
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <ShieldCheck class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Audit potřebuje připojení k serveru</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Audit</h1>
          <p class="mt-1 text-muted-foreground">
            Kritické změny ve firmě, pokladně, gastro provozu a cenách.
          </p>
        </div>
        <Button variant="outline" :disabled="loading" @click="load(1)">
          <History class="h-4 w-4" /> Obnovit
        </Button>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          v-for="option in ACTION_OPTIONS"
          :key="option.value"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            action === option.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="selectAction(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <LoadError v-else-if="loadError" class="mt-6" :retrying="loading" @retry="load()" />

      <div
        v-else-if="!entries.length"
        class="mt-6 rounded-xl border border-border bg-card p-10 text-center text-muted-foreground"
      >
        <ShieldCheck class="mx-auto h-10 w-10" />
        <p class="mt-3 font-semibold text-foreground">Zatím žádné auditní záznamy</p>
      </div>

      <template v-else>
        <div class="mt-6 space-y-3">
          <article
            v-for="entry in entries"
            :key="entry.id"
            class="rounded-xl border border-border bg-card p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-base font-semibold">
                    {{ auditActionLabel(entry.action) }}
                  </span>
                  <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {{ auditEntityLabel(entry.entity) }}
                  </span>
                </div>
                <div class="mt-1 text-sm text-muted-foreground">
                  {{ actor(entry) }} · {{ formatDateTime(entry.createdAt) }}
                </div>
              </div>
              <div class="max-w-full truncate font-mono text-xs text-muted-foreground">
                {{ entry.entityId }}
              </div>
            </div>

            <dl
              v-if="dataEntries(entry).length"
              class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div
                v-for="[key, value] in dataEntries(entry)"
                :key="key"
                class="rounded-lg bg-muted/50 px-3 py-2"
              >
                <dt class="text-[11px] font-medium uppercase text-muted-foreground">
                  {{ key }}
                </dt>
                <dd class="mt-0.5 break-words text-sm">{{ auditDataValue(value) }}</dd>
              </div>
            </dl>
          </article>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="text-sm text-muted-foreground">
            Strana {{ page }} / {{ totalPages }} · {{ total }} záznamů
          </div>
          <div class="flex gap-2">
            <Button variant="outline" :disabled="loading || page <= 1" @click="load(page - 1)">
              Předchozí
            </Button>
            <Button
              variant="outline"
              :disabled="loading || page >= totalPages"
              @click="load(page + 1)"
            >
              Další
            </Button>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

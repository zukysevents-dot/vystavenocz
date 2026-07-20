<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  FileText,
  FileMinus2,
  ArrowRightLeft,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Upload,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import PaywallDialog from '@/components/app/PaywallDialog.vue'
import { ApiError } from '@/lib/http'
import { useInvoices } from '@/composables/useInvoices'
import { useSubscription } from '@/composables/useSubscription'
import { documentTypeLabel, formatCZK, formatDate } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'
import type { DocumentType, InvoiceStatus } from '@/lib/types'

const router = useRouter()
const { invoices, loadError, load, remove, creditNote, convertToInvoice } = useInvoices()
const { hasAccess } = useSubscription()

const loading = ref(true)
const search = ref('')
const typeFilter = ref<'all' | DocumentType>('all')
const busyId = ref<string | null>(null)
const deleteId = ref<string | null>(null)
const deleteOpen = ref(false)
const paywallOpen = ref(false)

const typeFilters = [
  { value: 'all', label: 'Vše' },
  { value: 'invoice', label: 'Faktury' },
  { value: 'proforma', label: 'Zálohové' },
  { value: 'credit_note', label: 'Dobropisy' },
] as const

function askDelete(id: string) {
  deleteId.value = id
  deleteOpen.value = true
}

// Vystavení nové faktury je prémiová akce — bez aktivního tarifu ukážeme paywall.
function newInvoice() {
  if (!hasAccess.value) {
    paywallOpen.value = true
    return
  }
  router.push('/app/faktury/editor')
}

async function reload(): Promise<void> {
  loading.value = true
  await load()
  loading.value = false
}
onMounted(reload)

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'
type StatusMeta = { label: string; variant: BadgeVariant }

const statusLabels: Record<InvoiceStatus, StatusMeta> = {
  draft: { label: 'Koncept', variant: 'secondary' },
  issued: { label: 'Vystaveno', variant: 'default' },
  paid: { label: 'Zaplaceno', variant: 'outline' },
  overdue: { label: 'Po splatnosti', variant: 'destructive' },
  cancelled: { label: 'Stornováno', variant: 'secondary' },
}

// Fallback pro neočekávaný status (stará/poškozená data z localStorage), ať render nespadne.
function statusMeta(status: string): StatusMeta {
  return statusLabels[status as InvoiceStatus] ?? { label: status || 'Neznámý', variant: 'outline' }
}

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return invoices.value.filter((inv) => {
    if (typeFilter.value !== 'all' && inv.documentType !== typeFilter.value) return false
    if (!q) return true
    return (
      (inv.invoiceNumber ?? '').toLowerCase().includes(q) ||
      (inv.clientSnapshot?.name || '').toLowerCase().includes(q)
    )
  })
})

// Dobropis smí vzniknout jen z vystavené/uhrazené faktury (ne z konceptu, proformy ani jiného dobropisu).
function canCreditNote(inv: { documentType: DocumentType; status: InvoiceStatus }): boolean {
  return inv.documentType === 'invoice' && (inv.status === 'issued' || inv.status === 'paid')
}

/** Vystaví dobropis k faktuře — doklad vytvoří backend (záporné částky), FE ho jen zobrazí. */
async function onCreditNote(id: string) {
  if (busyId.value) return
  busyId.value = id
  try {
    const note = await creditNote(id)
    toast.success(`Dobropis vytvořen (${formatCZK(note.total)}).`)
    typeFilter.value = 'all'
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Dobropis lze vystavit jen k vystavené nebo uhrazené faktuře.')
    } else {
      toast.error('Vystavení dobropisu se nezdařilo.')
    }
  } finally {
    busyId.value = null
  }
}

/** Převede zálohovou (proforma) fakturu na daňový doklad a otevře ho k dokončení. */
async function onConvert(id: string) {
  if (busyId.value) return
  busyId.value = id
  try {
    const inv = await convertToInvoice(id)
    toast.success('Zálohová faktura převedena na daňový doklad.')
    router.push('/app/faktury/editor?id=' + inv.id)
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Převést lze jen zálohovou fakturu.')
    } else {
      toast.error('Převod se nezdařil.')
    }
  } finally {
    busyId.value = null
  }
}

async function onDelete() {
  const id = deleteId.value
  if (!id) return
  deleteOpen.value = false
  deleteId.value = null
  try {
    await remove(id)
    toast.success('Faktura smazána.')
  } catch (e) {
    // Vystavenou fakturu server smazat nedovolí (409) — patří ji stornovat, ne mazat.
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Vystavenou fakturu nelze smazat — otevřete ji a stornujte.')
    } else {
      throw e
    }
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Faktury</h1>
        <p class="mt-1 text-muted-foreground">Spravujte své faktury a sledujte platby.</p>
      </div>
      <!-- flex-wrap: na 320px se akce zalomí pod sebe místo horizontálního overflow celé stránky -->
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="router.push('/app/import/faktury')">
          <Upload class="h-4 w-4" /> Import z Fakturoidu
        </Button>
        <Button variant="coral" @click="newInvoice"> <Plus class="h-4 w-4" /> Nová faktura </Button>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <div class="relative min-w-[12rem] flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="search" placeholder="Hledat fakturu nebo klienta…" class="pl-9" />
      </div>
      <div class="flex flex-wrap gap-1">
        <Button
          v-for="t in typeFilters"
          :key="t.value"
          :variant="typeFilter === t.value ? 'default' : 'outline'"
          size="sm"
          @click="typeFilter = t.value"
        >
          {{ t.label }}
        </Button>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-12" @retry="reload" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <FileText class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">
        {{ invoices.length === 0 ? 'Zatím žádné faktury' : 'Nic nenalezeno' }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{
          invoices.length === 0
            ? 'Vystavte svou první fakturu jediným kliknutím.'
            : 'Zkuste změnit hledaný výraz.'
        }}
      </p>
      <Button v-if="invoices.length === 0" variant="coral" class="mt-4" @click="newInvoice">
        <Plus class="h-4 w-4" /> Nová faktura
      </Button>
    </div>

    <template v-else>
      <!-- Mobil: karty místo tabulky -->
      <div class="mt-6 space-y-3 sm:hidden">
        <div
          v-for="inv in filtered"
          :key="inv.id"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold">{{ inv.invoiceNumber || 'Koncept' }}</span>
                <Badge
                  v-if="inv.documentType !== 'invoice'"
                  variant="outline"
                  class="shrink-0 text-[10px]"
                >
                  {{ documentTypeLabel(inv.documentType) }}
                </Badge>
              </div>
              <div class="truncate text-sm text-muted-foreground">
                {{ inv.clientSnapshot?.name || '—' }}
              </div>
            </div>
            <Badge :variant="statusMeta(inv.status).variant" class="shrink-0">
              {{ statusMeta(inv.status).label }}
            </Badge>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-sm text-muted-foreground">{{ formatDate(inv.issueDate) }}</span>
            <span class="font-semibold">{{ formatCZK(inv.total) }}</span>
          </div>
          <div class="mt-3 flex flex-wrap justify-end gap-1 border-t border-border pt-2">
            <Button
              v-if="canCreditNote(inv)"
              variant="ghost"
              size="sm"
              :disabled="busyId === inv.id"
              @click="onCreditNote(inv.id)"
            >
              <FileMinus2 class="h-4 w-4" /> Dobropis
            </Button>
            <Button
              v-if="inv.documentType === 'proforma'"
              variant="ghost"
              size="sm"
              :disabled="busyId === inv.id"
              @click="onConvert(inv.id)"
            >
              <ArrowRightLeft class="h-4 w-4" /> Na fakturu
            </Button>
            <Button
              v-if="inv.documentType !== 'credit_note'"
              variant="ghost"
              size="sm"
              @click="router.push('/app/faktury/editor?id=' + inv.id)"
            >
              <Pencil class="h-4 w-4" /> Upravit
            </Button>
            <Button variant="ghost" size="sm" @click="askDelete(inv.id)">
              <Trash2 class="h-4 w-4 text-destructive" /> Smazat
            </Button>
          </div>
        </div>
      </div>

      <!-- Desktop: tabulka -->
      <div class="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table class="w-full min-w-[640px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Číslo</th>
              <th class="px-4 py-3 text-left">Odběratel</th>
              <th class="px-4 py-3 text-left">Vystaveno</th>
              <th class="px-4 py-3 text-right">Částka</th>
              <th class="px-4 py-3 text-center">Stav</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in filtered"
              :key="inv.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">
                <div class="flex items-center gap-2">
                  <span>{{ inv.invoiceNumber || 'Koncept' }}</span>
                  <Badge
                    v-if="inv.documentType !== 'invoice'"
                    variant="outline"
                    class="text-[10px]"
                  >
                    {{ documentTypeLabel(inv.documentType) }}
                  </Badge>
                </div>
              </td>
              <td class="px-4 py-3 text-muted-foreground">{{ inv.clientSnapshot?.name || '—' }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ formatDate(inv.issueDate) }}</td>
              <td class="px-4 py-3 text-right font-semibold">{{ formatCZK(inv.total) }}</td>
              <td class="px-4 py-3 text-center">
                <Badge :variant="statusMeta(inv.status).variant">
                  {{ statusMeta(inv.status).label }}
                </Badge>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    v-if="canCreditNote(inv)"
                    variant="ghost"
                    size="icon"
                    title="Vystavit dobropis"
                    :disabled="busyId === inv.id"
                    @click="onCreditNote(inv.id)"
                  >
                    <FileMinus2 class="h-4 w-4" />
                  </Button>
                  <Button
                    v-if="inv.documentType === 'proforma'"
                    variant="ghost"
                    size="icon"
                    title="Převést na fakturu"
                    :disabled="busyId === inv.id"
                    @click="onConvert(inv.id)"
                  >
                    <ArrowRightLeft class="h-4 w-4" />
                  </Button>
                  <Button
                    v-if="inv.documentType !== 'credit_note'"
                    variant="ghost"
                    size="icon"
                    title="Upravit"
                    @click="router.push('/app/faktury/editor?id=' + inv.id)"
                  >
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Smazat" @click="askDelete(inv.id)">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="deleteOpen" @update:open="(o) => (deleteOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat fakturu?</AlertDialogTitle>
          <AlertDialogDescription>
            Tuto akci nelze vrátit. Faktura bude trvale smazána.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="onDelete"
          >
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <PaywallDialog v-model:open="paywallOpen" />
  </div>
</template>

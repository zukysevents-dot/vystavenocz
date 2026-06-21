<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, FileText, Search, Pencil, Trash2, Loader2 } from 'lucide-vue-next'
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
import { useInvoices } from '@/composables/useInvoices'
import { useSubscription } from '@/composables/useSubscription'
import { formatCZK, formatDate } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type { InvoiceStatus } from '@/lib/types'

const router = useRouter()
const { invoices, load, remove } = useInvoices()
const { hasAccess } = useSubscription()

const loading = ref(true)
const search = ref('')
const deleteId = ref<string | null>(null)
const paywallOpen = ref(false)

// Vystavení nové faktury je prémiová akce — bez aktivního tarifu ukážeme paywall.
function newInvoice() {
  if (!hasAccess.value) {
    paywallOpen.value = true
    return
  }
  router.push('/app/faktury/editor')
}

onMounted(async () => {
  await load()
  loading.value = false
})

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
    if (!q) return true
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.clientSnapshot?.name || '').toLowerCase().includes(q)
    )
  })
})

async function onDelete() {
  if (!deleteId.value) return
  await remove(deleteId.value)
  toast.success('Faktura smazána.')
  deleteId.value = null
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Faktury</h1>
        <p class="mt-1 text-muted-foreground">Spravujte své faktury a sledujte platby.</p>
      </div>
      <Button variant="coral" class="shrink-0" @click="newInvoice">
        <Plus class="h-4 w-4" /> Nová faktura
      </Button>
    </div>

    <div class="mt-6 flex items-center gap-3">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="search" placeholder="Hledat fakturu nebo klienta…" class="pl-9" />
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

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

    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
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
            <td class="px-4 py-3 font-medium">{{ inv.invoiceNumber }}</td>
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
                  variant="ghost"
                  size="icon"
                  title="Upravit"
                  @click="router.push('/app/faktury/editor?id=' + inv.id)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Smazat" @click="deleteId = inv.id">
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="!!deleteId" @update:open="(o) => !o && (deleteId = null)">
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

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { UserCircle, FileText, FileCheck, Loader2, Check, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/sonner'
import {
  useClientPortal,
  type ClientPortalData,
  type PortalQuote,
} from '@/composables/useClientPortal'
import { formatCZK, formatDate } from '@/lib/invoice'

const route = useRoute()
const token = String(route.params.token ?? '')
const portal = useClientPortal()

const loading = ref(true)
const loadError = ref(false)
const data = ref<ClientPortalData | null>(null)
const respondingId = ref<string | null>(null)

onMounted(async () => {
  try {
    data.value = await portal.load(token)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})

const invStatus: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  issued: { label: 'Vystaveno', variant: 'default' },
  paid: { label: 'Zaplaceno', variant: 'outline' },
  overdue: { label: 'Po splatnosti', variant: 'destructive' },
  cancelled: { label: 'Stornováno', variant: 'secondary' },
  draft: { label: 'Koncept', variant: 'secondary' },
}
const quoteStatus: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Koncept', variant: 'secondary' },
  sent: { label: 'Ke schválení', variant: 'default' },
  accepted: { label: 'Přijato', variant: 'outline' },
  rejected: { label: 'Odmítnuto', variant: 'destructive' },
}
function invMeta(s: string) {
  return invStatus[s] ?? { label: s, variant: 'outline' as const }
}
function quoteMeta(s: string) {
  return quoteStatus[s] ?? { label: s, variant: 'outline' as const }
}

async function respond(q: PortalQuote, action: 'approve' | 'reject') {
  if (respondingId.value) return
  respondingId.value = q.id
  try {
    await portal.respondQuote(token, q.id, action)
    q.status = action === 'approve' ? 'accepted' : 'rejected'
    toast.success(action === 'approve' ? 'Nabídka přijata.' : 'Nabídka odmítnuta.')
  } catch {
    toast.error('Akce se nezdařila. Zkuste to prosím znovu.')
  } finally {
    respondingId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:py-14">
    <div class="mb-6 flex items-center gap-2">
      <UserCircle class="h-6 w-6 text-primary" />
      <h1 class="text-2xl font-bold tracking-tight">Klientská zóna</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div
      v-else-if="loadError || !data"
      class="rounded-2xl border border-border bg-card p-8 text-center"
    >
      <h2 class="text-lg font-semibold">Přístup není platný</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Odkaz je neplatný nebo vypršel. Požádejte prosím o nový.
      </p>
    </div>

    <template v-else>
      <p class="text-muted-foreground">
        Dobrý den, <span class="font-medium text-foreground">{{ data.clientName }}</span
        >. Tady najdete své faktury a nabídky.
      </p>

      <!-- Nabídky ke schválení -->
      <section v-if="data.quotes.length" class="mt-8">
        <h2 class="flex items-center gap-1.5 text-lg font-semibold">
          <FileCheck class="h-5 w-5 text-primary" /> Nabídky
        </h2>
        <div class="mt-3 space-y-3">
          <div
            v-for="q in data.quotes"
            :key="q.id"
            class="rounded-xl border border-border bg-card p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="font-semibold">{{ q.number }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ formatCZK(q.total) }}
                  <template v-if="q.validUntil">· platí do {{ formatDate(q.validUntil) }}</template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Badge :variant="quoteMeta(q.status).variant">{{
                  quoteMeta(q.status).label
                }}</Badge>
                <template v-if="q.status === 'sent'">
                  <Button
                    variant="coral"
                    size="sm"
                    :disabled="respondingId === q.id"
                    @click="respond(q, 'approve')"
                  >
                    <Check class="h-4 w-4" /> Přijmout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="respondingId === q.id"
                    @click="respond(q, 'reject')"
                  >
                    <X class="h-4 w-4" /> Odmítnout
                  </Button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Faktury -->
      <section class="mt-8">
        <h2 class="flex items-center gap-1.5 text-lg font-semibold">
          <FileText class="h-5 w-5 text-primary" /> Faktury
        </h2>

        <div
          v-if="data.invoices.length === 0"
          class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
        >
          Zatím tu nemáte žádné faktury.
        </div>

        <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table class="w-full min-w-[520px] text-sm">
            <thead
              class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Číslo</th>
                <th class="px-4 py-3 text-left">Vystaveno</th>
                <th class="px-4 py-3 text-left">Splatnost</th>
                <th class="px-4 py-3 text-right">Částka</th>
                <th class="px-4 py-3 text-center">Stav</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(inv, i) in data.invoices"
                :key="i"
                class="border-b border-border last:border-0"
              >
                <td class="px-4 py-3 font-medium">{{ inv.invoiceNumber || '—' }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(inv.issueDate) }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(inv.dueDate) }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatCZK(inv.total) }}</td>
                <td class="px-4 py-3 text-center">
                  <Badge :variant="invMeta(inv.status).variant">{{
                    invMeta(inv.status).label
                  }}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p class="mt-8 text-center text-xs text-muted-foreground">Vystaveno.cz · klientský portál</p>
    </template>
  </div>
</template>

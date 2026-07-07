<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ChefHat,
  Clock,
  Check,
  UtensilsCrossed,
  Printer,
  Wine,
  Flame,
  History,
  ListChecks,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useKitchen } from '@/composables/useKitchen'
import { ApiError, isApiMode } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'
import type { CategoryKitchenSection, KitchenQueueItem } from '@/lib/types'

const kitchen = useKitchen()
const apiMode = isApiMode()

const items = ref<KitchenQueueItem[]>([])
const loadError = ref(false)
const station = ref<CategoryKitchenSection>('None') // 'None' = vše
const mode = ref<'live' | 'history'>('live')
const now = ref(Date.now())
const busy = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const STATIONS: { value: CategoryKitchenSection; label: string }[] = [
  { value: 'None', label: 'Vše' },
  { value: 'Kitchen', label: 'Kuchyně' },
  { value: 'Bar', label: 'Bar' },
]
const SECTION_LABEL: Record<CategoryKitchenSection, string> = {
  None: 'Ostatní',
  Kitchen: 'Kuchyně',
  Bar: 'Bar',
}

// Bon (lísteček) = položky jednoho účtu pro jednu stanici (kuchyně / bar).
interface Ticket {
  key: string
  orderId: string
  section: CategoryKitchenSection
  tableName: string | null
  customerName: string | null
  fulfillment: KitchenQueueItem['fulfillment']
  sentAt: string | null
  statusUpdatedAt: string | null
  items: KitchenQueueItem[]
  ready: boolean
  preparing: boolean
}

const tickets = computed<Ticket[]>(() => {
  const map = new Map<string, Ticket>()
  for (const it of items.value) {
    const key = `${it.orderId}__${it.kitchenSection}`
    let t = map.get(key)
    if (!t) {
      t = {
        key,
        orderId: it.orderId,
        section: it.kitchenSection,
        tableName: it.tableName,
        customerName: it.customerName ?? null,
        fulfillment: it.fulfillment ?? null,
        sentAt: it.sentToKitchenAt,
        statusUpdatedAt: it.kitchenStatusUpdatedAt,
        items: [],
        ready: mode.value === 'history',
        preparing: false,
      }
      map.set(key, t)
    }
    t.items.push(it)
    if (mode.value === 'live' && it.kitchenStatus !== 'Ready') t.ready = false
    if (it.kitchenStatus === 'Preparing') t.preparing = true
    if (it.sentToKitchenAt && (!t.sentAt || it.sentToKitchenAt < t.sentAt))
      t.sentAt = it.sentToKitchenAt
    if (
      it.kitchenStatusUpdatedAt &&
      (!t.statusUpdatedAt || it.kitchenStatusUpdatedAt > t.statusUpdatedAt)
    )
      t.statusUpdatedAt = it.kitchenStatusUpdatedAt
  }
  return [...map.values()].sort((a, b) =>
    mode.value === 'history'
      ? (b.statusUpdatedAt ?? '').localeCompare(a.statusUpdatedAt ?? '')
      : (a.sentAt ?? '').localeCompare(b.sentAt ?? ''),
  )
})

async function refresh() {
  if (!apiMode) return
  try {
    items.value =
      mode.value === 'history'
        ? await kitchen.history(station.value)
        : await kitchen.queue(station.value)
    now.value = Date.now()
    loadError.value = false
  } catch (e) {
    // Průběžný poll nezahazuje už zobrazené bony — chybu ukážeme, jen když nemáme data.
    console.warn('Načtení bonů selhalo:', e)
    loadError.value = true
  }
}

async function setAll(t: Ticket, status: 'Preparing' | 'Ready' | 'Served') {
  if (busy.value || mode.value === 'history') return
  busy.value = true
  try {
    const targets =
      status === 'Preparing'
        ? t.items.filter((i) => i.kitchenStatus === 'Sent')
        : status === 'Ready'
          ? t.items.filter((i) => i.kitchenStatus !== 'Ready')
          : t.items
    await Promise.all(targets.map((i) => kitchen.setStatus(i.itemId, status)))
    if (status === 'Served') toast.success(`Vydáno: ${ticketTitle(t)}`)
    await refresh()
  } catch (e) {
    // Bon mezitím posunul/vydal jiný terminál — backend odmítne neplatný přechod (409). Ukaž jasnou hlášku
    // a hned synchronizuj frontu, ať kuchyň nevidí zastaralý stav.
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Bon už mezitím posunul jiný terminál.')
      await refresh()
    } else {
      toast.error('Změna stavu selhala.')
      console.error(e)
    }
  } finally {
    busy.value = false
  }
}

function minutesSince(iso: string | null): number {
  if (!iso) return 0
  return Math.max(0, Math.floor((now.value - new Date(iso).getTime()) / 60000))
}

function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000))
}

function formatShortTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

function slaClass(t: Ticket): string {
  if (mode.value === 'history') return 'bg-success/10 text-success'
  const minutes = minutesSince(t.sentAt)
  const warn = t.section === 'Bar' ? 6 : 12
  const late = t.section === 'Bar' ? 10 : 20
  if (minutes >= late) return 'bg-destructive/15 text-destructive'
  if (minutes >= warn) return 'bg-amber-500/15 text-amber-700'
  return 'bg-muted text-muted-foreground'
}

function ticketTitle(t: Ticket): string {
  if (t.tableName) return t.tableName
  if (t.customerName) return t.customerName
  return 'Bez stolu'
}

function ticketSubtitle(t: Ticket): string {
  const suffix = mode.value === 'history' ? ' - vydáno' : ''
  if (t.tableName) return `${SECTION_LABEL[t.section]}${suffix}`
  if (t.fulfillment === 'delivery') return `${SECTION_LABEL[t.section]} - rozvoz${suffix}`
  if (t.fulfillment === 'pickup') return `${SECTION_LABEL[t.section]} - vyzvednutí${suffix}`
  return `${SECTION_LABEL[t.section]}${suffix}`
}

function printTicket(t: Ticket) {
  const w = window.open('', '_blank', 'width=320,height=520')
  if (!w) {
    toast.error('Tisk zablokoval prohlížeč (povolte vyskakovací okna).')
    return
  }
  const rows = t.items
    .map(
      (i) =>
        `<div class="row"><b>${i.quantity}×</b> ${escapeHtml(i.productName)}${
          i.course ? ` <span class="course">[${escapeHtml(i.course)}]</span>` : ''
        }${i.note ? `<div class="note">↳ ${escapeHtml(i.note)}</div>` : ''}</div>`,
    )
    .join('')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bon</title>
    <style>
      *{font-family:'Courier New',monospace}
      body{width:280px;margin:0;padding:8px;color:#000}
      h2{margin:0;font-size:20px;text-align:center}
      .sub{text-align:center;font-size:12px;margin-bottom:6px}
      hr{border:none;border-top:1px dashed #000}
      .row{font-size:16px;margin:6px 0}
      .course{font-weight:bold}
      .note{font-size:13px;padding-left:18px}
    </style></head><body>
    <h2>${SECTION_LABEL[t.section].toUpperCase()}</h2>
    <div class="sub">${escapeHtml(ticketTitle(t))} • ${escapeHtml(ticketSubtitle(t))} • ${new Date().toLocaleTimeString('cs-CZ')}</div>
    <hr>${rows}<hr>
    </body></html>`)
  w.document.close()
  w.focus()
  w.print()
  w.close()
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[c]
  })
}

watch([station, mode], refresh)

onMounted(() => {
  if (!apiMode) return
  refresh()
  timer = setInterval(() => {
    if (mode.value === 'live') {
      refresh()
    } else {
      now.value = Date.now()
    }
  }, 5000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="p-4 sm:p-6">
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <ChefHat class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Stanice potřebuje připojení k serveru</p>
    </div>

    <template v-else>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Bony — kuchyně & bar</h1>
          <p class="text-sm text-muted-foreground">
            Objednávky z účtů. Po odeslání číšníkem sem „vyjede" lísteček.
          </p>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <div class="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                mode === 'live'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="mode = 'live'"
            >
              <ListChecks class="h-4 w-4" /> Živé
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                mode === 'history'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="mode = 'history'"
            >
              <History class="h-4 w-4" /> Historie
            </button>
          </div>
          <button
            v-for="s in STATIONS"
            :key="s.value"
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              station === s.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            "
            @click="station = s.value"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <LoadError
        v-if="loadError && !tickets.length"
        message="Bony se nepodařilo načíst — zkontrolujte připojení k serveru."
        @retry="refresh"
      />

      <div
        v-else-if="!tickets.length"
        class="flex flex-col items-center rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground"
      >
        <UtensilsCrossed class="h-10 w-10" />
        <p class="mt-3 font-semibold text-foreground">
          {{ mode === 'history' ? 'Žádná historie' : 'Žádné bony' }}
        </p>
        <p class="mt-1 text-sm">
          {{
            mode === 'history'
              ? 'Vydané bony za posledních 24 hodin se zobrazí tady.'
              : 'Nové objednávky se tu objeví automaticky.'
          }}
        </p>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <!-- Lísteček (bon) -->
        <div
          v-for="t in tickets"
          :key="t.key"
          class="flex flex-col rounded-xl border-2 border-dashed p-3 shadow-sm"
          :class="t.ready ? 'border-success bg-success/5' : 'border-border bg-card'"
        >
          <div
            class="flex items-start justify-between gap-2 border-b border-dashed border-border pb-2"
          >
            <div>
              <div class="text-lg font-bold leading-tight">{{ ticketTitle(t) }}</div>
              <span
                class="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
              >
                <Wine v-if="t.section === 'Bar'" class="h-3 w-3" />
                <ChefHat v-else class="h-3 w-3" />
                {{ ticketSubtitle(t) }}
              </span>
            </div>
            <span
              class="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold"
              :class="slaClass(t)"
            >
              <Clock class="h-3 w-3" />
              {{
                mode === 'history'
                  ? `${minutesSince(t.statusUpdatedAt)}′`
                  : `${minutesSince(t.sentAt)}′`
              }}
            </span>
          </div>

          <ul class="flex-1 space-y-1.5 py-2 text-sm">
            <li v-for="i in t.items" :key="i.itemId">
              <span class="font-bold tabular-nums">{{ i.quantity }}×</span> {{ i.productName }}
              <span
                v-if="i.course"
                class="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] font-semibold text-foreground"
                >{{ i.course }}</span
              >
              <div v-if="i.note" class="pl-4 text-xs text-muted-foreground">↳ {{ i.note }}</div>
            </li>
          </ul>

          <div
            v-if="mode === 'history'"
            class="mb-2 rounded-lg bg-muted/60 px-2 py-1.5 text-[11px] text-muted-foreground"
          >
            <span>Odesláno {{ formatShortTime(t.sentAt) }}</span>
            <span class="px-1">•</span>
            <span>Vydáno {{ formatShortTime(t.statusUpdatedAt) }}</span>
            <span v-if="minutesBetween(t.sentAt, t.statusUpdatedAt) !== null" class="px-1">•</span>
            <span v-if="minutesBetween(t.sentAt, t.statusUpdatedAt) !== null">
              {{ minutesBetween(t.sentAt, t.statusUpdatedAt) }} min
            </span>
          </div>

          <div class="flex gap-2">
            <Button variant="ghost" size="icon" title="Tisk bonu" @click="printTicket(t)">
              <Printer class="h-4 w-4" />
            </Button>
            <Button v-if="mode === 'history'" variant="outline" class="flex-1" disabled>
              <Check class="h-4 w-4" /> Vydáno
            </Button>
            <template v-else>
              <Button
                v-if="!t.preparing && !t.ready"
                variant="outline"
                class="flex-1"
                :disabled="busy"
                @click="setAll(t, 'Preparing')"
              >
                <Flame class="h-4 w-4" /> Připravit
              </Button>
              <Button
                v-else-if="t.preparing && !t.ready"
                variant="outline"
                class="flex-1"
                :disabled="busy"
                @click="setAll(t, 'Ready')"
              >
                <Check class="h-4 w-4" /> Hotovo
              </Button>
              <Button
                v-else
                variant="coral"
                class="flex-1"
                :disabled="busy"
                @click="setAll(t, 'Served')"
              >
                <Check class="h-4 w-4" /> Vydat
              </Button>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

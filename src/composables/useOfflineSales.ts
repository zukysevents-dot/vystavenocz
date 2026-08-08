import { computed, ref } from 'vue'
import { ApiError, http, isApiMode } from '@/lib/http'
import {
  classifySyncFailure,
  isDue,
  markFailed,
  scheduleRetry,
  settlementDifference,
  type QueuedSale,
  type QueuedSalePayload,
  type QueuedSaleSnapshot,
} from '@/lib/offline-sales'
import {
  deleteQueuedSale,
  isOfflineStorageAvailable,
  listQueuedSales,
  putQueuedSale,
} from '@/lib/offline-db'
import type { Sale } from '@/lib/types'

// Fronta offline prodejů je stav CELÉ pokladny, ne jedné stránky: uzávěrka se nesmí zavřít,
// dokud je neprázdná, a indikátor má být stejný všude. Proto modulový singleton, ne per-komponenta.
const queue = ref<QueuedSale[]>([])
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const syncing = ref(false)
let initialized = false
let syncTimer: ReturnType<typeof setInterval> | null = null

/** Výsledek jednoho průchodu frontou — stránka z toho staví hlášky pro obsluhu. */
export interface SyncSummary {
  synced: number
  /** Rozdíly mezi částkou vytištěnou offline a částkou spočítanou serverem (Kč, se znaménkem). */
  differences: number[]
  failed: number
  stillPending: number
}

export function useOfflineSales() {
  const available = isApiMode() && isOfflineStorageAvailable()
  const pending = computed(() => queue.value.filter((s) => s.status !== 'failed'))
  const failed = computed(() => queue.value.filter((s) => s.status === 'failed'))

  async function init(): Promise<void> {
    if (!available) return
    await refresh()
    if (initialized) return
    initialized = true
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    // Fronta se dorovnává i bez události `online`: prohlížeč hlásí připojení i tehdy, kdy je
    // za ním nedostupná síť festivalu. Pravdu řekne až úspěšně odeslaný požadavek.
    syncTimer = setInterval(() => void sync(), 15_000)
  }

  function handleOnline(): void {
    online.value = true
    void sync()
  }

  function handleOffline(): void {
    online.value = false
  }

  async function refresh(): Promise<void> {
    if (!available) return
    queue.value = await listQueuedSales()
  }

  /**
   * Zařadí hotovostní prodej k pozdějšímu doúčtování. `idempotencyKey` dodává volající a při žádném
   * dalším pokusu se NEMĚNÍ — jinak by z jedné účtenky vznikly dvě. Když se prodej zařazuje po
   * spadlém odeslání, musí to být týž klíč, se kterým se odesílal (požadavek mohl doletět).
   */
  async function enqueue(
    payload: Omit<QueuedSalePayload, 'soldAt'>,
    snapshot: QueuedSaleSnapshot,
  ): Promise<QueuedSale> {
    if (!available) throw new Error('Offline režim není v tomto prohlížeči dostupný.')
    const now = new Date()
    const sale: QueuedSale = {
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: now.toISOString(),
      attempts: 0,
      nextAttemptAt: 0,
      lastError: null,
      payload: { ...payload, soldAt: now.toISOString() },
      snapshot,
    }
    await putQueuedSale(sale)
    queue.value = [...queue.value, sale]
    return sale
  }

  /** Sériové odeslání fronty. Nikdy neběží dvakrát naráz a nikdy nic tiše nezahodí. */
  async function sync(): Promise<SyncSummary> {
    const summary: SyncSummary = { synced: 0, differences: [], failed: 0, stillPending: 0 }
    if (!available || syncing.value) return summary
    syncing.value = true
    try {
      for (const sale of [...queue.value]) {
        if (!isDue(sale, Date.now())) continue
        const outcome = await send(sale)
        if (outcome.kind === 'synced') {
          summary.synced++
          if (outcome.difference !== null) summary.differences.push(outcome.difference)
        } else if (outcome.kind === 'failed') {
          summary.failed++
        }
      }
      summary.stillPending = pending.value.length
      return summary
    } finally {
      syncing.value = false
    }
  }

  async function send(
    sale: QueuedSale,
  ): Promise<
    { kind: 'synced'; difference: number | null } | { kind: 'retry' } | { kind: 'failed' }
  > {
    try {
      const created = await http.post<Sale>('/sales', sale.payload)
      online.value = true
      await deleteQueuedSale(sale.id)
      queue.value = queue.value.filter((s) => s.id !== sale.id)
      return {
        kind: 'synced',
        difference: settlementDifference(sale.snapshot.total, created.total),
      }
    } catch (e) {
      const status = e instanceof ApiError ? e.status : null
      const detail =
        e instanceof ApiError ? (e.detail as { detail?: unknown } | undefined)?.detail : null
      const outcome = classifySyncFailure(status, typeof detail === 'string' ? detail : null)
      if (status === null) online.value = false
      const updated =
        outcome.kind === 'failed'
          ? markFailed(sale, outcome.message)
          : scheduleRetry(sale, outcome.message, Date.now())
      await putQueuedSale(updated)
      queue.value = queue.value.map((s) => (s.id === sale.id ? updated : s))
      return { kind: outcome.kind === 'failed' ? 'failed' : 'retry' }
    }
  }

  /** Vedoucí rozhodl (den se otevřel, prodej se zapíše jinak) — vrátí odmítnutou účtenku do fronty. */
  async function retryFailed(id: string): Promise<void> {
    const sale = queue.value.find((s) => s.id === id)
    if (!sale) return
    const updated: QueuedSale = { ...sale, status: 'pending', nextAttemptAt: 0, lastError: null }
    await putQueuedSale(updated)
    queue.value = queue.value.map((s) => (s.id === id ? updated : s))
    await sync()
  }

  return {
    available,
    queue,
    pending,
    failed,
    online,
    syncing,
    init,
    refresh,
    enqueue,
    sync,
    retryFailed,
  }
}

/** Jen pro testy: zahodí sdílený stav i posluchače mezi případy. */
export function __resetOfflineSalesForTests(): void {
  queue.value = []
  syncing.value = false
  online.value = true
  initialized = false
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = null
}

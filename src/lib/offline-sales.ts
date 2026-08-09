// Čistá logika offline fronty pokladny (bez IndexedDB a bez Vue) — díky tomu je testovatelná
// bez prohlížeče. Ukládání řeší `offline-db.ts`, běh synchronizace `useOfflineSales.ts`.
//
// Pravidla, na kterých stojí celý offline režim:
//   1. `idempotencyKey` se vygeneruje JEDNOU při zařazení do fronty a při opakovaném odeslání
//      se NIKDY nemění — je to jediná ochrana proti dvojímu naúčtování.
//   2. Prodej se z fronty NIKDY tiše nezahazuje. Když ho server odmítne, zůstává jako `failed`
//      se srozumitelnou hláškou a čeká na rozhodnutí manažera.
//   3. Ceny, promo akce a věrnostní body počítá VÝHRADNĚ server při synchronizaci. Offline
//      snapshot slouží jen k zobrazení a k tisku dokladu k doúčtování.

import type { PaymentMethod } from '@/lib/types'

export type QueuedSaleStatus = 'pending' | 'syncing' | 'failed'

/** Tělo požadavku na `POST /sales` tak, jak se odešle při synchronizaci (beze změny). */
export interface QueuedSalePayload {
  paymentMethod: PaymentMethod
  locationId: string | null
  items: {
    productId: string | null
    description: string | null
    quantity: number
    unitPrice: number
    vatRate: number
    discountPercent: number
    productVariantId?: string | null
  }[]
  discountPercent: number
  tipAmount: number
  cashReceived: number | null
  priceLevelId: string | null
  idempotencyKey: string
  /** Čas pořízení na pokladně — server ho uloží jako datum prodeje (správný obchodní den). */
  soldAt: string
}

/** Co pokladna potřebuje pro zobrazení fronty a pro doklad k doúčtování. */
export interface QueuedSaleSnapshot {
  total: number
  itemCount: number
  catalogSavedAt: string | null
}

export interface QueuedSale {
  id: string
  status: QueuedSaleStatus
  createdAt: string
  attempts: number
  /** Epoch ms; dřív se odeslání nezkouší (exponenciální backoff). */
  nextAttemptAt: number
  lastError: string | null
  payload: QueuedSalePayload
  snapshot: QueuedSaleSnapshot
}

/** Exponenciální backoff mezi pokusy: 5 s → 15 s → 1 min → 5 min, dál po 15 minutách. */
const BACKOFF_MS = [5_000, 15_000, 60_000, 300_000, 900_000]

export function syncBackoffMs(attempts: number): number {
  const index = Math.min(Math.max(attempts, 1), BACKOFF_MS.length) - 1
  return BACKOFF_MS[index]
}

export type SyncOutcome =
  | { kind: 'synced' }
  | { kind: 'retry'; message: string }
  | { kind: 'failed'; message: string }

/**
 * Rozhodne, co se s prodejem ve frontě stane po neúspěšném odeslání.
 * `status === null` znamená, že požadavek vůbec neodešel (síť) — to je vždy jen důvod к opakování.
 * Zahození prodeje NEEXISTUJE: i „failed" je stav ve frontě, ne smazání.
 */
export type SyncFailure = Exclude<SyncOutcome, { kind: 'synced' }>

export function classifySyncFailure(
  status: number | null,
  serverMessage?: string | null,
): SyncFailure {
  const message = serverMessage?.trim() || null
  if (status === null) return { kind: 'retry', message: message ?? 'Zatím bez připojení.' }
  if (status === 409)
    return {
      kind: 'failed',
      message:
        message ?? 'Obchodní den byl mezitím uzavřený. Účtenka čeká na rozhodnutí vedoucího.',
    }
  if (status === 422) return { kind: 'failed', message: message ?? 'Server prodej odmítl.' }
  if (status === 401 || status === 403)
    return {
      kind: 'failed',
      message: message ?? 'K doúčtování nemáte oprávnění. Požádejte vedoucího.',
    }
  if (status === 429 || status >= 500)
    return { kind: 'retry', message: message ?? 'Server je zaneprázdněný.' }
  return { kind: 'retry', message: message ?? 'Prodej se zatím nepodařilo odeslat.' }
}

/** Prodej je na řadě, jen když čeká a uplynul jeho backoff. */
export function isDue(sale: QueuedSale, now: number): boolean {
  return sale.status !== 'failed' && sale.nextAttemptAt <= now
}

/** Zařazení dalšího pokusu po neúspěchu; klíč ani obsah se nemění. */
export function scheduleRetry(sale: QueuedSale, message: string, now: number): QueuedSale {
  const attempts = sale.attempts + 1
  return {
    ...sale,
    status: 'pending',
    attempts,
    nextAttemptAt: now + syncBackoffMs(attempts),
    lastError: message,
  }
}

export function markFailed(sale: QueuedSale, message: string): QueuedSale {
  return { ...sale, status: 'failed', lastError: message }
}

/**
 * Co offline NEJDE. UI to musí říct PŘEDEM, ne až po pokusu — obsluha se nesmí dozvědět v půlce
 * platby, že karta nefunguje. Ceny a promo dopočítá server, ty tedy blokovat netřeba.
 */
export function offlineBlockReason(input: {
  paymentMethod: PaymentMethod
  customerId: string | null
  redeemPoints: number
}): string | null {
  if (input.paymentMethod !== 'Cash') return 'Bez připojení jde přijmout jen hotovost.'
  if (input.customerId || input.redeemPoints > 0)
    return 'Bez připojení nejde načíst ani uplatnit věrnostní body.'
  return null
}

/**
 * Rozdíl mezi částkou vytištěnou offline a částkou, kterou nakonec spočítal server (promo akce,
 * cenová hladina, zaokrouhlení). Nulový rozdíl vrací null — nemá cenu o něm mluvit.
 */
export function settlementDifference(snapshotTotal: number, serverTotal: number): number | null {
  const difference = Math.round((serverTotal - snapshotTotal) * 100) / 100
  return difference === 0 ? null : difference
}

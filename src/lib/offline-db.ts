// Trvalé úložiště offline pokladny. IndexedDB, protože fronta účtenek ani ceník NESMÍ zmizet
// při tvrdém refreshi nebo pádu záložky — localStorage je synchronní a má pár MB, na frontu
// prodejů se nespoléhá.
//
// ponytail: syrové IndexedDB API, žádná knihovna (idb). Potřebujeme dva objektové sklady a čtyři
// operace; wrapper by přidal závislost bez užitku. Až přibude verzování schématu a migrace, je to
// první místo, kde knihovna dává smysl.

import type { QueuedSale } from '@/lib/offline-sales'

const DB_NAME = 'vystaveno-offline'
const DB_VERSION = 1
const QUEUE_STORE = 'sale-queue'
const CATALOG_STORE = 'catalog'

let dbPromise: Promise<IDBDatabase> | null = null

/** Prohlížeč bez IndexedDB (anonymní režim, starý webview) — offline režim se pak POCTIVĚ vypne. */
export function isOfflineStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(QUEUE_STORE))
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(CATALOG_STORE)) db.createObjectStore(CATALOG_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB se nepodařilo otevřít.'))
  })
  return dbPromise
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const request = action(transaction.objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () =>
          reject(request.error ?? new Error('Zápis do offline úložiště selhal.'))
      }),
  )
}

// IndexedDB klonuje strukturovaně a Vue reaktivní proxy neumí (DataCloneError). JSON round-trip je
// nejlevnější způsob, jak z dat udělat prostý objekt — ukládáme jen čísla, řetězce a pole.
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function putQueuedSale(sale: QueuedSale): Promise<unknown> {
  return run(QUEUE_STORE, 'readwrite', (s) => s.put(toPlain(sale)))
}

export function deleteQueuedSale(id: string): Promise<unknown> {
  return run(QUEUE_STORE, 'readwrite', (s) => s.delete(id))
}

export function listQueuedSales(): Promise<QueuedSale[]> {
  return run<QueuedSale[]>(
    QUEUE_STORE,
    'readonly',
    (s) => s.getAll() as IDBRequest<QueuedSale[]>,
  ).then((sales) =>
    // Fronta se odesílá sériově v pořadí pořízení — účtenky mají v Z-reportu sedět chronologicky.
    [...sales].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  )
}

/** Uložený ceník pro konkrétní pobočku (klíč nese pobočku, ať se bary nepřepisují navzájem). */
export interface CachedCatalog<TProduct, TCategory> {
  savedAt: string
  products: TProduct[]
  categories: TCategory[]
}

export function saveCatalog<TProduct, TCategory>(
  locationId: string | null,
  catalog: CachedCatalog<TProduct, TCategory>,
): Promise<unknown> {
  return run(CATALOG_STORE, 'readwrite', (s) => s.put(toPlain(catalog), catalogKey(locationId)))
}

export function loadCatalog<TProduct, TCategory>(
  locationId: string | null,
): Promise<CachedCatalog<TProduct, TCategory> | null> {
  return run<CachedCatalog<TProduct, TCategory> | undefined>(
    CATALOG_STORE,
    'readonly',
    (s) =>
      s.get(catalogKey(locationId)) as IDBRequest<CachedCatalog<TProduct, TCategory> | undefined>,
  ).then((value) => value ?? null)
}

function catalogKey(locationId: string | null): string {
  return `catalog:${locationId ?? 'all'}`
}

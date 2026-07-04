import type { ClientInput } from '@/composables/useClients'
import type { ProductInput } from '@/composables/useProducts'
import { useClients } from '@/composables/useClients'
import { useProducts } from '@/composables/useProducts'
import { useAres } from '@/composables/useAres'
import { genericClients } from './adapters/generic-clients'
import { genericProducts } from './adapters/generic-products'
import { detectAdapter } from './adapters'
import { validateClient, validateProduct } from './validate'
import { isValidIco } from './normalize'
import { mergeAres } from './enrich'
import type { DedupKey } from './dedup'
import type { ImportEntity, ImportSourceAdapter, ValidationIssue } from './types'

/** Cílové pole entity pro mapování (pořadí i popisek do UI). */
export interface FieldDef {
  field: string
  label: string
  required?: boolean
}

/** Operace nad úložištěm entity — zapojení na existující composable (mock i API). */
export interface EntityOps<T> {
  items: () => (T & { id: string })[]
  load: () => Promise<void>
  create: (input: T) => Promise<{ id: string }>
  update: (id: string, input: T) => Promise<unknown>
  remove: (id: string) => Promise<void>
}

/** Vše entitně-specifické na jednom místě — wizard je díky tomu zdroj/entita-agnostický. */
export interface ImportEntityConfig<T> {
  entity: ImportEntity
  noun: string // 2. pád do nadpisů/hlášek: „klientů" / „produktů"
  doneLink: { to: string; label: string } // kam vést uživatele po importu
  fields: FieldDef[]
  previewColumns: FieldDef[] // sloupce navíc (vedle Název) do náhledu
  genericAdapter: ImportSourceAdapter<T>
  detect: (headers: string[]) => ImportSourceAdapter<T> | undefined
  validate: (value: Partial<T>) => ValidationIssue[]
  dedupKeys: DedupKey<T>[]
  createOps: () => EntityOps<T> // volá se uvnitř composable (potřebuje Pinia kontext)
  // Volitelné dávkové obohacení (jen klienti — ARES). Vrací změněná pole, nebo null.
  enrichLabel?: string
  createEnrich?: () => (value: T) => Promise<Partial<T> | null>
}

export const clientsConfig: ImportEntityConfig<ClientInput> = {
  entity: 'clients',
  noun: 'klientů',
  doneLink: { to: '/app/klienti', label: 'Zobrazit klienty' },
  fields: [
    { field: 'name', label: 'Název / jméno', required: true },
    { field: 'ico', label: 'IČO' },
    { field: 'dic', label: 'DIČ' },
    { field: 'email', label: 'E-mail' },
    { field: 'phone', label: 'Telefon' },
    { field: 'street', label: 'Ulice' },
    { field: 'city', label: 'Město' },
    { field: 'zip', label: 'PSČ' },
    { field: 'country', label: 'Země' },
    { field: 'notes', label: 'Poznámka' },
  ],
  previewColumns: [
    { field: 'ico', label: 'IČO' },
    { field: 'email', label: 'E-mail' },
  ],
  genericAdapter: genericClients,
  detect: (h) => detectAdapter(h, 'clients') as ImportSourceAdapter<ClientInput> | undefined,
  validate: validateClient,
  dedupKeys: [
    { reason: 'ico', value: (c) => c.ico },
    { reason: 'email', value: (c) => c.email },
    { reason: 'name', value: (c) => c.name },
  ],
  createOps: () => {
    const api = useClients()
    return {
      items: () => api.clients.value as (ClientInput & { id: string })[],
      load: api.loadAll, // dedup musí vidět celý adresář, ne jen první stránku (import-klienti-produkty.md)
      create: (input) => api.create(input),
      update: (id, input) => api.update(id, input),
      remove: api.remove,
    }
  },
  enrichLabel: 'Doplnit z ARES',
  createEnrich: () => {
    const ares = useAres()
    return async (value: ClientInput) => {
      if (!value.ico || !isValidIco(value.ico)) return null
      const needs = !value.name?.trim() || !value.street || !value.city || !value.zip || !value.dic
      if (!needs) return null
      const r = await ares.lookup(value.ico, { silent: true })
      if (!r) return null
      const patch = mergeAres(value, r)
      return Object.keys(patch).length ? patch : null
    }
  },
}

export const productsConfig: ImportEntityConfig<ProductInput> = {
  entity: 'products',
  noun: 'produktů',
  doneLink: { to: '/app/sklad', label: 'Zobrazit produkty' },
  fields: [
    { field: 'name', label: 'Název', required: true },
    { field: 'sku', label: 'SKU / kód' },
    { field: 'ean', label: 'EAN' },
    { field: 'salePrice', label: 'Prodejní cena (vč. DPH)' },
    { field: 'vatRate', label: 'Sazba DPH (%)' },
    { field: 'purchasePrice', label: 'Nákupní cena' },
  ],
  previewColumns: [
    { field: 'sku', label: 'SKU' },
    { field: 'salePrice', label: 'Cena' },
  ],
  genericAdapter: genericProducts,
  detect: (h) => detectAdapter(h, 'products') as ImportSourceAdapter<ProductInput> | undefined,
  validate: validateProduct,
  dedupKeys: [
    { reason: 'sku', value: (p) => p.sku || null },
    { reason: 'ean', value: (p) => p.ean },
    { reason: 'name', value: (p) => p.name },
  ],
  createOps: () => {
    const api = useProducts()
    return {
      items: () => api.products.value as (ProductInput & { id: string })[],
      load: api.loadAll, // dedup musí vidět celý katalog, ne jen první stránku (import-klienti-produkty.md)
      create: (input) => api.create(input),
      update: (id, input) => api.update(id, input),
      remove: api.remove,
    }
  },
}

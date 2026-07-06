import type { ProductInput } from '@/composables/useProducts'
import type { ImportSourceAdapter } from '../types'
import { transformProductImportRow } from './generic-products'

function normHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

function hasAny(headers: Set<string>, candidates: string[]): boolean {
  return candidates.map(normHeader).some((h) => headers.has(h))
}

function detectPosProductExport(
  headers: string[],
  requiredAny: string[],
  identityAny: string[],
): boolean {
  const set = new Set(headers.map(normHeader))
  return hasAny(set, requiredAny) && hasAny(set, identityAny)
}

const COMMON_POS_ALIASES = {
  name: [
    'name',
    'nazev',
    'název',
    'nazevpolozky',
    'název položky',
    'produkt',
    'polozka',
    'položka',
    'jidlo',
    'jídlo',
    'nazov',
    'názov',
  ],
  sku: ['sku', 'kod', 'kód', 'kodzbozi', 'kód zboží', 'plu', 'idpolozky', 'id položky'],
  ean: ['ean', 'carovykod', 'čárový kód', 'barcode'],
  salePrice: [
    'cena',
    'cenavcdph',
    'cena vč. DPH',
    'prodejnicena',
    'prodejní cena',
    'prodejnicenavcdph',
    'prodejní cena vč. DPH',
    'predajnacena',
    'predajná cena',
    'cenaskladph',
    'cena s DPH',
  ],
  vatRate: ['dph', 'sazbadph', 'sazba DPH', 'vat', 'dan', 'daň'],
  purchasePrice: [
    'nakupnicena',
    'nákupní cena',
    'nakupnacena',
    'nákupná cena',
    'nakup',
    'nákup',
    'porizovacena',
    'pořizovací cena',
    'cost',
  ],
  category: [
    'kategorie',
    'category',
    'skupina',
    'produktovaskupina',
    'produktová skupina',
    'sortiment',
    'stredisko',
    'středisko',
    'stredisko/skupina',
  ],
  quantity: [
    'skladem',
    'sklad',
    'stavskladu',
    'stav skladu',
    'mnozstvi',
    'množství',
    'mnozstvo',
    'množstvo',
    'qty',
  ],
}

function posAdapter(
  id: string,
  source: string,
  label: string,
  detect: (headers: string[]) => boolean,
): ImportSourceAdapter<ProductInput> {
  return {
    id,
    source,
    entity: 'products',
    label,
    defaultMapping: {
      name: 'Název',
      sku: 'PLU',
      ean: 'EAN',
      salePrice: 'Cena',
      vatRate: 'DPH',
      purchasePrice: 'Nákupní cena',
      category: 'Kategorie',
      quantity: 'Skladem',
    },
    aliases: COMMON_POS_ALIASES,
    detect,
    transform: transformProductImportRow,
  }
}

export const dotykackaProducts = posAdapter(
  'dotykacka-products',
  'Dotykačka',
  'Dotykačka — produkty/menu',
  (headers) =>
    detectPosProductExport(
      headers,
      ['plu', 'kategorie', 'produktová skupina', 'středisko'],
      ['název', 'produkt', 'položka'],
    ),
)

export const storyousProducts = posAdapter(
  'storyous-products',
  'Storyous / Teya',
  'Storyous / Teya — produkty/menu',
  (headers) =>
    detectPosProductExport(
      headers,
      ['název položky', 'id položky', 'prodejní cena', 'cena s DPH'],
      ['kategorie', 'skupina', 'dph'],
    ),
)

export const ikelpProducts = posAdapter(
  'ikelp-products',
  'iKelp',
  'iKelp — produkty/menu',
  (headers) =>
    detectPosProductExport(
      headers,
      ['plu', 'predajná cena', 'predajna cena', 'skupina'],
      ['názov', 'nazov', 'ean', 'dph'],
    ),
)

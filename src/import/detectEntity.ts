import type { ImportEntity } from './types'

/**
 * Autodetekce typu importu (klienti vs. produkty) podle hlaviček souboru.
 * Skóruje hlavičky proti dvěma slovníkům charakteristických polí a vrací tu
 * entitu s vyšším skóre. `null` = nerozpoznáno (remíza / nic nesedí) → UI nechá
 * na ručním přepínači. Sdílená pole (název/poznámka) se schválně neboduje.
 */

/** Normalizace hlavičky: malá písmena, bez diakritiky, bez oddělovačů. */
function norm(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

const CLIENT_HINTS = [
  'ico',
  'ic',
  'dic',
  'email',
  'mail',
  'telefon',
  'phone',
  'tel',
  'mobil',
  'ulice',
  'street',
  'mesto',
  'city',
  'psc',
  'zip',
  'jmeno',
  'prijmeni',
  'kontakt',
].map(norm)

const PRODUCT_HINTS = [
  'sku',
  'plu',
  'kod',
  'kodzbozi',
  'kodzboží',
  'ean',
  'barcode',
  'cena',
  'price',
  'saleprice',
  'prodejnicena',
  'prodejnicenavcdph',
  'predajnacena',
  'dph',
  'vat',
  'skladem',
  'sklad',
  'stavskladu',
  'mnozstvi',
  'quantity',
  'stock',
  'qty',
  'pocet',
  'kategorie',
  'category',
  'skupina',
  'produktovaskupina',
  'stredisko',
  'nakupnicena',
  'purchaseprice',
].map(norm)

export function scoreEntity(headers: string[]): { clients: number; products: number } {
  const set = new Set(headers.map(norm))
  let clients = 0
  let products = 0
  for (const h of CLIENT_HINTS) if (set.has(h)) clients++
  for (const h of PRODUCT_HINTS) if (set.has(h)) products++
  return { clients, products }
}

/** Vrátí rozpoznanou entitu, nebo null při remíze / nulovém skóre. */
export function detectEntity(
  headers: string[],
): Extract<ImportEntity, 'clients' | 'products'> | null {
  const { clients, products } = scoreEntity(headers)
  if (clients === 0 && products === 0) return null
  if (clients === products) return null
  return clients > products ? 'clients' : 'products'
}

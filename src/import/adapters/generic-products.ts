import type { ProductInput } from '@/composables/useProducts'
import type { ImportSourceAdapter } from '../types'
import { trimOrNull, parsePrice } from '../normalize'

/** Univerzální adaptér pro produkty z libovolného CSV/XLSX (hlavičky = názvy polí). */
export const genericProducts: ImportSourceAdapter<ProductInput> = {
  id: 'generic-products',
  source: 'CSV / XLSX',
  entity: 'products',
  label: 'Obecný soubor — produkty',
  defaultMapping: {
    name: 'name',
    sku: 'sku',
    ean: 'ean',
    salePrice: 'salePrice',
    vatRate: 'vatRate',
    purchasePrice: 'purchasePrice',
    category: 'kategorie',
    quantity: 'skladem',
  },
  // Aliasy hlaviček pro autodetekci mapování (i z českých exportů / konkurence).
  aliases: {
    name: ['name', 'nazev', 'produkt', 'polozka'],
    sku: ['sku', 'kod', 'kodzbozi'],
    ean: ['ean', 'carovykod'],
    salePrice: ['saleprice', 'cena', 'prodejnicena', 'cenavcdph'],
    vatRate: ['vatrate', 'dph', 'sazbadph', 'vat'],
    purchasePrice: ['purchaseprice', 'nakupnicena', 'nakup'],
    category: ['kategorie', 'category', 'skupina'],
    quantity: ['skladem', 'mnozstvi', 'quantity', 'qty', 'stock', 'pocet'],
  },
  transform: (_row, m) => {
    const vr = (m.vatRate ?? '').replace(/[^\d]/g, '')
    return {
      name: (m.name ?? '').trim(),
      sku: trimOrNull(m.sku) ?? '',
      ean: trimOrNull(m.ean),
      salePrice: parsePrice(m.salePrice),
      vatRate: vr === '' ? 21 : Number(vr),
      purchasePrice: m.purchasePrice ? parsePrice(m.purchasePrice) : null,
      minQuantity: 0,
      categoryId: null,
    }
  },
}

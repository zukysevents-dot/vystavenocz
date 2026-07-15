import type { CsvValue } from '@/lib/csv-export'
import { safeCsvText } from '@/lib/csv-export'
import type { StockMovement, StockMovementType } from '@/lib/types'

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  Receipt: 'Příjem',
  Issue: 'Výdej',
  WriteOff: 'Odpis',
  StaffMeal: 'Personální spotřeba',
  Breakage: 'Rozbití / zničení',
  Expiration: 'Expirace',
  Correction: 'Korekce',
  Sale: 'Prodej',
  StornoSale: 'Storno prodeje',
  Stocktaking: 'Inventura',
  TransferOut: 'Přesun ven',
  TransferIn: 'Přesun dovnitř',
  ProductionConsumption: 'Spotřeba ve výrobě',
  ProductionOutput: 'Výstup z výroby',
  JobConsumption: 'Materiál na zakázce',
  StornoJobConsumption: 'Vrácení ze zakázky',
  LotAssignment: 'Přiřazení počáteční šarže',
  ReservationFulfillment: 'Vyskladnění rezervace',
}

export const STOCK_MOVEMENT_COLUMNS = [
  'Datum a čas',
  'Produkt',
  'SKU',
  'Pobočka',
  'Typ pohybu',
  'Změna pohybu',
  'Šarže',
  'Expirace',
  'Změna šarže',
  'ID šarže',
  'Stav po pohybu',
  'Zdroj',
  'ID zdroje',
  'Poznámka',
  'ID pohybu',
  'ID produktu',
  'ID pobočky',
  'ID autora',
]

export interface StockMovementExportFallbacks {
  productNameById?: ReadonlyMap<string, string>
  productSkuById?: ReadonlyMap<string, string>
  locationNameById?: ReadonlyMap<string, string>
}

export function stockMovementSource(movement: StockMovement): { label: string; id: string } {
  if (movement.relatedStockReservationId)
    return { label: 'Skladová rezervace', id: movement.relatedStockReservationId }
  if (movement.relatedPurchaseReceiptId)
    return { label: 'Nákupní příjemka', id: movement.relatedPurchaseReceiptId }
  if (movement.relatedStocktakeId) return { label: 'Inventura', id: movement.relatedStocktakeId }
  if (movement.relatedProductionBatchId)
    return { label: 'Výrobní dávka', id: movement.relatedProductionBatchId }
  if (movement.relatedJobId) return { label: 'Zakázka', id: movement.relatedJobId }
  if (movement.relatedSaleId) return { label: 'Prodej', id: movement.relatedSaleId }
  if (movement.type === 'TransferIn' || movement.type === 'TransferOut')
    return { label: 'Přesun mezi pobočkami', id: '' }
  if (movement.type === 'Correction') return { label: 'Ruční korekce', id: '' }
  if (movement.type === 'Receipt') return { label: 'Ruční příjem', id: '' }
  if (['Issue', 'WriteOff', 'StaffMeal', 'Breakage', 'Expiration'].includes(movement.type))
    return { label: 'Ruční výdej', id: '' }
  return { label: STOCK_MOVEMENT_LABELS[movement.type], id: '' }
}

export function stockMovementProductName(
  movement: StockMovement,
  fallbacks: StockMovementExportFallbacks = {},
): string {
  return (
    movement.productName || fallbacks.productNameById?.get(movement.productId) || movement.productId
  )
}

export function stockMovementProductSku(
  movement: StockMovement,
  fallbacks: StockMovementExportFallbacks = {},
): string {
  return movement.productSku || fallbacks.productSkuById?.get(movement.productId) || ''
}

export function stockMovementLocationName(
  movement: StockMovement,
  fallbacks: StockMovementExportFallbacks = {},
): string {
  if (!movement.locationId) return 'Nezařazeno'
  return (
    movement.locationName ||
    fallbacks.locationNameById?.get(movement.locationId) ||
    'Archivovaná pobočka'
  )
}

export function buildStockMovementRows(
  movements: StockMovement[],
  fallbacks: StockMovementExportFallbacks = {},
): CsvValue[][] {
  return movements.flatMap((movement) => {
    const source = stockMovementSource(movement)
    const allocations = movement.lotAllocations?.length ? movement.lotAllocations : [null]
    return allocations.map((allocation, index) => [
      movement.createdAt,
      safeCsvText(stockMovementProductName(movement, fallbacks)),
      safeCsvText(stockMovementProductSku(movement, fallbacks)),
      safeCsvText(stockMovementLocationName(movement, fallbacks)),
      STOCK_MOVEMENT_LABELS[movement.type],
      index === 0 ? movement.quantity : '',
      safeCsvText(allocation?.lotNumber ?? ''),
      allocation?.expiresOn ?? '',
      allocation?.quantity ?? '',
      allocation?.stockLotId ?? '',
      movement.quantityAfter,
      source.label,
      source.id,
      safeCsvText(movement.note),
      movement.id,
      movement.productId,
      movement.locationId ?? '',
      movement.createdBy ?? '',
    ])
  })
}

export function stockMovementFilename(from?: string, to?: string): string {
  const range = from || to ? `${from || 'zacatek'}_${to || 'dnes'}` : 'vse'
  return `skladove-pohyby-${range}.csv`
}

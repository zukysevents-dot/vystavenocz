import type { CsvValue } from '@/lib/csv-export'
import { downloadCsv } from '@/lib/csv-export'
import type { DayCloseResponse } from '@/lib/types'

export const DAY_CLOSE_ACCOUNTING_COLUMNS = [
  'Datum',
  'Pobočka',
  'Z-report',
  'Sekce',
  'Položka',
  'Sazba DPH',
  'Množství',
  'Základ',
  'DPH',
  'Celkem',
  'Měna',
  'Poznámka',
]

function amount(value: number | null | undefined): number {
  return value ?? 0
}

function row(
  z: DayCloseResponse,
  locationName: string,
  section: string,
  item: string,
  vatRate: number | null,
  quantity: number | null,
  net: number | null,
  vat: number | null,
  gross: number | null,
  note = '',
): CsvValue[] {
  return [
    z.date,
    locationName,
    z.zReportNumber ?? '',
    section,
    item,
    vatRate ?? '',
    quantity ?? '',
    net ?? '',
    vat ?? '',
    gross ?? '',
    'CZK',
    note,
  ]
}

export function buildDayCloseAccountingRows(
  z: DayCloseResponse,
  locationName: string,
): CsvValue[][] {
  const rows: CsvValue[][] = []

  for (const vatLine of z.vatBreakdown ?? []) {
    rows.push(
      row(
        z,
        locationName,
        'Tržba',
        `DPH ${vatLine.vatRate} %`,
        vatLine.vatRate,
        null,
        vatLine.net,
        vatLine.vat,
        vatLine.gross,
      ),
    )
  }

  rows.push(row(z, locationName, 'Platby', 'Hotovost', null, null, null, null, amount(z.cashTotal)))
  rows.push(row(z, locationName, 'Platby', 'Karta', null, null, null, null, amount(z.cardTotal)))

  if (amount(z.tipTotal) !== 0) {
    rows.push(
      row(z, locationName, 'Spropitné', 'Spropitné', null, null, null, null, amount(z.tipTotal)),
    )
  }
  if (amount(z.discountTotal) !== 0) {
    rows.push(
      row(
        z,
        locationName,
        'Korekce tržeb',
        'Slevy na účet',
        null,
        null,
        null,
        null,
        -amount(z.discountTotal),
      ),
    )
  }
  if (amount(z.cancelledTotal) !== 0 || amount(z.cancelledCount) !== 0) {
    rows.push(
      row(
        z,
        locationName,
        'Korekce tržeb',
        'Storna',
        null,
        amount(z.cancelledCount),
        null,
        null,
        -amount(z.cancelledTotal),
      ),
    )
  }

  for (const product of z.productBreakdown ?? []) {
    rows.push(
      row(
        z,
        locationName,
        'Prodané produkty',
        product.name,
        null,
        product.quantity,
        null,
        null,
        product.revenueGross,
        product.productId ?? '',
      ),
    )
  }

  if (
    z.cashOpening != null ||
    z.cashCountedClosing != null ||
    z.cashExpectedClosing != null ||
    z.cashDrop != null ||
    z.cashDifference != null
  ) {
    rows.push(
      row(
        z,
        locationName,
        'Hotovostní uzávěrka',
        'Počáteční hotovost',
        null,
        null,
        null,
        null,
        amount(z.cashOpening),
      ),
    )
    rows.push(
      row(
        z,
        locationName,
        'Hotovostní uzávěrka',
        'Očekávaná hotovost',
        null,
        null,
        null,
        null,
        amount(z.cashExpectedClosing),
      ),
    )
    rows.push(
      row(
        z,
        locationName,
        'Hotovostní uzávěrka',
        'Spočítaná hotovost',
        null,
        null,
        null,
        null,
        amount(z.cashCountedClosing),
      ),
    )
    rows.push(
      row(
        z,
        locationName,
        'Hotovostní uzávěrka',
        'Odvod hotovosti',
        null,
        null,
        null,
        null,
        amount(z.cashDrop),
      ),
    )
    rows.push(
      row(
        z,
        locationName,
        'Hotovostní uzávěrka',
        'Rozdíl hotovosti',
        null,
        null,
        null,
        null,
        amount(z.cashDifference),
      ),
    )
  }

  return rows
}

export function downloadDayCloseAccountingCsv(z: DayCloseResponse, locationName: string): void {
  downloadCsv(
    `z-report-ucetni-${z.date}`,
    DAY_CLOSE_ACCOUNTING_COLUMNS,
    buildDayCloseAccountingRows(z, locationName),
  )
}

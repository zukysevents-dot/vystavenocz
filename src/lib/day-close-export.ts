import type { CsvValue } from '@/lib/csv-export'
import { downloadCsv } from '@/lib/csv-export'
import type { DayCloseResponse } from '@/lib/types'
import type { SalesSummary } from '@/lib/salesReport'

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

export const SHIFT_HANDOVER_COLUMNS = [
  'Datum',
  'Pobočka',
  'Z-report',
  'Sekce',
  'Položka',
  'Hodnota',
  'Poznámka',
]

function amount(value: number | null | undefined): number {
  return value ?? 0
}

function avgSale(total: number, count: number): number {
  return count > 0 ? Math.round((total / count) * 100) / 100 : 0
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
    z.cashPayIns != null ||
    z.cashPayOuts != null ||
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
        'Vklady do pokladny',
        null,
        null,
        null,
        null,
        amount(z.cashPayIns),
      ),
    )
    rows.push(
      row(
        z,
        locationName,
        'Hotovostní uzávěrka',
        'Výběry z pokladny',
        null,
        null,
        null,
        null,
        amount(z.cashPayOuts),
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

export function buildDayCloseAccountingRowsForReports(
  reports: DayCloseResponse[],
  locationNameById: (locationId: string) => string,
): CsvValue[][] {
  return reports.flatMap((z) => buildDayCloseAccountingRows(z, locationNameById(z.locationId)))
}

export function downloadDayCloseAccountingCsv(z: DayCloseResponse, locationName: string): void {
  downloadCsv(
    `z-report-ucetni-${z.date}`,
    DAY_CLOSE_ACCOUNTING_COLUMNS,
    buildDayCloseAccountingRows(z, locationName),
  )
}

export function downloadDayCloseAccountingCsvForReports(
  reports: DayCloseResponse[],
  locationNameById: (locationId: string) => string,
  filename: string,
): void {
  downloadCsv(
    filename,
    DAY_CLOSE_ACCOUNTING_COLUMNS,
    buildDayCloseAccountingRowsForReports(reports, locationNameById),
  )
}

export function buildShiftHandoverRowsFromSummary(
  date: string,
  locationName: string,
  summary: SalesSummary,
): CsvValue[][] {
  return buildShiftHandoverRows({
    date,
    locationName,
    zReportNumber: '',
    saleCount: summary.count,
    avgSale: summary.avgSale,
    total: summary.total,
    cashTotal: summary.cashTotal,
    cardTotal: summary.cardTotal,
    tipTotal: summary.tipTotal,
    discountTotal: summary.discountTotal,
    cancelledCount: summary.cancelledCount,
    cancelledTotal: summary.cancelledTotal,
  })
}

export function buildShiftHandoverRowsFromDayClose(
  z: DayCloseResponse,
  locationName: string,
): CsvValue[][] {
  return buildShiftHandoverRows({
    date: z.date,
    locationName,
    zReportNumber: z.zReportNumber ?? '',
    saleCount: amount(z.saleCount),
    avgSale: avgSale(amount(z.total), amount(z.saleCount)),
    total: amount(z.total),
    cashTotal: amount(z.cashTotal),
    cardTotal: amount(z.cardTotal),
    tipTotal: amount(z.tipTotal),
    discountTotal: amount(z.discountTotal),
    cancelledCount: amount(z.cancelledCount),
    cancelledTotal: amount(z.cancelledTotal),
    cashOpening: z.cashOpening,
    cashPayIns: z.cashPayIns,
    cashPayOuts: z.cashPayOuts,
    cashExpectedClosing: z.cashExpectedClosing,
    cashCountedClosing: z.cashCountedClosing,
    cashDrop: z.cashDrop,
    cashDifference: z.cashDifference,
  })
}

export function downloadShiftHandoverCsv(
  date: string,
  locationName: string,
  rows: CsvValue[][],
): void {
  downloadCsv(`predavka-smeny-${date}-${locationName}`, SHIFT_HANDOVER_COLUMNS, rows)
}

interface ShiftHandoverInput {
  date: string
  locationName: string
  zReportNumber: CsvValue
  saleCount: number
  avgSale: number
  total: number
  cashTotal: number
  cardTotal: number
  tipTotal: number
  discountTotal: number
  cancelledCount: number
  cancelledTotal: number
  cashOpening?: number | null
  cashPayIns?: number | null
  cashPayOuts?: number | null
  cashExpectedClosing?: number | null
  cashCountedClosing?: number | null
  cashDrop?: number | null
  cashDifference?: number | null
}

function handoverRow(
  data: ShiftHandoverInput,
  section: string,
  item: string,
  value: CsvValue,
  note = '',
): CsvValue[] {
  return [data.date, data.locationName, data.zReportNumber, section, item, value, note]
}

function buildShiftHandoverRows(data: ShiftHandoverInput): CsvValue[][] {
  const rows: CsvValue[][] = [
    handoverRow(data, 'Tržby', 'Účtenek', data.saleCount),
    handoverRow(data, 'Tržby', 'Průměrný účet', data.avgSale),
    handoverRow(data, 'Tržby', 'Tržba celkem', data.total),
    handoverRow(data, 'Platby', 'Hotovost', data.cashTotal),
    handoverRow(data, 'Platby', 'Karta', data.cardTotal),
    handoverRow(data, 'Kontrola', 'Spropitné', data.tipTotal),
    handoverRow(data, 'Kontrola', 'Slevy', data.discountTotal),
    handoverRow(data, 'Kontrola', 'Stornovaných účtenek', data.cancelledCount),
    handoverRow(data, 'Kontrola', 'Hodnota storn', data.cancelledTotal),
  ]

  if (
    data.cashOpening != null ||
    data.cashPayIns != null ||
    data.cashPayOuts != null ||
    data.cashExpectedClosing != null ||
    data.cashCountedClosing != null ||
    data.cashDrop != null ||
    data.cashDifference != null
  ) {
    rows.push(
      handoverRow(data, 'Hotovost', 'Počáteční hotovost', amount(data.cashOpening)),
      handoverRow(data, 'Hotovost', 'Vklady do pokladny', amount(data.cashPayIns)),
      handoverRow(data, 'Hotovost', 'Výběry z pokladny', amount(data.cashPayOuts)),
      handoverRow(data, 'Hotovost', 'Očekávaná hotovost', amount(data.cashExpectedClosing)),
      handoverRow(data, 'Hotovost', 'Spočítaná hotovost', amount(data.cashCountedClosing)),
      handoverRow(data, 'Hotovost', 'Odvod hotovosti', amount(data.cashDrop)),
      handoverRow(data, 'Hotovost', 'Rozdíl hotovosti', amount(data.cashDifference)),
    )
  }

  rows.push(
    handoverRow(data, 'Checklist', 'Otevřené účty doplaceny nebo zrušeny', '', 'OK / ne'),
    handoverRow(data, 'Checklist', 'Hotovost přepočítána', '', 'OK / ne'),
    handoverRow(data, 'Checklist', 'Platební terminál zkontrolován', '', 'OK / ne'),
    handoverRow(data, 'Checklist', 'Storna a slevy zkontrolovány', '', 'OK / ne'),
    handoverRow(data, 'Checklist', 'Skladové výdeje a inventury zapsány', '', 'OK / ne'),
    handoverRow(data, 'Předání', 'Předal', '', ''),
    handoverRow(data, 'Předání', 'Převzal', '', ''),
    handoverRow(data, 'Předání', 'Poznámka', '', ''),
  )

  return rows
}

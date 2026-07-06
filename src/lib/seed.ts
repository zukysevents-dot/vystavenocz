/**
 * Seed demo dat do mock vrstvy (localStorage). Idempotentní — seedne jen při prázdné DB.
 * Slouží k vývoji UI bez backendu; po napojení API se odstraní.
 */
import { useApi } from '@/composables/useApi'
import {
  buildInvoiceNumber,
  calcLine,
  calcTotals,
  round2,
  variableSymbolFromInvoiceNumber,
} from '@/lib/invoice'
import type {
  Client,
  Invoice,
  InvoiceItem,
  Location,
  Sale,
  SupplierSnapshot,
  VatRate,
} from '@/lib/types'

const SUPPLIER: SupplierSnapshot = {
  companyName: 'Demo Dodavatel s.r.o.',
  fullName: 'Jan Novák',
  ico: '12345678',
  dic: 'CZ12345678',
  vatMode: 'payer',
  street: 'Hlavní 1',
  city: 'Praha',
  zip: '11000',
  country: 'CZ',
  bankAccount: '2702345678/2010',
  email: 'fakturace@demo.cz',
}

function makeItem(
  description: string,
  quantity: number,
  unit: string,
  unitPrice: number,
  vatRate: VatRate,
  vatPayer: boolean,
): InvoiceItem {
  const calc = calcLine({ quantity, unitPrice, vatRate }, vatPayer)
  return { id: crypto.randomUUID(), description, quantity, unit, unitPrice, vatRate, ...calc }
}

/**
 * Demo pobočky + prodeje s locationId — aby modul Konsolidace poboček ukázal reálná
 * čísla i v mock režimu (POS Sale jinak existují jen proti API). Pevná id poboček, ať na
 * ně prodeje můžou odkazovat. Idempotentní: seedne jen když jsou dané kolekce prázdné.
 */
async function seedLocationsAndSales(): Promise<void> {
  const locationsApi = useApi<Location>('locations')
  const salesApi = useApi<Sale>('sales')
  const now = new Date().toISOString()

  const locations: Location[] = [
    {
      id: 'loc-praha',
      name: 'Praha — Vinohrady',
      address: 'Korunní 12, Praha',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'loc-brno',
      name: 'Brno — střed',
      address: 'Masarykova 5, Brno',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'loc-ostrava',
      name: 'Ostrava',
      address: 'Stodolní 8, Ostrava',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
  if ((await locationsApi.list()).length === 0) {
    for (const l of locations) await locationsApi.create(l)
  }

  if ((await salesApi.list()).length === 0) {
    // Prodej vč. DPH 21 % → rozpad na net/vat; rozprostřené přes ~2 měsíce kvůli filtru období.
    const base = Date.now()
    // `net` je bez DPH; `total` = net + DPH + spropitné (jako reálný POS Sale).
    const makeSale = (locationId: string, revenue: number, daysAgo: number, tip = 0): Sale => {
      const net = round2(revenue / 1.21)
      const soldAt = new Date(base - daysAgo * 86_400_000).toISOString()
      return {
        id: crypto.randomUUID(),
        locationId,
        employeeId: null,
        paymentMethod: daysAgo % 2 === 0 ? 'Card' : 'Cash',
        status: 'Completed',
        discountPercent: 0,
        tipAmount: tip,
        cashReceived: null,
        cashChange: null,
        totalNet: net,
        totalVat: round2(revenue - net),
        total: round2(revenue + tip),
        soldAt,
        items: [],
      }
    }
    const demo: Sale[] = [
      makeSale('loc-praha', 2450, 2, 100),
      makeSale('loc-praha', 1890, 5),
      makeSale('loc-praha', 3200, 9, 200),
      makeSale('loc-praha', 1450, 34),
      makeSale('loc-brno', 1780, 3, 50),
      makeSale('loc-brno', 2100, 7),
      makeSale('loc-brno', 1320, 33),
      makeSale('loc-ostrava', 990, 4),
      makeSale('loc-ostrava', 1550, 8, 80),
      makeSale('loc-ostrava', 1240, 35),
    ]
    for (const s of demo) await salesApi.create(s)
  }
}

export async function seedMockData(): Promise<void> {
  const clientsApi = useApi<Client>('clients')
  const invoicesApi = useApi<Invoice>('invoices')

  // Pobočky + prodeje seedujeme nezávisle (mají vlastní prázdnostní kontrolu).
  await seedLocationsAndSales()

  if ((await clientsApi.list()).length > 0) return

  const now = new Date().toISOString()
  const clients: Client[] = [
    {
      id: crypto.randomUUID(),
      name: 'Acme s.r.o.',
      ico: '27604977',
      dic: 'CZ27604977',
      email: 'fakturace@acme.cz',
      phone: '+420 777 123 456',
      street: 'Náměstí 5',
      city: 'Brno',
      zip: '60200',
      country: 'CZ',
      defaultPaymentDays: 14,
      notes: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Jana Svobodová',
      ico: null,
      dic: null,
      email: 'jana@example.cz',
      phone: null,
      street: 'Zahradní 12',
      city: 'Plzeň',
      zip: '30100',
      country: 'CZ',
      defaultPaymentDays: 7,
      notes: 'Stálý klient',
      createdAt: now,
      updatedAt: now,
    },
  ]
  for (const c of clients) await clientsApi.create(c)

  const vatPayer = SUPPLIER.vatMode === 'payer'
  const today = new Date()
  const due = new Date(today)
  due.setDate(due.getDate() + 14)

  function buildInvoice(seq: number, client: Client, items: InvoiceItem[]): Invoice {
    const totals = calcTotals(items, vatPayer)
    const number = buildInvoiceNumber('FA', '{prefix}{year}{seq}', seq, today)
    return {
      id: crypto.randomUUID(),
      documentType: 'invoice',
      status: seq === 1 ? 'paid' : 'issued',
      invoiceNumber: number,
      clientId: client.id,
      clientSnapshot: {
        name: client.name,
        ico: client.ico,
        dic: client.dic,
        street: client.street,
        city: client.city,
        zip: client.zip,
        country: client.country,
        email: client.email,
      },
      supplierSnapshot: SUPPLIER,
      items,
      currency: 'CZK',
      issueDate: today.toISOString().slice(0, 10),
      dueDate: due.toISOString().slice(0, 10),
      taxableDate: today.toISOString().slice(0, 10),
      paidAt: seq === 1 ? now : null,
      variableSymbol: variableSymbolFromInvoiceNumber(number),
      constantSymbol: null,
      specificSymbol: null,
      paymentMethod: 'bank',
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      notes: null,
      createdAt: now,
      updatedAt: now,
    }
  }

  const invoices: Invoice[] = [
    buildInvoice(1, clients[0], [
      makeItem('Webové stránky — návrh a vývoj', 1, 'ks', 35000, 21, vatPayer),
      makeItem('Konzultace', 4, 'h', 1200, 21, vatPayer),
    ]),
    buildInvoice(2, clients[1], [makeItem('Grafický návrh loga', 1, 'ks', 8000, 21, vatPayer)]),
  ]
  for (const inv of invoices) await invoicesApi.create(inv)
}

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
import { computeNextRunDate } from '@/lib/recurring'
import type {
  Client,
  Employee,
  Invoice,
  InvoiceItem,
  Job,
  JobEvent,
  Location,
  RecurringInvoiceTemplate,
  Sale,
  ServiceItem,
  Shift,
  ShiftStatus,
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
        priceLevelId: null,
        priceLevelName: null,
        priceLevelAdjustmentPercent: null,
        customerId: null,
        redeemPoints: 0,
        redeemDiscount: 0,
        earnedPoints: 0,
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

/**
 * Demo zaměstnanci + směny (Workforce V2) — aby plánovač směn ukázal reálnou rotu i v mock
 * režimu. Váže se na pevnou pobočku `loc-praha`. Idempotentní: seedne jen když jsou prázdné.
 */
async function seedEmployeesAndShifts(): Promise<void> {
  const employeesApi = useApi<Employee>('employees')
  const shiftsApi = useApi<Shift>('shifts')

  const employees: Employee[] = [
    {
      id: 'emp-anna',
      fullName: 'Anna Nováková',
      userId: null,
      locationId: 'loc-praha',
      isActive: true,
      position: 'Servírka',
      hourlyRate: 170,
    },
    {
      id: 'emp-petr',
      fullName: 'Petr Dvořák',
      userId: null,
      locationId: 'loc-praha',
      isActive: true,
      position: 'Kuchař',
      hourlyRate: 210,
    },
    {
      id: 'emp-eva',
      fullName: 'Eva Králová',
      userId: null,
      locationId: 'loc-praha',
      isActive: true,
      position: 'Barmanka',
      hourlyRate: 180,
    },
  ]
  if ((await employeesApi.list()).length === 0) {
    for (const e of employees) await employeesApi.create(e)
  }

  if ((await shiftsApi.list()).length === 0) {
    // Pondělí aktuálního týdne (lokálně), ať směny padnou do zobrazeného týdne plánovače.
    const monday = new Date()
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const at = (dayOffset: number, hh: number): string => {
      const d = new Date(monday)
      d.setDate(d.getDate() + dayOffset)
      d.setHours(hh, 0, 0, 0)
      return d.toISOString()
    }
    const mk = (
      employeeId: string,
      dayOffset: number,
      startH: number,
      endH: number,
      status: ShiftStatus,
      position: string,
    ): Shift => ({
      id: crypto.randomUUID(),
      employeeId,
      locationId: 'loc-praha',
      startsAt: at(dayOffset, startH),
      endsAt: at(dayOffset, endH),
      status,
      position,
      hourlyRateOverride: null,
      note: null,
    })
    const demo: Shift[] = [
      mk('emp-anna', 0, 8, 16, 'Published', 'Servírka'),
      mk('emp-anna', 2, 8, 16, 'Published', 'Servírka'),
      mk('emp-petr', 0, 10, 22, 'Published', 'Kuchař'),
      mk('emp-petr', 3, 10, 22, 'Draft', 'Kuchař'),
      mk('emp-eva', 4, 16, 23, 'Draft', 'Barmanka'),
    ]
    for (const s of demo) await shiftsApi.create(s)
  }
}

/**
 * Demo ceník služeb + jedna zakázka s pracovním listem (Services & Jobs V2) — aby modul `jobs`
 * ukázal reálná data i v mock režimu. Pevná id, ať zakázka může odkázat na demo pobočku/technika.
 * Idempotentní: seedne jen když jsou dané kolekce prázdné.
 */
async function seedServicesAndJobs(): Promise<void> {
  const serviceItemsApi = useApi<ServiceItem>('service-items')
  const jobsApi = useApi<Job>('jobs')

  if ((await serviceItemsApi.list()).length === 0) {
    const services: ServiceItem[] = [
      {
        id: 'svc-montaz',
        name: 'Montážní práce',
        unit: 'h',
        unitPrice: 550,
        vatRate: 21,
        isActive: true,
      },
      {
        id: 'svc-servis',
        name: 'Servisní výjezd',
        unit: 'ks',
        unitPrice: 800,
        vatRate: 21,
        isActive: true,
      },
      {
        id: 'svc-revize',
        name: 'Revize a kontrola',
        unit: 'h',
        unitPrice: 650,
        vatRate: 21,
        isActive: true,
      },
    ]
    for (const s of services) await serviceItemsApi.create(s)
  }

  if ((await jobsApi.list()).length === 0) {
    const now = new Date()
    const iso = now.toISOString()
    const ev = (kind: string, detail: string, minutesAgo: number): JobEvent => ({
      id: crypto.randomUUID(),
      kind,
      detail,
      userId: null,
      createdAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    })
    const job: Job = {
      id: 'job-demo',
      number: `ZAK-${now.getFullYear()}-0001`,
      name: 'Oprava kotle — Novákovi',
      clientId: null,
      clientName: 'Jana Svobodová',
      siteAddress: 'Zahradní 12, Plzeň',
      status: 'in_progress',
      priority: 'high',
      scheduledAt: new Date(now.getTime() + 2 * 86_400_000).toISOString(),
      assignedEmployeeId: 'emp-petr',
      locationId: 'loc-praha',
      sourceQuoteId: null,
      invoiceId: null,
      note: 'Zákazník hlásí únik vody u ventilu.',
      createdAt: iso,
      updatedAt: iso,
      workItems: [
        {
          id: crypto.randomUUID(),
          serviceItemId: 'svc-servis',
          description: 'Servisní výjezd',
          quantity: 1,
          unitPrice: 800,
          vatRate: 21,
          sortOrder: 0,
        },
        {
          id: crypto.randomUUID(),
          serviceItemId: 'svc-montaz',
          description: 'Výměna ventilu',
          quantity: 1.5,
          unitPrice: 550,
          vatRate: 21,
          sortOrder: 1,
        },
      ],
      materialItems: [
        {
          id: crypto.randomUUID(),
          productId: 'prod-ventil',
          description: 'Kulový ventil 1/2"',
          quantity: 1,
          unitPrice: 240,
          vatRate: 21,
          sortOrder: 0,
        },
      ],
      checklist: [
        { id: crypto.randomUUID(), label: 'Uzavřít přívod vody', isDone: true, sortOrder: 0 },
        { id: crypto.randomUUID(), label: 'Otestovat těsnost spoje', isDone: false, sortOrder: 1 },
      ],
      events: [ev('created', 'Zakázka vytvořena', 180), ev('status', 'in_progress', 90)],
      handover: null,
    }
    await jobsApi.create(job)
  }
}

export async function seedMockData(): Promise<void> {
  const clientsApi = useApi<Client>('clients')
  const invoicesApi = useApi<Invoice>('invoices')

  // Pobočky + prodeje seedujeme nezávisle (mají vlastní prázdnostní kontrolu).
  await seedLocationsAndSales()
  // Zaměstnanci + směny pro plánovač (vlastní prázdnostní kontrola).
  await seedEmployeesAndShifts()
  // Ceník služeb + demo zakázka (vlastní prázdnostní kontrola).
  await seedServicesAndJobs()

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

  await seedRecurringTemplates(clients, now)
}

// Demo šablony opakovaných faktur (Opakované faktury V2) — 1 aktivní měsíční paušál (koncept ke kontrole)
// + 1 pozastavená s auto-vystavením. Navázané na demo klienty. Jen mock režim; součty/další běh dopočítá v ostrém API server.
async function seedRecurringTemplates(clients: Client[], now: string): Promise<void> {
  const recurringApi = useApi<RecurringInvoiceTemplate>('recurring-invoice-templates')
  if ((await recurringApi.list()).length > 0) return
  const todayISO = new Date().toISOString().slice(0, 10)

  const templates: RecurringInvoiceTemplate[] = [
    {
      id: crypto.randomUUID(),
      clientId: clients[0].id,
      clientName: clients[0].name,
      name: 'Měsíční paušál — správa webu',
      intervalMonths: 1,
      dayOfMonth: 1,
      dueDays: 14,
      autoIssue: false,
      status: 'active',
      note: 'Pravidelná měsíční fakturace správy a údržby webu.',
      nextRunDate: computeNextRunDate(todayISO, 1),
      lastRunAt: null,
      createdAt: now,
      updatedAt: now,
      items: [
        {
          id: crypto.randomUUID(),
          description: 'Správa a údržba webu',
          quantity: 1,
          unitPrice: 5000,
          vatRate: 21,
          unit: 'měsíc',
          sortOrder: 0,
        },
      ],
      runs: [],
    },
    {
      id: crypto.randomUUID(),
      clientId: clients[1].id,
      clientName: clients[1].name,
      name: 'Hosting a doména',
      intervalMonths: 1,
      dayOfMonth: 15,
      dueDays: 7,
      autoIssue: true,
      status: 'paused',
      note: null,
      nextRunDate: computeNextRunDate(todayISO, 15),
      lastRunAt: null,
      createdAt: now,
      updatedAt: now,
      items: [
        {
          id: crypto.randomUUID(),
          description: 'Webhosting',
          quantity: 1,
          unitPrice: 250,
          vatRate: 21,
          unit: 'měsíc',
          sortOrder: 0,
        },
      ],
      runs: [],
    },
  ]
  for (const t of templates) await recurringApi.create(t)
}

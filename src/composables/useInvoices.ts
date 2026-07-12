import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useInvoicesStore } from '@/stores/invoices'
import { calcTotals, creditNoteItems, toImportRequest } from '@/lib/invoice'
import {
  invoiceFromApi,
  invoiceToCreateRequest,
  invoiceToUpdateRequest,
  diffInvoiceLines,
  type InvoiceApiResponse,
  type InvoiceApiLine,
} from '@/lib/invoice-api'
import { http, isApiMode } from '@/lib/http'
import type { VatSummary } from '@/lib/dph'
import type { Invoice } from '@/lib/types'

const api = useApi<Invoice>('invoices')

/**
 * GAP 1 (jen API režim): synchronizuje řádky rozpracovaného konceptu proti backendu přes `/items`.
 * Backend PUT `/invoices/{id}` mění jen hlavičku — řádky se řeší tady. Bezpečné pořadí (draft nikdy
 * nespadne na 0 řádků a zachová se pořadí editoru):
 *   1) PUT existujících řádků (server id),
 *   2) POST nových PŘED mazáním (klientské uuid → přidělené server id z odpovědi),
 *   3) DELETE serverových řádků, které v editoru chybí,
 *   4) PUT reorder finální množinou server-id v pořadí editoru.
 * Vrací poslední plnou serverovou odpověď (nebo dotáhne `GET /invoices/{id}`).
 */
async function syncDraftLines(
  id: string,
  serverLines: InvoiceApiLine[],
  editorItems: Invoice['items'],
): Promise<InvoiceApiResponse> {
  const serverIds = serverLines.map((l) => l.id).filter((x): x is string => typeof x === 'string')
  const plan = diffInvoiceLines(serverIds, editorItems)

  // Mapování editor id → server id: existující řádky mapují na sebe, nové doplní POST odpovědi.
  const idMap = new Map<string, string>()
  for (const u of plan.updates) idMap.set(u.id, u.id)
  const knownIds = new Set(serverIds)

  let last: InvoiceApiResponse | null = null

  // 1) Úpravy existujících řádků.
  for (const u of plan.updates) {
    last = await http.put<InvoiceApiResponse>(`/invoices/${id}/items/${u.id}`, u.line)
  }
  // 2) Nové řádky PŘED mazáním — nový řádek nemá server id předem, vezmeme ho z POST odpovědi
  //    (řádek, jehož id ještě neznáme).
  for (const c of plan.creates) {
    const res = await http.post<InvoiceApiResponse>(`/invoices/${id}/items`, c.line)
    last = res
    const newId = (res.lines ?? [])
      .map((l) => l.id)
      .find((lid): lid is string => typeof lid === 'string' && !knownIds.has(lid))
    if (newId) {
      idMap.set(c.clientId, newId)
      knownIds.add(newId)
    }
  }
  // 3) Smazání řádků, které už v editoru nejsou (DELETE může vrátit 204 → neber ho jako čerstvý stav).
  for (const d of plan.deletes) {
    const res = await http.del<InvoiceApiResponse | undefined>(`/invoices/${id}/items/${d}`)
    if (res?.lines) last = res
  }

  // 4) Reorder pošli JEN když umíme složit celou cílovou množinu server-id (backend chce přesnou
  //    množinu). Kdyby se nepovedlo dohledat id nového řádku, radši nechat serverové pořadí.
  const orderedIds = plan.order
    .map((eid) => idMap.get(eid))
    .filter((x): x is string => typeof x === 'string')
  if (orderedIds.length > 0 && orderedIds.length === editorItems.length) {
    last = await http.put<InvoiceApiResponse>(`/invoices/${id}/items/reorder`, {
      itemIds: orderedIds,
    })
  }

  return last ?? (await http.get<InvoiceApiResponse>(`/invoices/${id}`))
}

export type InvoiceInput = Omit<
  Invoice,
  'id' | 'createdAt' | 'updatedAt' | 'subtotal' | 'vatTotal' | 'total'
>

/**
 * Číslo faktury už v evidenci existuje — účetní integrita zakazuje duplicitu.
 * Pouze mock režim: na serveru čísla přiděluje atomicky `/issue` (souběh → 409).
 */
export class DuplicateInvoiceNumberError extends Error {
  readonly invoiceNumber: string
  constructor(invoiceNumber: string) {
    super(`Faktura s číslem „${invoiceNumber}" už existuje.`)
    this.name = 'DuplicateInvoiceNumberError'
    this.invoiceNumber = invoiceNumber
  }
}

export function useInvoices() {
  const store = useInvoicesStore()
  const { invoices, loadError } = storeToRefs(store)

  // Zapíše čerstvý stav faktury (typicky ze serveru) do storu — insert nebo replace dle id.
  // Tím se ve store drží serverová pravda (id, číslo, součty, stav), ne klientská kopie.
  function upsert(inv: Invoice): Invoice {
    const idx = store.invoices.findIndex((i) => i.id === inv.id)
    if (idx === -1) store.invoices.push(inv)
    else store.invoices[idx] = inv
    return inv
  }

  async function load(): Promise<void> {
    store.loadError = false
    try {
      // API režim: list vrací backend DTO (summary) → přemapuj na FE Invoice.
      // Mock režim: localStorage už drží FE tvar, jde rovnou do storu.
      const raw = await api.list()
      store.invoices = isApiMode()
        ? (raw as unknown as InvoiceApiResponse[]).map(invoiceFromApi)
        : raw
    } catch (e) {
      // Výpadek serveru → prázdný seznam místo pádu appky, ale příznak chyby ať UI ukáže
      // „server nedostupný" (ne zavádějící „žádné faktury").
      console.warn('Načtení faktur selhalo:', e)
      store.invoices = []
      store.loadError = true
    }
  }

  async function create(input: InvoiceInput, vatPayer = true): Promise<Invoice> {
    if (isApiMode()) {
      // Server-driven: POST vytvoří KONCEPT (bez čísla); id i součty přidělí/spočítá server.
      // Číslo se přidělí až při `issue()`. Request i odpověď procházejí mapovacím adapterem
      // (FE `Invoice` ↔ backend DTO), ukládáme serverovou pravdu (ne klientský objekt).
      return upsert(
        invoiceFromApi(
          await http.post<InvoiceApiResponse>('/invoices', invoiceToCreateRequest(input)),
        ),
      )
    }

    // --- Mock localStorage (vývoj / e2e): klientské id, číslo i součty ---
    // Unikátnost čísla ověř proti ČERSTVÉMU stavu úložiště (ne in-memory store) —
    // zachytí i fakturu uloženou v jiném tabu, kde má store vlastní zastaralou kopii.
    const number = (input.invoiceNumber ?? '').trim()
    if (number) {
      const existing = await api.list()
      const clash = existing.some(
        (i) => (i.invoiceNumber ?? '').trim().toLowerCase() === number.toLowerCase(),
      )
      if (clash) throw new DuplicateInvoiceNumberError(number)
    }

    const totals = calcTotals(input.items, vatPayer)
    const now = new Date().toISOString()
    const invoice: Invoice = {
      ...input,
      id: crypto.randomUUID(),
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      createdAt: now,
      updatedAt: now,
    }
    await api.create(invoice)
    store.invoices.push(invoice)
    return invoice
  }

  async function update(id: string, input: InvoiceInput, vatPayer = true): Promise<Invoice> {
    if (isApiMode()) {
      // PUT je povolen jen na konceptu (jinak 409). Backend PUT mění JEN hlavičku dokladu →
      // řádky rozeditovaného konceptu se synchronizují zvlášť přes /items (GAP 1). Server dopočítá
      // součty a vrátí je v poslední odpovědi.
      const afterHeader = await http.put<InvoiceApiResponse>(
        `/invoices/${id}`,
        invoiceToUpdateRequest(input),
      )
      // Serverové řádky ber z PUT odpovědi; kdyby PUT vrátil jen hlavičku (bez `lines`), dotáhni je
      // z GET — jinak bychom existující řádky omylem zduplikovali jako „nové" (POST).
      const serverLines =
        afterHeader.lines ?? (await http.get<InvoiceApiResponse>(`/invoices/${id}`)).lines ?? []
      return upsert(invoiceFromApi(await syncDraftLines(id, serverLines, input.items)))
    }

    const totals = calcTotals(input.items, vatPayer)
    const updated = await api.update(id, {
      ...input,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      updatedAt: new Date().toISOString(),
    })
    const idx = store.invoices.findIndex((i) => i.id === id)
    if (idx !== -1) store.invoices[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await api.remove(id)
    store.invoices = store.invoices.filter((i) => i.id !== id)
  }

  // --- Životní cyklus: koncept → vystavená → uhrazená / stornovaná ---
  // V API režimu řídí přechody server (atomické přidělení čísla, validace stavu → 409).
  // V mock režimu přechod jen přepíše stav (číslo už koncept má z create()).

  function localTransition(id: string, patch: Partial<Invoice>): Promise<Invoice> {
    return api
      .update(id, { ...patch, updatedAt: new Date().toISOString() })
      .then((updated) => upsert(updated))
  }

  /** Vystaví fakturu — server přidělí číslo (Draft→Issued). */
  async function issue(id: string): Promise<Invoice> {
    if (isApiMode())
      return upsert(invoiceFromApi(await http.post<InvoiceApiResponse>(`/invoices/${id}/issue`)))
    return localTransition(id, { status: 'issued' })
  }

  /** Označí fakturu jako uhrazenou (Issued→Paid). */
  async function pay(id: string): Promise<Invoice> {
    // Backend nemá `/pay` — správný endpoint je `/mark-paid` a vyžaduje `idempotencyKey`
    // (ochrana proti dvojímu zaúčtování platby při retry/dvojkliku).
    if (isApiMode())
      return upsert(
        invoiceFromApi(
          await http.post<InvoiceApiResponse>(`/invoices/${id}/mark-paid`, {
            idempotencyKey: crypto.randomUUID(),
          }),
        ),
      )
    return localTransition(id, {
      status: 'paid',
      paidAt: getById(id)?.paidAt ?? new Date().toISOString(),
    })
  }

  /** Stornuje fakturu (Draft/Issued→Cancelled) — číslo zůstává. */
  async function cancel(id: string): Promise<Invoice> {
    if (isApiMode())
      return upsert(invoiceFromApi(await http.post<InvoiceApiResponse>(`/invoices/${id}/cancel`)))
    return localTransition(id, { status: 'cancelled' })
  }

  /**
   * Vystaví dobropis k faktuře (opravný doklad se záporným součtem).
   * API: `POST /invoices/{id}/credit-note` — server přepočítá znaménko DPH a přidělí číslo z řady dobropisů.
   * Mock: vytvoří koncept dobropisu ze zdrojové faktury (záporné položky), navázaný přes `parentInvoiceId`.
   */
  async function creditNote(id: string): Promise<Invoice> {
    // Ostrý režim: dobropis (záporné částky i DPH) vytváří SERVER z původní faktury; tělo neposíláme
    // (žádné záporné quantity — validator vyžaduje > 0), FE jen přemapuje serverovou zápornou odpověď
    // (znaménka zachová adapter).
    if (isApiMode())
      return upsert(
        invoiceFromApi(await http.post<InvoiceApiResponse>(`/invoices/${id}/credit-note`)),
      )
    // Mock stand-in za backend (dev/e2e): jen převrátí znaménko UŽ spočítaných serverových částek,
    // množství zůstává kladné. Žádný výpočet DPH na frontendu.
    const src = getById(id)
    if (!src) throw new Error('Zdrojová faktura nenalezena.')
    const now = new Date().toISOString()
    // Dobropis vzniká rovnou jako VYSTAVENÝ opravný daňový doklad (číslo z vlastní řady — v ostrém
    // režimu ho přiděluje backend; mock jen odvodí z původní faktury). Tak vstoupí do Účtárny i DPH.
    const note: Invoice = {
      ...src,
      id: crypto.randomUUID(),
      documentType: 'credit_note',
      parentInvoiceId: src.id,
      status: 'issued',
      invoiceNumber: `${src.invoiceNumber ?? 'DOB'}-D`,
      items: creditNoteItems(src.items),
      subtotal: -Math.abs(src.subtotal),
      vatTotal: -Math.abs(src.vatTotal),
      total: -Math.abs(src.total),
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await api.create(note)
    return upsert(note)
  }

  /**
   * Převede zálohovou (proforma) fakturu na daňový doklad (fakturu).
   * API: `POST /invoices/{id}/convert-to-invoice` — server přidělí číslo z řady faktur.
   * Mock: vytvoří novou fakturu se stejnými položkami, navázanou přes `parentInvoiceId`.
   */
  async function convertToInvoice(id: string): Promise<Invoice> {
    if (isApiMode())
      return upsert(
        invoiceFromApi(await http.post<InvoiceApiResponse>(`/invoices/${id}/convert-to-invoice`)),
      )
    const src = getById(id)
    if (!src) throw new Error('Zálohová faktura nenalezena.')
    const now = new Date().toISOString()
    const invoice: Invoice = {
      ...src,
      id: crypto.randomUUID(),
      documentType: 'invoice',
      parentInvoiceId: src.id,
      status: 'draft',
      invoiceNumber: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await api.create(invoice)
    return upsert(invoice)
  }

  /**
   * GAP 2: DPH přehled ze serveru (jen API režim). Server sčítá po sazbách za období (proforma
   * vyloučena, dobropis nettuje záporně) a vrací tvar shodný s `VatSummary` z dph.ts — FE peníze/DPH
   * nepočítá. Období: `from`/`to` (YYYY-MM-DD); bez nich = celá historie. Mock režim DphPage počítá
   * DPH client-side přes dph.ts a tuto metodu nevolá.
   */
  async function vatSummary(from?: string, to?: string): Promise<VatSummary> {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const query = qs.toString()
    return http.get<VatSummary>(`/invoices/vat-summary${query ? `?${query}` : ''}`)
  }

  function getById(id: string): Invoice | null {
    return store.invoices.find((i) => i.id === id) ?? null
  }

  /**
   * Načte JEDEN doklad se všemi detaily (položky, snapshoty, součty) a uloží ho do storu.
   * List (`load`) v API režimu vrací jen summary bez řádků — pro editaci/detail je potřeba
   * plný `GET /invoices/{id}`. API odpověď prochází adapterem; mock čte plný objekt z localStorage.
   */
  async function get(id: string): Promise<Invoice | null> {
    const raw = await api.get(id)
    if (!raw) return null
    return upsert(isApiMode() ? invoiceFromApi(raw as unknown as InvoiceApiResponse) : raw)
  }

  /**
   * Import historické faktury (migrace F9) — uloží doklad JAK JE přes `POST /invoices/import`.
   * Server nepřečísluje/nepřepočítá a je idempotentní dle čísla (existující → vrátí beze změny).
   * Mock režim (bez backendu) jen uloží fakturu do lokálního úložiště.
   */
  async function importInvoice(inv: Invoice): Promise<Invoice> {
    if (isApiMode())
      return upsert(
        invoiceFromApi(
          await http.post<InvoiceApiResponse>('/invoices/import', toImportRequest(inv)),
        ),
      )
    await api.create(inv)
    return upsert(inv)
  }

  return {
    invoices,
    loadError,
    load,
    create,
    update,
    remove,
    issue,
    pay,
    cancel,
    creditNote,
    convertToInvoice,
    get,
    getById,
    vatSummary,
    importInvoice,
  }
}

import { reactive } from 'vue'
import { useInvoices } from '@/composables/useInvoices'
import { useCompanyStore } from '@/stores/company'
import { calcTotals } from '@/lib/invoice'
import { useImportLedger } from '../useImportLedger'
import { parseFakturoidInvoices, type ParsedFakturoidInvoice } from './fakturoid-invoices'
import { supplierToCompanyPatch } from './supplier-profile'
import type { ImportBatch, ImportResult } from '../types'
import type { Invoice } from '@/lib/types'

export type InvoiceImportStep = 'upload' | 'preview' | 'result'

interface InvoiceRow extends ParsedFakturoidInvoice {
  duplicate: boolean
  decision: 'create' | 'skip'
}

/**
 * Flow importu historických faktur z Fakturoid XML. Na rozdíl od generického
 * (řádkového) wizardu jsou faktury hierarchické (hlavička + řádky), takže má
 * vlastní jednodušší tok: upload → náhled seznamu → commit přes
 * useInvoices.importHistorical (zachová číslo + stav) → audit/rollback.
 */
export function useInvoiceImport() {
  const invoicesApi = useInvoices()
  const companyStore = useCompanyStore()
  const ledger = useImportLedger()

  const state = reactive({
    step: 'upload' as InvoiceImportStep,
    fileName: '',
    rows: [] as InvoiceRow[],
    result: null as ImportResult | null,
    parsing: false,
    committing: false,
    progress: null as { done: number; total: number } | null,
  })

  async function pickFile(file: File): Promise<void> {
    state.parsing = true
    try {
      const parsed = parseFakturoidInvoices(await file.text())
      await invoicesApi.load()
      const existing = new Set(
        invoicesApi.invoices.value.map((i) => (i.invoiceNumber ?? '').toLowerCase()),
      )
      const seen = new Set<string>()
      state.rows = parsed.map((p) => {
        const num = (p.input.invoiceNumber ?? '').toLowerCase()
        const duplicate = !!num && (existing.has(num) || seen.has(num))
        if (num) seen.add(num)
        // Duplicita i varování (nesoulad částky / sazba DPH) → default přeskočit; uživatel může povolit.
        const decision: 'create' | 'skip' = duplicate || p.warnings.length > 0 ? 'skip' : 'create'
        return { ...p, duplicate, decision }
      })
      state.fileName = file.name
      state.step = 'preview'
    } finally {
      state.parsing = false
    }
  }

  async function commit(): Promise<void> {
    state.committing = true
    const createdIds: string[] = []
    const errors: { rowIndex: number; message: string }[] = []
    const counts = { created: 0, skipped: 0, failed: 0, overwritten: 0 }
    const actionable = state.rows.filter((r) => r.decision === 'create')
    state.progress = { done: 0, total: actionable.length }

    for (let i = 0; i < state.rows.length; i++) {
      const r = state.rows[i]
      if (r.decision === 'skip') {
        counts.skipped++
        continue
      }
      try {
        // Postav plnou fakturu (id + součty z calcTotals nad základem bez DPH) a předej
        // kolegovu importInvoice, který v API režimu volá /invoices/import přes toImportRequest.
        const totals = calcTotals(r.input.items, r.vatPayer)
        const now = new Date().toISOString()
        const invoice: Invoice = {
          ...r.input,
          id: crypto.randomUUID(),
          subtotal: totals.subtotal,
          vatTotal: totals.vatTotal,
          total: totals.total,
          createdAt: now,
          updatedAt: now,
        }
        const inv = await invoicesApi.importInvoice(invoice)
        createdIds.push(inv.id)
        counts.created++
      } catch (e) {
        counts.failed++
        errors.push({ rowIndex: i, message: e instanceof Error ? e.message : 'Neznámá chyba' })
      }
      if (state.progress) state.progress.done++
    }

    const batch: ImportBatch = {
      id: crypto.randomUUID(),
      source: 'Fakturoid',
      entity: 'invoices',
      adapterId: 'fakturoid-invoices',
      createdAt: new Date().toISOString(),
      createdIds,
      counts,
    }
    if (createdIds.length > 0) ledger.record(batch)
    state.result = { batch, errors }
    state.committing = false
    state.progress = null
    state.step = 'result'
  }

  /** Předvyplní profil firmy z dodavatele (your_*) první faktury — jen prázdná pole. */
  async function applySupplierToProfile(): Promise<number> {
    const supplier = state.rows[0]?.input.supplierSnapshot
    if (!supplier) return 0
    await companyStore.load()
    const patch = supplierToCompanyPatch(supplier, companyStore.company)
    const filled = Object.keys(patch).length
    if (filled > 0) await companyStore.save(patch)
    return filled
  }

  async function rollbackLast(): Promise<{ removed: number; failed: number }> {
    if (!state.result) return { removed: 0, failed: 0 }
    return ledger.rollback(state.result.batch.id, (id) => invoicesApi.remove(id))
  }

  function reset(): void {
    state.step = 'upload'
    state.fileName = ''
    state.rows = []
    state.result = null
    state.progress = null
  }

  return { state, pickFile, commit, applySupplierToProfile, rollbackLast, reset }
}

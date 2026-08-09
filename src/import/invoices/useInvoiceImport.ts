import { reactive } from 'vue'
import { useInvoices } from '@/composables/useInvoices'
import { useCompanyStore } from '@/stores/company'
import { buildInvoiceNumber, calcTotals } from '@/lib/invoice'
import { useImportLedger } from '../useImportLedger'
import { supplierToCompanyPatch } from './supplier-profile'
import { loadInvoiceFiles, type FileLoadError } from './load-invoice-files'
import { blockingIssues } from './import-guard'
import { inferSeriesFromNumbers, type SeriesSuggestion } from './invoice-series'
import type { ParsedImportedInvoice } from './types'
import type { ImportBatch, ImportResult } from '../types'
import type { Invoice } from '@/lib/types'

export type InvoiceImportStep = 'upload' | 'preview' | 'result'

interface InvoiceRow extends ParsedImportedInvoice {
  duplicate: boolean
  decision: 'create' | 'skip'
  /** Důvody, proč doklad server odmítne — prázdné pole = uložit jde. */
  blocking: string[]
}

/**
 * Flow importu historických faktur z jiného programu.
 *
 * Na rozdíl od generického (řádkového) wizardu jsou faktury hierarchické
 * (hlavička + řádky), takže má vlastní jednodušší tok: upload → náhled seznamu
 * → commit přes `useInvoices.importInvoice` (zachová číslo i stav) → audit/rollback.
 *
 * Vstupem je cokoli, co zákazník vyexportuje z původního programu — ISDOC,
 * Fakturoid XML, PDF nebo celý ZIP s dávkou. Po importu umí navázat firemní
 * číselnou řadu na poslední převzaté číslo, aby další faktura pokračovala.
 */
export function useInvoiceImport() {
  const invoicesApi = useInvoices()
  const companyStore = useCompanyStore()
  const ledger = useImportLedger()

  const state = reactive({
    step: 'upload' as InvoiceImportStep,
    fileName: '',
    rows: [] as InvoiceRow[],
    /** Soubory, které se načíst nepodařily — zbytek dávky kvůli nim nepadá. */
    fileErrors: [] as FileLoadError[],
    /** Návrh, jak nastavit číselnou řadu, aby navázala na import. */
    series: null as SeriesSuggestion | null,
    seriesApplied: false,
    result: null as ImportResult | null,
    parsing: false,
    committing: false,
    progress: null as { done: number; total: number } | null,
  })

  /** Číslo z firemní řady pro doklady, kde ho v originálu nenajdeme. */
  function makeFallbackNumbering(): () => string {
    const company = companyStore.company
    let seq = Number(company?.nextInvoiceSeq) || 1
    return () =>
      buildInvoiceNumber(
        company?.invoiceNumberPrefix || 'FA',
        company?.invoiceNumberFormat || '{prefix}-{year}-{seq}',
        seq++,
      )
  }

  async function pickFiles(files: File[]): Promise<void> {
    state.parsing = true
    try {
      await companyStore.load()
      const loaded = await loadInvoiceFiles(files, makeFallbackNumbering())

      await invoicesApi.load()
      const existing = new Set(
        invoicesApi.invoices.value.map((i) => (i.invoiceNumber ?? '').toLowerCase()),
      )
      const seen = new Set<string>()
      state.rows = loaded.invoices.map((p) => {
        const num = (p.input.invoiceNumber ?? '').toLowerCase()
        const duplicate = !!num && (existing.has(num) || seen.has(num))
        if (num) seen.add(num)
        // Chybějící povinné pole server odmítne — takový řádek se ani nenabídne.
        const blocking = blockingIssues(p)
        // Duplicita i varování (nesoulad částky / sazba DPH) → default přeskočit;
        // uživatel může povolit. U PDF je varování časté, proto je vidět v náhledu.
        const decision: 'create' | 'skip' =
          blocking.length || duplicate || p.warnings.length > 0 ? 'skip' : 'create'
        return { ...p, duplicate, decision, blocking }
      })

      state.fileErrors = loaded.errors
      state.fileName =
        files.length === 1
          ? files[0].name
          : `${files.length} souborů (${loaded.processedFiles} dokladů)`
      state.series = inferSeriesFromNumbers(
        loaded.invoices.map((p) => p.input.invoiceNumber ?? '').filter(Boolean),
      )
      state.seriesApplied = false
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
      source: 'Historické faktury',
      entity: 'invoices',
      adapterId: 'invoice-files',
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

  /**
   * Nastaví firemní číselnou řadu tak, aby příští vystavená faktura navázala
   * na poslední importovanou — kvůli tomu se historie většinou přenáší.
   */
  async function applySeries(): Promise<string | null> {
    const s = state.series
    if (!s) return null
    await companyStore.load()
    await companyStore.save({
      invoiceNumberPrefix: s.prefix || null,
      invoiceNumberFormat: s.format,
      nextInvoiceSeq: s.nextSeq,
    })
    state.seriesApplied = true
    return s.preview
  }

  /** Předvyplní profil firmy z dodavatele první faktury — jen prázdná pole. */
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
    state.fileErrors = []
    state.series = null
    state.seriesApplied = false
    state.result = null
    state.progress = null
  }

  return {
    state,
    pickFiles,
    commit,
    applySeries,
    applySupplierToProfile,
    rollbackLast,
    reset,
  }
}

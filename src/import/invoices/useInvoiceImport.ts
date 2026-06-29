import { reactive } from 'vue'
import { useInvoices } from '@/composables/useInvoices'
import { useImportLedger } from '../useImportLedger'
import { parseFakturoidInvoices, type ParsedFakturoidInvoice } from './fakturoid-invoices'
import type { ImportBatch, ImportResult } from '../types'

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
        return { ...p, duplicate, decision: duplicate ? 'skip' : 'create' }
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
        const inv = await invoicesApi.importHistorical(r.input, r.vatPayer)
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

  return { state, pickFile, commit, rollbackLast, reset }
}

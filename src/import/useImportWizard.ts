import { reactive } from 'vue'
import { useClients, type ClientInput } from '@/composables/useClients'
import { parseFile } from './parse/parseFile'
import { genericClients } from './adapters/generic-clients'
import { applyMapping } from './mapping'
import { detectDuplicates, type DedupKey } from './dedup'
import { validateClient, hasBlockingError } from './validate'
import { useImportLedger } from './useImportLedger'
import type { ColumnMapping, EntityDraft, ImportBatch, ImportResult, RawTable } from './types'

export type WizardStep = 'upload' | 'mapping' | 'preview' | 'result'

/** Cílové pole klienta pro mapování — pořadí i popisky pro UI. */
export interface ClientField {
  field: keyof ClientInput
  label: string
  required?: boolean
}

export const CLIENT_FIELDS: ClientField[] = [
  { field: 'name', label: 'Název / jméno', required: true },
  { field: 'ico', label: 'IČO' },
  { field: 'dic', label: 'DIČ' },
  { field: 'email', label: 'E-mail' },
  { field: 'phone', label: 'Telefon' },
  { field: 'street', label: 'Ulice' },
  { field: 'city', label: 'Město' },
  { field: 'zip', label: 'PSČ' },
  { field: 'country', label: 'Země' },
  { field: 'notes', label: 'Poznámka' },
]

const DEDUP_KEYS: DedupKey<ClientInput>[] = [
  { reason: 'ico', value: (c) => c.ico },
  { reason: 'email', value: (c) => c.email },
  { reason: 'name', value: (c) => c.name },
]

/**
 * Stav a logika import wizardu pro klienty. Pipeline: upload → mapování →
 * validace + duplicity → náhled → commit přes useClients → audit/ledger.
 * Zápis jde přes existující composable, takže funguje v mock i API režimu.
 */
export function useImportWizard() {
  const clientsApi = useClients()
  const ledger = useImportLedger()

  const state = reactive({
    step: 'upload' as WizardStep,
    fileName: '',
    rawTable: null as RawTable | null,
    mapping: {} as ColumnMapping,
    drafts: [] as EntityDraft<ClientInput>[],
    result: null as ImportResult | null,
    parsing: false,
    committing: false,
    progress: null as { done: number; total: number } | null,
  })

  async function pickFile(file: File): Promise<void> {
    state.parsing = true
    try {
      const table = await parseFile(file)
      state.fileName = file.name
      state.rawTable = table
      // Předvyplň mapování z adaptéru, ale jen sloupce, které soubor opravdu má.
      const mapping: ColumnMapping = {}
      for (const { field } of CLIENT_FIELDS) {
        const preset = genericClients.defaultMapping[field]
        mapping[field] = preset && table.headers.includes(preset) ? preset : null
      }
      state.mapping = mapping
      state.step = 'mapping'
    } finally {
      state.parsing = false
    }
  }

  function buildDrafts(): void {
    if (!state.rawTable) return
    const drafts = applyMapping(state.rawTable, state.mapping, genericClients)
    for (const d of drafts) {
      d.issues = validateClient(d.value)
      if (hasBlockingError(d.issues)) d.decision = 'skip'
    }
    detectDuplicates(drafts, clientsApi.clients.value, DEDUP_KEYS)
    state.drafts = drafts
  }

  async function goToPreview(): Promise<void> {
    // Načti aktuální klienty pro detekci duplicit proti existujícímu seznamu.
    await clientsApi.load()
    buildDrafts()
    state.step = 'preview'
  }

  async function commit(): Promise<void> {
    state.committing = true
    const createdIds: string[] = []
    const errors: { rowIndex: number; message: string }[] = []
    const counts = { created: 0, skipped: 0, failed: 0, overwritten: 0 }
    const actionable = state.drafts.filter(
      (d) => d.decision !== 'skip' && !hasBlockingError(d.issues),
    )
    state.progress = { done: 0, total: actionable.length }

    for (const draft of state.drafts) {
      if (draft.decision === 'skip' || hasBlockingError(draft.issues)) {
        counts.skipped++
        continue
      }
      try {
        if (draft.decision === 'overwrite' && draft.duplicate?.existingId) {
          await clientsApi.update(draft.duplicate.existingId, draft.value)
          counts.overwritten++
        } else {
          const created = await clientsApi.create(draft.value)
          createdIds.push(created.id)
          counts.created++
        }
      } catch (e) {
        counts.failed++
        errors.push({
          rowIndex: draft.rowIndex,
          message: e instanceof Error ? e.message : 'Neznámá chyba',
        })
      }
      if (state.progress) state.progress.done++
    }

    const batch: ImportBatch = {
      id: crypto.randomUUID(),
      source: genericClients.source,
      entity: 'clients',
      adapterId: genericClients.id,
      createdAt: new Date().toISOString(),
      createdIds,
      counts,
    }
    // Zapiš do ledgeru jen dávku s vytvořenými klienty — rollback maže právě je.
    if (createdIds.length > 0) ledger.record(batch)
    state.result = { batch, errors }
    state.committing = false
    state.progress = null
    state.step = 'result'
  }

  async function rollbackLast(): Promise<{ removed: number; failed: number }> {
    if (!state.result) return { removed: 0, failed: 0 }
    return ledger.rollback(state.result.batch.id, (id) => clientsApi.remove(id))
  }

  function reset(): void {
    state.step = 'upload'
    state.fileName = ''
    state.rawTable = null
    state.mapping = {}
    state.drafts = []
    state.result = null
    state.progress = null
  }

  return { state, buildDrafts, pickFile, goToPreview, commit, rollbackLast, reset }
}

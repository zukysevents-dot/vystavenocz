import { reactive } from 'vue'
import { parseFile } from './parse/parseFile'
import { applyMapping } from './mapping'
import { detectDuplicates } from './dedup'
import { hasBlockingError } from './validate'
import { useImportLedger } from './useImportLedger'
import type {
  ColumnMapping,
  EntityDraft,
  ImportBatch,
  ImportResult,
  ImportSourceAdapter,
  RawTable,
} from './types'
import type { ImportEntityConfig } from './configs'

export type WizardStep = 'upload' | 'mapping' | 'preview' | 'result'

interface WizardState<T> {
  step: WizardStep
  fileName: string
  sourceLabel: string
  rawTable: RawTable | null
  adapter: ImportSourceAdapter<T>
  mapping: ColumnMapping
  drafts: EntityDraft<T>[]
  result: ImportResult | null
  parsing: boolean
  committing: boolean
  progress: { done: number; total: number } | null
  enrichProgress: { done: number; total: number } | null
}

/**
 * Stav a logika import wizardu, řízené entity-configem (klienti, produkty, …).
 * Pipeline: upload → mapování → validace + duplicity → náhled → commit přes
 * config.createOps → audit/ledger. Zápis jde přes existující composable, takže
 * funguje v mock i API režimu. Přidání entity = nový config, beze změny wizardu.
 */
export function useImportWizard<T>(config: ImportEntityConfig<T>) {
  const ops = config.createOps()
  const enrich = config.createEnrich?.()
  const ledger = useImportLedger()

  const state = reactive({
    step: 'upload',
    fileName: '',
    sourceLabel: '',
    rawTable: null,
    adapter: config.genericAdapter,
    mapping: {},
    drafts: [],
    result: null,
    parsing: false,
    committing: false,
    progress: null,
    enrichProgress: null,
  }) as unknown as WizardState<T>

  async function pickFile(file: File): Promise<void> {
    state.parsing = true
    try {
      const table = await parseFile(file)
      state.fileName = file.name
      state.rawTable = table
      const adapter = config.detect(table.headers) ?? config.genericAdapter
      state.adapter = adapter
      state.sourceLabel = adapter.source
      // Předvyplň mapování z adaptéru, ale jen sloupce, které soubor opravdu má.
      const mapping: ColumnMapping = {}
      for (const { field } of config.fields) {
        const preset = adapter.defaultMapping[field]
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
    const drafts = applyMapping<T>(state.rawTable, state.mapping, state.adapter)
    for (const d of drafts) {
      d.issues = config.validate(d.value)
      if (hasBlockingError(d.issues)) d.decision = 'skip'
    }
    detectDuplicates(drafts, ops.items(), config.dedupKeys)
    state.drafts = drafts
  }

  async function goToPreview(): Promise<void> {
    await ops.load()
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
          await ops.update(draft.duplicate.existingId, draft.value)
          counts.overwritten++
        } else {
          const created = await ops.create(draft.value)
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
      source: state.adapter.source,
      entity: config.entity,
      adapterId: state.adapter.id,
      createdAt: new Date().toISOString(),
      createdIds,
      counts,
    }
    // Zapiš do ledgeru jen dávku s vytvořenými záznamy — rollback maže právě je.
    if (createdIds.length > 0) ledger.record(batch)
    state.result = { batch, errors }
    state.committing = false
    state.progress = null
    state.step = 'result'
  }

  /** Dávkově obohatí drafty (např. doplní adresy z ARES podle IČO) a převaliduje. */
  async function enrichAll(): Promise<{ enriched: number }> {
    if (!enrich) return { enriched: 0 }
    const targets = state.drafts.filter((d) => d.decision !== 'skip' && !hasBlockingError(d.issues))
    state.enrichProgress = { done: 0, total: targets.length }
    let enriched = 0
    for (const d of targets) {
      try {
        const patch = await enrich(d.value)
        if (patch) {
          Object.assign(d.value as object, patch)
          d.issues = config.validate(d.value)
          enriched++
        }
      } catch {
        /* selhání jednoho řádku nesmí shodit celou dávku */
      }
      if (state.enrichProgress) state.enrichProgress.done++
    }
    state.enrichProgress = null
    return { enriched }
  }

  async function rollbackLast(): Promise<{ removed: number; failed: number }> {
    if (!state.result) return { removed: 0, failed: 0 }
    return ledger.rollback(state.result.batch.id, (id) => ops.remove(id))
  }

  function reset(): void {
    state.step = 'upload'
    state.fileName = ''
    state.sourceLabel = ''
    state.rawTable = null
    state.adapter = config.genericAdapter
    state.mapping = {}
    state.drafts = []
    state.result = null
    state.progress = null
    state.enrichProgress = null
  }

  return {
    state,
    hasEnrich: !!enrich,
    enrichLabel: config.enrichLabel,
    pickFile,
    goToPreview,
    commit,
    enrichAll,
    rollbackLast,
    reset,
  }
}

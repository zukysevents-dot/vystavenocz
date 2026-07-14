const RECOVERY_PREFIX = 'vystaveno.invoice-editor.recovery.v1'
const RECOVERY_VERSION = 1
export const INVOICE_RECOVERY_TTL_MS = 24 * 60 * 60 * 1000

export interface InvoiceEditorRecovery<T> {
  version: typeof RECOVERY_VERSION
  savedAt: string
  draft: T
}

function keyPart(value: string | null | undefined, fallback: string): string {
  return encodeURIComponent(value?.trim() || fallback)
}

/**
 * Recovery is isolated by user, company and document. This prevents a draft from one tenant
 * appearing in another tenant after a company switch or when multiple documents are edited.
 */
export function invoiceEditorRecoveryKey(
  userId: string | null | undefined,
  companyId: string | null | undefined,
  invoiceId: string | null | undefined,
  editorSessionId: string,
): string {
  return [
    RECOVERY_PREFIX,
    keyPart(userId, 'anonymous'),
    keyPart(companyId, 'no-company'),
    keyPart(invoiceId, 'new'),
    keyPart(editorSessionId, 'session'),
  ].join(':')
}

export function loadInvoiceEditorRecovery<T>(
  storage: Storage,
  key: string,
  now = Date.now(),
): InvoiceEditorRecovery<T> | null {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<InvoiceEditorRecovery<T>>
    const savedAt = typeof parsed.savedAt === 'string' ? Date.parse(parsed.savedAt) : Number.NaN
    if (
      parsed.version !== RECOVERY_VERSION ||
      !parsed.draft ||
      typeof parsed.draft !== 'object' ||
      !Number.isFinite(savedAt) ||
      now - savedAt > INVOICE_RECOVERY_TTL_MS ||
      savedAt - now > 60_000
    ) {
      clearInvoiceEditorRecovery(storage, key)
      return null
    }

    return parsed as InvoiceEditorRecovery<T>
  } catch {
    clearInvoiceEditorRecovery(storage, key)
    return null
  }
}

export function saveInvoiceEditorRecovery<T>(
  storage: Storage,
  key: string,
  draft: T,
  now = new Date(),
): InvoiceEditorRecovery<T> | null {
  const recovery: InvoiceEditorRecovery<T> = {
    version: RECOVERY_VERSION,
    savedAt: now.toISOString(),
    draft,
  }
  try {
    storage.setItem(key, JSON.stringify(recovery))
    return recovery
  } catch {
    // Recovery must never block invoice editing (private mode/quota/security policy).
    return null
  }
}

export function clearInvoiceEditorRecovery(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // Best effort only; storage can be unavailable in private/restricted browser contexts.
  }
}

/**
 * Remove expired or unreadable editor checkpoints, including records whose tab-scoped
 * session id can no longer be discovered after a tab or browser crash.
 */
export function pruneInvoiceEditorRecoveries(storage: Storage, now = Date.now()): number {
  const keys: string[] = []
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(`${RECOVERY_PREFIX}:`)) keys.push(key)
    }
  } catch {
    return 0
  }

  let removed = 0
  for (const key of keys) {
    if (!loadInvoiceEditorRecovery(storage, key, now)) removed += 1
  }
  return removed
}

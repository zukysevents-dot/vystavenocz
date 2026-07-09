import { http, isApiMode } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'

// Ověřené podpisy dokumentů — samostatný add-on modul. Provider-neutral: BankID je jen JEDEN z možných kanálů/providerů,
// ne jediná technologie. Backend kontrakt `/api/v1/verified-signing/*` staví Codex paralelně; tady je frontend foundation
// připravená na napojení bez přepisování. V mock režimu běží na lokálních demo datech.

export type SignatureEnvelopeStatus =
  | 'draft'
  | 'ready'
  | 'sent'
  | 'signed'
  | 'rejected'
  | 'cancelled'
  | 'expired'

export interface SignatureSigner {
  name: string
  email: string | null
  phone: string | null
}

// Podpisová obálka jednoho dokumentu. `provider` je neutrální klíč kanálu (např. 'bankid'), `providerLabel` je
// zobrazovaný název. `evidenceHash` je otisk dokumentu v evidenci (tamper-evidence), ne tvrzení o právním účinku.
export interface SignatureEnvelope {
  id: string
  documentName: string
  documentType: string | null
  externalReference: string | null
  status: SignatureEnvelopeStatus
  provider: string
  providerLabel: string | null
  signer: SignatureSigner
  evidenceHash: string | null
  createdAt: string
  sentAt: string | null
  signedAt: string | null
  expiresAt: string | null
}

export interface CreateSignatureEnvelopeInput {
  documentName: string
  documentType?: string | null
  externalReference?: string | null
  provider: string
  signer: SignatureSigner
  expiresAt?: string | null
}

// Evidence / audit trail obálky (provider-neutral). Každý krok má čas, událost a volitelně hash.
export interface SignatureEvidenceEntry {
  timestamp: string
  event: string
  detail: string | null
  hash: string | null
}

export interface SignatureEvidence {
  envelopeId: string
  documentName: string
  evidenceHash: string | null
  provider: string
  entries: SignatureEvidenceEntry[]
}

// --- Nastavení poskytovatelů podpisů (provider katalog + konfigurace + credential trezor) ---
// Analogie k payment provider credential vault, ale pro modul verified_signing. Backend (Codex) je jediný zdroj pravdy
// o tom, co je reálně napojené (`isOperational`); UI nikdy netvrdí, že ostrý podpis přes BankID už funguje.

export type SigningConnectionMode = 'sandbox' | 'production'
export type SigningConnectionStatus = 'draft' | 'awaiting_credentials' | 'ready' | 'disabled'

// Provider ověřených podpisů z katalogu. `credentialFields` (sufix `Ref`) jsou tajemství → patří do trezoru, ne do
// checklistu `configuredFields`. Mock = testovací poskytovatel bez credentialů; BankID = připravený cíl adaptéru.
export interface SigningProviderCatalogItem {
  key: string
  name: string
  category: string
  status: string
  isOperational: boolean
  requiresPartnerContract: boolean
  requiresCredentials: boolean
  setupFields: string[]
  credentialFields: string[]
  notes: string
}

// Konfigurace napojení poskytovatele. NIKDY nenese tajné hodnoty — jen metadata a checklist připravených setup polí.
export interface SigningProviderConnection {
  id: string
  providerKey: string
  name: string
  mode: SigningConnectionMode
  status: SigningConnectionStatus
  configuredFields: string[]
  requiredCredentialFields?: string[]
  storedCredentialFields?: string[]
  createdAt: string
  updatedAt: string
}

export interface UpsertSigningProviderConnectionRequest {
  providerKey: string
  name: string
  mode: SigningConnectionMode
  status: SigningConnectionStatus
  configuredFields?: string[]
}

// Stav jednoho credential pole v trezoru — NIKDY hodnota, jen jestli je klíč uložený a odkdy.
export interface SigningSecretFieldStatus {
  fieldName: string
  required: boolean
  hasSecret: boolean
  updatedAt: string | null
}

export interface SigningSecretsStatus {
  connectionId: string
  providerKey: string
  fields: SigningSecretFieldStatus[]
  allRequiredPresent: boolean
}

// Provider-neutral číselník kanálů pro UI (foundation). Backend později dodá skutečný katalog přes provider kontrakt —
// BankID je jen jeden z kanálů, ne výchozí jediná technologie.
export const SIGNATURE_PROVIDERS: { key: string; label: string }[] = [
  { key: 'bankid', label: 'BankID' },
  { key: 'manual', label: 'Ruční ověření' },
]

export const SIGNATURE_DOCUMENT_TYPES: { key: string; label: string }[] = [
  { key: 'contract', label: 'Smlouva' },
  { key: 'handover', label: 'Předávací protokol' },
  { key: 'agreement', label: 'Dohoda' },
  { key: 'order', label: 'Objednávka' },
  { key: 'offer', label: 'Nabídka' },
  { key: 'other', label: 'Ostatní' },
]

const STORAGE_KEY = 'vystaveno:signing-envelopes'

export function useVerifiedSigning() {
  async function listEnvelopes(
    status?: SignatureEnvelopeStatus | null,
  ): Promise<SignatureEnvelope[]> {
    if (!isApiMode()) {
      const all = readMockEnvelopes()
      return status ? all.filter((e) => e.status === status) : all
    }
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    const res = await http.get<SignatureEnvelope[] | PagedResult<SignatureEnvelope>>(
      `/verified-signing/envelopes${query}`,
    )
    return Array.isArray(res) ? res : res.items
  }

  async function getEnvelope(id: string): Promise<SignatureEnvelope> {
    if (!isApiMode()) {
      const found = readMockEnvelopes().find((e) => e.id === id)
      if (!found) throw new Error('Podpisová obálka nenalezena.')
      return found
    }
    return http.get<SignatureEnvelope>(`/verified-signing/envelopes/${id}`)
  }

  async function createEnvelope(input: CreateSignatureEnvelopeInput): Promise<SignatureEnvelope> {
    if (!isApiMode()) return createMockEnvelope(input)
    return http.post<SignatureEnvelope>('/verified-signing/envelopes', input)
  }

  async function sendEnvelope(id: string): Promise<SignatureEnvelope> {
    if (!isApiMode()) return transitionMockEnvelope(id, 'sent')
    return http.post<SignatureEnvelope>(`/verified-signing/envelopes/${id}/send`, {})
  }

  async function cancelEnvelope(id: string): Promise<SignatureEnvelope> {
    if (!isApiMode()) return transitionMockEnvelope(id, 'cancelled')
    return http.post<SignatureEnvelope>(`/verified-signing/envelopes/${id}/cancel`, {})
  }

  async function getEvidence(id: string): Promise<SignatureEvidence> {
    if (!isApiMode()) return buildMockEvidence(id)
    return http.get<SignatureEvidence>(`/verified-signing/envelopes/${id}/evidence`)
  }

  // --- Nastavení poskytovatelů (jen API režim; mock/dev ukáže v UI poznámku) ---
  // Provider katalog + konfigurace + credential trezor. Vault nikdy nevrací hodnoty (jen stav polí).

  function listSigningProviders(): Promise<SigningProviderCatalogItem[]> {
    return normalizeList(
      http.get<SigningProviderCatalogItem[] | PagedResult<SigningProviderCatalogItem>>(
        '/verified-signing/providers',
      ),
    )
  }

  function listProviderConnections(): Promise<SigningProviderConnection[]> {
    return normalizeList(
      http.get<SigningProviderConnection[] | PagedResult<SigningProviderConnection>>(
        '/verified-signing/provider-connections',
      ),
    )
  }

  function getProviderConnection(id: string): Promise<SigningProviderConnection> {
    return http.get<SigningProviderConnection>(`/verified-signing/provider-connections/${id}`)
  }

  function createProviderConnection(
    request: UpsertSigningProviderConnectionRequest,
  ): Promise<SigningProviderConnection> {
    return http.post<SigningProviderConnection>('/verified-signing/provider-connections', request)
  }

  function updateProviderConnection(
    id: string,
    request: UpsertSigningProviderConnectionRequest,
  ): Promise<SigningProviderConnection> {
    return http.put<SigningProviderConnection>(
      `/verified-signing/provider-connections/${id}`,
      request,
    )
  }

  function deleteProviderConnection(id: string): Promise<void> {
    return http.del(`/verified-signing/provider-connections/${id}`)
  }

  // Credential trezor konfigurace: čtení vrací JEN stav polí, zápis posílá raw hodnotu jednorázově (backend ji
  // zašifruje a už nikdy nevrací), mazání/revoke degraduje konfiguraci (Ready → čeká na údaje řeší UI/backend).
  function listConnectionSecrets(connectionId: string): Promise<SigningSecretsStatus> {
    return http.get<SigningSecretsStatus>(
      `/verified-signing/provider-connections/${connectionId}/secrets`,
    )
  }

  function storeConnectionSecret(
    connectionId: string,
    field: string,
    value: string,
  ): Promise<SigningSecretsStatus> {
    return http.put<SigningSecretsStatus>(
      `/verified-signing/provider-connections/${connectionId}/secrets/${encodeURIComponent(field)}`,
      { value },
    )
  }

  function deleteConnectionSecret(connectionId: string, field: string): Promise<void> {
    return http.del(
      `/verified-signing/provider-connections/${connectionId}/secrets/${encodeURIComponent(field)}`,
    )
  }

  function revokeConnectionSecrets(connectionId: string): Promise<void> {
    return http.del(`/verified-signing/provider-connections/${connectionId}/secrets`)
  }

  return {
    listEnvelopes,
    getEnvelope,
    createEnvelope,
    sendEnvelope,
    cancelEnvelope,
    getEvidence,
    listSigningProviders,
    listProviderConnections,
    getProviderConnection,
    createProviderConnection,
    updateProviderConnection,
    deleteProviderConnection,
    listConnectionSecrets,
    storeConnectionSecret,
    deleteConnectionSecret,
    revokeConnectionSecrets,
  }
}

// Backend může vracet pole nebo stránkovaný výsledek — normalizujeme na pole.
async function normalizeList<T>(promise: Promise<T[] | PagedResult<T>>): Promise<T[]> {
  const res = await promise
  return Array.isArray(res) ? res : res.items
}

// ---- Mock režim (lokální demo data) ----

function providerLabelFor(key: string): string {
  return SIGNATURE_PROVIDERS.find((p) => p.key === key)?.label ?? key
}

function readMockEnvelopes(): SignatureEnvelope[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as SignatureEnvelope[]
  } catch {
    // poškozený obsah → přepíšeme seedem
  }
  const seed = defaultEnvelopes()
  writeMockEnvelopes(seed)
  return seed
}

function writeMockEnvelopes(items: SignatureEnvelope[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function createMockEnvelope(input: CreateSignatureEnvelopeInput): SignatureEnvelope {
  const items = readMockEnvelopes()
  const id = crypto.randomUUID()
  const envelope: SignatureEnvelope = {
    id,
    documentName: input.documentName,
    documentType: input.documentType ?? null,
    externalReference: input.externalReference ?? null,
    status: 'draft',
    provider: input.provider,
    providerLabel: providerLabelFor(input.provider),
    signer: input.signer,
    evidenceHash: mockEvidenceHash(id),
    createdAt: new Date().toISOString(),
    sentAt: null,
    signedAt: null,
    expiresAt: input.expiresAt ?? null,
  }
  writeMockEnvelopes([envelope, ...items])
  return envelope
}

function transitionMockEnvelope(id: string, to: SignatureEnvelopeStatus): SignatureEnvelope {
  const items = readMockEnvelopes()
  const envelope = items.find((e) => e.id === id)
  if (!envelope) throw new Error('Podpisová obálka nenalezena.')
  envelope.status = to
  if (to === 'sent' && !envelope.sentAt) envelope.sentAt = new Date().toISOString()
  writeMockEnvelopes(items)
  return envelope
}

function buildMockEvidence(id: string): SignatureEvidence {
  const envelope = readMockEnvelopes().find((e) => e.id === id)
  if (!envelope) throw new Error('Podpisová obálka nenalezena.')
  const entries: SignatureEvidenceEntry[] = [
    {
      timestamp: envelope.createdAt,
      event: 'created',
      detail: 'Obálka vytvořena',
      hash: envelope.evidenceHash,
    },
  ]
  if (envelope.sentAt)
    entries.push({
      timestamp: envelope.sentAt,
      event: 'sent',
      detail: `Odesláno k ověřenému podpisu (${envelope.providerLabel ?? envelope.provider})`,
      hash: mockEvidenceHash(`${id}:sent`),
    })
  if (envelope.signedAt)
    entries.push({
      timestamp: envelope.signedAt,
      event: 'signed',
      detail: 'Ověřený podpis přijat od poskytovatele',
      hash: mockEvidenceHash(`${id}:signed`),
    })
  return {
    envelopeId: envelope.id,
    documentName: envelope.documentName,
    evidenceHash: envelope.evidenceHash,
    provider: envelope.provider,
    entries,
  }
}

// Deterministický 64-hex „hash" pro demo (ne kryptografický) — stabilní per seed, aby se evidence neměnila mezi čteními.
function mockEvidenceHash(seed: string): string {
  let h = 2166136261
  const out: string[] = []
  for (let i = 0; i < 64; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i
    h = Math.imul(h, 16777619) >>> 0
    out.push((h & 0xf).toString(16))
  }
  return out.join('')
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

// Realistická demo data, aby stránka nevypadala prázdně: catering, předávací protokol, dohoda, objednávka služby.
function defaultEnvelopes(): SignatureEnvelope[] {
  return [
    {
      id: 'env-catering',
      documentName: 'Smlouva o cateringu — Letní firemní akce',
      documentType: 'contract',
      externalReference: 'ORDER-2026-0142',
      status: 'signed',
      provider: 'bankid',
      providerLabel: 'BankID',
      signer: { name: 'Jan Novák', email: 'jan.novak@example.cz', phone: '+420 601 234 567' },
      evidenceHash: mockEvidenceHash('env-catering'),
      createdAt: daysAgo(9),
      sentAt: daysAgo(8),
      signedAt: daysAgo(7),
      expiresAt: null,
    },
    {
      id: 'env-handover',
      documentName: 'Předávací protokol — Vybavení kuchyně',
      documentType: 'handover',
      externalReference: 'JOB-2026-0031',
      status: 'sent',
      provider: 'bankid',
      providerLabel: 'BankID',
      signer: { name: 'Petra Svobodová', email: 'petra.svobodova@example.cz', phone: null },
      evidenceHash: mockEvidenceHash('env-handover'),
      createdAt: daysAgo(2),
      sentAt: daysAgo(1),
      signedAt: null,
      expiresAt: daysFromNow(5),
    },
    {
      id: 'env-agreement',
      documentName: 'Pracovní dohoda (DPP) — Brigádník výpomoc',
      documentType: 'agreement',
      externalReference: null,
      status: 'ready',
      provider: 'bankid',
      providerLabel: 'BankID',
      signer: { name: 'Tomáš Dvořák', email: 'tomas.dvorak@example.cz', phone: '+420 776 112 233' },
      evidenceHash: mockEvidenceHash('env-agreement'),
      createdAt: daysAgo(1),
      sentAt: null,
      signedAt: null,
      expiresAt: null,
    },
    {
      id: 'env-order',
      documentName: 'Objednávka služby — Pravidelný úklid',
      documentType: 'order',
      externalReference: 'ORDER-2026-0157',
      status: 'rejected',
      provider: 'manual',
      providerLabel: 'Ruční ověření',
      signer: { name: 'Eva Marková', email: 'eva.markova@example.cz', phone: null },
      evidenceHash: mockEvidenceHash('env-order'),
      createdAt: daysAgo(5),
      sentAt: daysAgo(4),
      signedAt: null,
      expiresAt: null,
    },
  ]
}

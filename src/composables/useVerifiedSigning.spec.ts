import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVerifiedSigning } from '@/composables/useVerifiedSigning'
import { http, isApiMode } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), download: vi.fn() },
  isApiMode: vi.fn(() => true),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isApiMode).mockReturnValue(true)
  localStorage.clear()
})

// Backendové DTO obálky (ploché SignerName/ProviderKey/Title, enum PascalCase) — FE adapter je mapuje na FE tvar.
const apiEnvelope = {
  id: 'e1',
  status: 'Sent',
  title: 'Smlouva o dílo',
  documentHash: 'a'.repeat(64),
  signerName: 'Jan Novák',
  signerEmail: 'jan@example.cz',
  signerPhone: null,
  providerKey: 'bankid',
  providerReference: 'ref-1',
  documentType: 'contract',
  externalReference: 'ORDER-1',
  createdAt: '2026-01-01T00:00:00Z',
  sentAt: '2026-01-02T00:00:00Z',
  signedAt: null,
  expiresAt: null,
}

describe('useVerifiedSigning — API kontrakt /verified-signing/*', () => {
  it('listEnvelopes volá výpis obálek', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useVerifiedSigning().listEnvelopes()
    expect(http.get).toHaveBeenCalledWith('/verified-signing/envelopes')
  })

  it('listEnvelopes přidá filtr stavu do query', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useVerifiedSigning().listEnvelopes('sent')
    expect(http.get).toHaveBeenCalledWith('/verified-signing/envelopes?status=sent')
  })

  it('listEnvelopes mapuje stránkované backend DTO na FE tvar (signer, provider, lowercase stav)', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [apiEnvelope], total: 1 } as never)
    const result = await useVerifiedSigning().listEnvelopes()
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'e1',
      documentName: 'Smlouva o dílo',
      status: 'sent',
      provider: 'bankid',
      signer: { name: 'Jan Novák', email: 'jan@example.cz', phone: null },
      evidenceHash: 'a'.repeat(64),
      providerReference: 'ref-1',
    })
  })

  it('getEnvelope volá detail obálky a mapuje DTO', async () => {
    vi.mocked(http.get).mockResolvedValue(apiEnvelope as never)
    const envelope = await useVerifiedSigning().getEnvelope('e1')
    expect(http.get).toHaveBeenCalledWith('/verified-signing/envelopes/e1')
    expect(envelope.signer.name).toBe('Jan Novák')
    expect(envelope.status).toBe('sent')
  })

  it('createEnvelope překládá FE input na backend payload (title/signerName/providerKey/documentHash)', async () => {
    vi.mocked(http.post).mockResolvedValue(apiEnvelope as never)
    await useVerifiedSigning().createEnvelope({
      documentName: 'Smlouva',
      documentType: 'contract',
      externalReference: 'ORDER-1',
      provider: 'bankid',
      signer: { name: 'Jan Novák', email: null, phone: null },
      expiresAt: null,
      documentHash: 'b'.repeat(64),
    })
    expect(http.post).toHaveBeenCalledWith('/verified-signing/envelopes', {
      title: 'Smlouva',
      documentHash: 'b'.repeat(64),
      documentType: 'contract',
      externalReference: 'ORDER-1',
      providerKey: 'bankid',
      signerName: 'Jan Novák',
      signerEmail: null,
      signerPhone: null,
      expiresAt: null,
    })
  })

  it('sendEnvelope bez konfigurace posílá prázdné tělo (foundation odeslání)', async () => {
    vi.mocked(http.post).mockResolvedValue(apiEnvelope as never)
    await useVerifiedSigning().sendEnvelope('e1')
    expect(http.post).toHaveBeenCalledWith('/verified-signing/envelopes/e1/send', {})
  })

  it('sendEnvelope s providerConnectionId nasměruje odeslání přes konfiguraci', async () => {
    vi.mocked(http.post).mockResolvedValue(apiEnvelope as never)
    await useVerifiedSigning().sendEnvelope('e1', 'conn-9')
    expect(http.post).toHaveBeenCalledWith('/verified-signing/envelopes/e1/send', {
      providerConnectionId: 'conn-9',
    })
  })

  it('cancelEnvelope volá cancel akci', async () => {
    vi.mocked(http.post).mockResolvedValue(apiEnvelope as never)
    await useVerifiedSigning().cancelEnvelope('e1')
    expect(http.post).toHaveBeenCalledWith('/verified-signing/envelopes/e1/cancel', {})
  })

  it('getEvidence mapuje backend events na FE entries', async () => {
    vi.mocked(http.get).mockResolvedValue({
      envelopeId: 'e1',
      title: 'Smlouva o dílo',
      documentHash: 'a'.repeat(64),
      providerKey: 'bankid',
      events: [
        { type: 'Created', note: null, evidenceHash: null, createdAt: '2026-01-01T00:00:00Z' },
      ],
    } as never)
    const evidence = await useVerifiedSigning().getEvidence('e1')
    expect(evidence.documentName).toBe('Smlouva o dílo')
    expect(evidence.entries).toEqual([
      { timestamp: '2026-01-01T00:00:00Z', event: 'Created', detail: null, hash: null },
    ])
  })

  it('getEvidence volá evidence obálky', async () => {
    vi.mocked(http.get).mockResolvedValue({ entries: [] } as never)
    await useVerifiedSigning().getEvidence('e1')
    expect(http.get).toHaveBeenCalledWith('/verified-signing/envelopes/e1/evidence')
  })
})

describe('useVerifiedSigning — mock režim (demo data)', () => {
  beforeEach(() => vi.mocked(isApiMode).mockReturnValue(false))

  it('bez API vrací realistická demo data a nevolá HTTP', async () => {
    const envelopes = await useVerifiedSigning().listEnvelopes()
    expect(http.get).not.toHaveBeenCalled()
    expect(envelopes.length).toBe(4)
    expect(envelopes.some((e) => e.documentName.includes('cateringu'))).toBe(true)
    expect(envelopes.map((e) => e.status)).toEqual(
      expect.arrayContaining(['signed', 'sent', 'ready', 'rejected']),
    )
  })

  it('mock send obálku přepne na Odesláno a doplní sentAt', async () => {
    const signing = useVerifiedSigning()
    const updated = await signing.sendEnvelope('env-agreement')
    expect(updated.status).toBe('sent')
    expect(updated.sentAt).not.toBeNull()
    expect(updated.providerReference ?? null).toBeNull() // foundation odeslání = bez reference
  })

  it('mock send přes konfiguraci doplní referenci poskytovatele', async () => {
    const signing = useVerifiedSigning()
    const updated = await signing.sendEnvelope('env-agreement', 'conn-mock')
    expect(updated.status).toBe('sent')
    expect(updated.providerReference).toBeTruthy()
  })

  it('mock createEnvelope založí novou obálku ve stavu draft', async () => {
    const signing = useVerifiedSigning()
    const created = await signing.createEnvelope({
      documentName: 'Nová smlouva',
      provider: 'bankid',
      signer: { name: 'Test Osoba', email: null, phone: null },
    })
    expect(created.status).toBe('draft')
    expect(created.evidenceHash).toHaveLength(64)
    const all = await signing.listEnvelopes()
    expect(all.some((e) => e.id === created.id)).toBe(true)
  })
})

describe('useVerifiedSigning — nastavení poskytovatelů + credential trezor', () => {
  it('listSigningProviders volá katalog poskytovatelů', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useVerifiedSigning().listSigningProviders()
    expect(http.get).toHaveBeenCalledWith('/verified-signing/providers')
  })

  it('listSigningProviders umí i stránkovanou odpověď', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [{ key: 'bankid' }], total: 1 } as never)
    const result = await useVerifiedSigning().listSigningProviders()
    expect(result).toEqual([{ key: 'bankid' }])
  })

  it('listProviderConnections volá výpis konfigurací', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useVerifiedSigning().listProviderConnections()
    expect(http.get).toHaveBeenCalledWith('/verified-signing/provider-connections')
  })

  it('getProviderConnection mapuje backend DTO (displayName → name, WaitingForCredentials → awaiting_credentials)', async () => {
    vi.mocked(http.get).mockResolvedValue({
      id: 'c1',
      providerKey: 'bankid',
      displayName: 'BankID produkce',
      mode: 'Production',
      status: 'WaitingForCredentials',
      configuredFields: ['clientId'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    } as never)
    const connection = await useVerifiedSigning().getProviderConnection('c1')
    expect(http.get).toHaveBeenCalledWith('/verified-signing/provider-connections/c1')
    expect(connection).toMatchObject({
      name: 'BankID produkce',
      mode: 'production',
      status: 'awaiting_credentials',
    })
  })

  it('createProviderConnection překládá FE payload na backend tvar (bez tajných hodnot)', async () => {
    vi.mocked(http.post).mockResolvedValue({
      id: 'c1',
      providerKey: 'bankid',
      displayName: 'BankID produkce',
      mode: 'Production',
      status: 'WaitingForCredentials',
      configuredFields: ['clientId'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    } as never)
    await useVerifiedSigning().createProviderConnection({
      providerKey: 'bankid',
      name: 'BankID produkce',
      mode: 'production',
      status: 'awaiting_credentials',
      configuredFields: ['clientId'],
    })
    expect(http.post).toHaveBeenCalledWith('/verified-signing/provider-connections', {
      providerKey: 'bankid',
      displayName: 'BankID produkce',
      mode: 'production',
      status: 'WaitingForCredentials',
      configuredFields: ['clientId'],
    })
  })

  it('updateProviderConnection volá PUT s id konfigurace a backend tvarem', async () => {
    vi.mocked(http.put).mockResolvedValue({
      id: 'c1',
      providerKey: 'bankid',
      displayName: 'BankID',
      mode: 'Sandbox',
      status: 'Ready',
      configuredFields: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    } as never)
    await useVerifiedSigning().updateProviderConnection('c1', {
      providerKey: 'bankid',
      name: 'BankID',
      mode: 'sandbox',
      status: 'ready',
    })
    expect(http.put).toHaveBeenCalledWith('/verified-signing/provider-connections/c1', {
      providerKey: 'bankid',
      displayName: 'BankID',
      mode: 'sandbox',
      status: 'ready',
      configuredFields: [],
    })
  })

  it('deleteProviderConnection ruší konfiguraci podle id', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useVerifiedSigning().deleteProviderConnection('c1')
    expect(http.del).toHaveBeenCalledWith('/verified-signing/provider-connections/c1')
  })

  it('listConnectionSecrets čte stav trezoru (bez hodnot)', async () => {
    vi.mocked(http.get).mockResolvedValue({ fields: [] } as never)
    await useVerifiedSigning().listConnectionSecrets('c1')
    expect(http.get).toHaveBeenCalledWith('/verified-signing/provider-connections/c1/secrets')
  })

  it('storeConnectionSecret posílá raw hodnotu v body { value }', async () => {
    vi.mocked(http.put).mockResolvedValue({ fields: [] } as never)
    await useVerifiedSigning().storeConnectionSecret('c1', 'clientSecretRef', 'sk_live_secret')
    expect(http.put).toHaveBeenCalledWith(
      '/verified-signing/provider-connections/c1/secrets/clientSecretRef',
      { value: 'sk_live_secret' },
    )
  })

  it('deleteConnectionSecret maže jedno credential pole', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useVerifiedSigning().deleteConnectionSecret('c1', 'clientSecretRef')
    expect(http.del).toHaveBeenCalledWith(
      '/verified-signing/provider-connections/c1/secrets/clientSecretRef',
    )
  })

  it('revokeConnectionSecrets revokuje všechny klíče konfigurace', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useVerifiedSigning().revokeConnectionSecrets('c1')
    expect(http.del).toHaveBeenCalledWith('/verified-signing/provider-connections/c1/secrets')
  })
})

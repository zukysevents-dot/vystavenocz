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

  it('listEnvelopes umí i stránkovanou odpověď (items)', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [{ id: 'e1' }], total: 1 } as never)
    const result = await useVerifiedSigning().listEnvelopes()
    expect(result).toEqual([{ id: 'e1' }])
  })

  it('getEnvelope volá detail obálky', async () => {
    vi.mocked(http.get).mockResolvedValue({ id: 'e1' } as never)
    await useVerifiedSigning().getEnvelope('e1')
    expect(http.get).toHaveBeenCalledWith('/verified-signing/envelopes/e1')
  })

  it('createEnvelope posílá provider-neutral payload', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 'e1' } as never)
    const input = {
      documentName: 'Smlouva',
      documentType: 'contract',
      externalReference: 'ORDER-1',
      provider: 'bankid',
      signer: { name: 'Jan Novák', email: null, phone: null },
      expiresAt: null,
    }
    await useVerifiedSigning().createEnvelope(input)
    expect(http.post).toHaveBeenCalledWith('/verified-signing/envelopes', input)
  })

  it('sendEnvelope volá send akci', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 'e1' } as never)
    await useVerifiedSigning().sendEnvelope('e1')
    expect(http.post).toHaveBeenCalledWith('/verified-signing/envelopes/e1/send', {})
  })

  it('cancelEnvelope volá cancel akci', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 'e1' } as never)
    await useVerifiedSigning().cancelEnvelope('e1')
    expect(http.post).toHaveBeenCalledWith('/verified-signing/envelopes/e1/cancel', {})
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

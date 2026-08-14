import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTerminalDevices } from '@/composables/useTerminalDevices'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// Kontrakt proti backendu (`/integrations/terminal-devices`). Tvar požadavku hlídáme explicitně — rozejít se
// s ním znamená 422 na každý pokus a v UI se to projeví až v produkci (viz oprava displayName u konfigurací).
describe('useTerminalDevices', () => {
  it('list bere i neaktivní čtečky a živý stav si vyžádá jen na požádání', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0 } as never)
    await useTerminalDevices().list()
    expect(http.get).toHaveBeenCalledWith(
      '/integrations/terminal-devices?page=1&pageSize=100&includeInactive=true',
    )

    await useTerminalDevices().list({ includeLiveStatus: true })
    expect(http.get).toHaveBeenLastCalledWith(
      '/integrations/terminal-devices?page=1&pageSize=100&includeInactive=true&includeLiveStatus=true',
    )
  })

  it('register posílá párovací kód a pobočku v tvaru backendu', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 'dev-1' } as never)
    await useTerminalDevices().register({
      providerConnectionId: 'conn-1',
      name: 'Bar A — SumUp 01',
      pairingCode: 'ABCD1234',
      locationId: 'loc-1',
    })
    expect(http.post).toHaveBeenCalledWith('/integrations/terminal-devices', {
      providerConnectionId: 'conn-1',
      name: 'Bar A — SumUp 01',
      pairingCode: 'ABCD1234',
      locationId: 'loc-1',
      note: null,
    })
  })

  it('terminál bez pobočky pošle locationId null, ne prázdný řetězec', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 'dev-2' } as never)
    await useTerminalDevices().register({
      providerConnectionId: 'conn-1',
      name: 'Rezervní',
      pairingCode: 'X1',
    })
    expect(vi.mocked(http.post).mock.calls[0][1]).toMatchObject({ locationId: null })
  })

  it('update přeřadí terminál na jinou pobočku', async () => {
    vi.mocked(http.put).mockResolvedValue({ id: 'dev-1' } as never)
    await useTerminalDevices().update('dev-1', { name: 'Bar B — SumUp 01', locationId: 'loc-2' })
    expect(http.put).toHaveBeenCalledWith('/integrations/terminal-devices/dev-1', {
      name: 'Bar B — SumUp 01',
      locationId: 'loc-2',
      isActive: true,
      note: null,
    })
  })

  it('deactivate maže podle id', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useTerminalDevices().deactivate('dev-1')
    expect(http.del).toHaveBeenCalledWith('/integrations/terminal-devices/dev-1')
  })
})

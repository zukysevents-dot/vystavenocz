import { http } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'

// Registr fyzických platebních čteček. SumUp nezná pojem „bar/pobočka" — vazbu čtečka → pobočka drží Vystaveno
// a je to bezpečnostní hranice: obsluha smí platit jen na terminálu své pobočky. Proto je přeřazení citlivá akce
// (přesměruje tržbu) a backend ji pouští jen Ownerovi/Adminovi s auditem.
// API-only: mock režim tenhle registr nemá co simulovat (pairing kód vyměňuje u providera server).
export interface TerminalDevice {
  id: string
  name: string
  providerKey: string
  providerDeviceId: string
  providerConnectionId: string
  providerConnectionName: string | null
  locationId: string | null
  locationName: string | null
  isActive: boolean
  /** Stav konfigurace providera: Ready / WaitingForCredentials / Disabled. */
  configurationState: string
  /** Živě od providera: ONLINE/OFFLINE. `null` = nezjištěno (provider nedostupný nesmí shodit výpis). */
  status: string | null
  batteryLevel: number | null
  lastSeenAt: string | null
  lastSuccessfulPaymentAt: string | null
  note: string | null
  createdAt: string
}

export interface RegisterTerminalDeviceInput {
  providerConnectionId: string
  name: string
  /** Kód z displeje terminálu. Platí 5 minut, server ho vymění za trvalé reader_id a NIKDE ho neukládá. */
  pairingCode: string
  locationId?: string | null
  note?: string | null
}

export interface UpdateTerminalDeviceInput {
  name: string
  locationId?: string | null
  isActive?: boolean
  note?: string | null
}

export function useTerminalDevices() {
  async function list(options: { includeLiveStatus?: boolean } = {}): Promise<TerminalDevice[]> {
    const query = new URLSearchParams({ page: '1', pageSize: '100', includeInactive: 'true' })
    if (options.includeLiveStatus) query.set('includeLiveStatus', 'true')
    const res = await http.get<PagedResult<TerminalDevice>>(
      `/integrations/terminal-devices?${query.toString()}`,
    )
    return res?.items ?? []
  }

  function register(input: RegisterTerminalDeviceInput): Promise<TerminalDevice> {
    return http.post<TerminalDevice>('/integrations/terminal-devices', {
      providerConnectionId: input.providerConnectionId,
      name: input.name,
      pairingCode: input.pairingCode,
      locationId: input.locationId ?? null,
      note: input.note ?? null,
    })
  }

  function update(id: string, input: UpdateTerminalDeviceInput): Promise<TerminalDevice> {
    return http.put<TerminalDevice>(`/integrations/terminal-devices/${id}`, {
      name: input.name,
      locationId: input.locationId ?? null,
      isActive: input.isActive ?? true,
      note: input.note ?? null,
    })
  }

  /** Deaktivace je okamžitá: čtečka zmizí z nabídky a nové platby na ni neprojdou. Historie zůstává. */
  function deactivate(id: string): Promise<void> {
    return http.del(`/integrations/terminal-devices/${id}`)
  }

  return { list, register, update, deactivate }
}

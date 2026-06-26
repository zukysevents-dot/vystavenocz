import { http } from '@/lib/http'
import type { Reservation, Resource, Service } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

export type ServiceInput = {
  name: string
  durationMinutes: number
  price: number
  vatRate: number
  isActive?: boolean
}
export type ResourceInput = { name: string; isActive?: boolean }
export type ReservationInput = {
  resourceId: string
  serviceId: string
  startsAt: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  note?: string | null
}

// Rezervace (Reservio-like) — jen API mód.
export function useReservations() {
  async function services(): Promise<Service[]> {
    return (await http.get<PagedResult<Service>>('/services?pageSize=200')).items
  }
  function createService(input: ServiceInput): Promise<Service> {
    return http.post<Service>('/services', input)
  }
  function updateService(id: string, input: ServiceInput): Promise<Service> {
    return http.put<Service>(`/services/${id}`, input)
  }
  function removeService(id: string): Promise<void> {
    return http.del(`/services/${id}`)
  }

  async function resources(): Promise<Resource[]> {
    return (await http.get<PagedResult<Resource>>('/resources?pageSize=200')).items
  }
  function createResource(input: ResourceInput): Promise<Resource> {
    return http.post<Resource>('/resources', input)
  }
  function updateResource(id: string, input: ResourceInput): Promise<Resource> {
    return http.put<Resource>(`/resources/${id}`, input)
  }
  function removeResource(id: string): Promise<void> {
    return http.del(`/resources/${id}`)
  }

  async function list(fromIso: string, toIso: string): Promise<Reservation[]> {
    const qs = `from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&pageSize=200&sort=start`
    return (await http.get<PagedResult<Reservation>>(`/reservations?${qs}`)).items
  }
  function create(input: ReservationInput): Promise<Reservation> {
    return http.post<Reservation>('/reservations', input)
  }
  function setStatus(
    id: string,
    action: 'confirm' | 'complete' | 'cancel' | 'no-show',
  ): Promise<Reservation> {
    return http.post<Reservation>(`/reservations/${id}/${action}`)
  }

  return {
    services,
    createService,
    updateService,
    removeService,
    resources,
    createResource,
    updateResource,
    removeResource,
    list,
    create,
    setStatus,
  }
}

import { http } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'

export interface LoyaltyCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  loyaltyPoints: number
}

export interface CustomerInput {
  name: string
  phone?: string | null
  email?: string | null
}

export type LoyaltyLedgerType = 'Earn' | 'Redeem' | 'Reversal' | 'ManualAdjust'

export interface LoyaltyLedgerEntry {
  id: string
  type: LoyaltyLedgerType
  points: number
  relatedSaleId: string | null
  note: string | null
  createdAt: string
}

export interface CustomerLoyalty {
  customerId: string
  balance: number
  entries: LoyaltyLedgerEntry[]
}

export function useCustomers() {
  function list(search = '', pageSize = 100): Promise<PagedResult<LoyaltyCustomer>> {
    const params = new URLSearchParams({ pageSize: String(pageSize), sort: 'name' })
    if (search.trim()) params.set('search', search.trim())
    return http.get<PagedResult<LoyaltyCustomer>>(`/customers?${params.toString()}`)
  }

  function create(input: CustomerInput): Promise<LoyaltyCustomer> {
    return http.post<LoyaltyCustomer>('/customers', cleanCustomer(input))
  }

  function update(id: string, input: CustomerInput): Promise<LoyaltyCustomer> {
    return http.put<LoyaltyCustomer>(`/customers/${id}`, cleanCustomer(input))
  }

  function loyalty(id: string): Promise<CustomerLoyalty> {
    return http.get<CustomerLoyalty>(`/customers/${id}/loyalty`)
  }

  function adjust(id: string, points: number, note?: string | null): Promise<CustomerLoyalty> {
    return http.post<CustomerLoyalty>(`/customers/${id}/loyalty/adjust`, {
      points,
      note: note?.trim() || null,
    })
  }

  return { list, create, update, loyalty, adjust }
}

function cleanCustomer(input: CustomerInput): CustomerInput {
  return {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
  }
}

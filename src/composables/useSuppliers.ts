import { http } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'

export interface Supplier {
  id: string
  name: string
  ico: string | null
  dic: string | null
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  zip: string | null
  country: string
  note: string | null
}

export type SupplierInput = Omit<Supplier, 'id'>

export function useSuppliers() {
  const list = async (search = ''): Promise<Supplier[]> => {
    const query = new URLSearchParams({ pageSize: '100' })
    if (search.trim()) query.set('search', search.trim())
    return (await http.get<PagedResult<Supplier>>(`/suppliers?${query}`)).items
  }
  const create = (input: SupplierInput): Promise<Supplier> => http.post('/suppliers', input)
  const update = (id: string, input: SupplierInput): Promise<Supplier> => http.put(`/suppliers/${id}`, input)
  const archive = (id: string): Promise<void> => http.del(`/suppliers/${id}`)
  return { list, create, update, archive }
}

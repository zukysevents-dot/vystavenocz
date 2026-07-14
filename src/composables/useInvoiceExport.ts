import { ref } from 'vue'
import { useApi, type PagedResult } from '@/composables/useApi'
import { invoiceFromApi, type InvoiceApiResponse } from '@/lib/invoice-api'
import { http, isApiMode } from '@/lib/http'
import type { Invoice } from '@/lib/types'

const EXPORT_PAGE_SIZE = 100

export async function collectAllInvoiceExportPages<T extends { id: string }>(
  fetchPage: (page: number, pageSize: number) => Promise<PagedResult<T>>,
): Promise<T[]> {
  const first = await fetchPage(1, EXPORT_PAGE_SIZE)
  const expectedTotal = Math.max(0, first.total)
  const totalPages = Math.max(1, Math.ceil(expectedTotal / EXPORT_PAGE_SIZE))
  const byId = new Map(first.items.map((item) => [item.id, item]))

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetchPage(page, EXPORT_PAGE_SIZE)
    for (const item of response.items) byId.set(item.id, item)
  }

  if (byId.size !== expectedTotal) {
    throw new Error(
      `Export se nepodařilo připravit celý (${byId.size} z ${expectedTotal} dokladů). Načtěte data znovu.`,
    )
  }
  return [...byId.values()]
}

export function useInvoiceExport() {
  const invoices = ref<Invoice[]>([])
  const loading = ref(false)
  const loadError = ref(false)

  async function load(): Promise<void> {
    loading.value = true
    loadError.value = false
    try {
      if (isApiMode()) {
        const rows = await collectAllInvoiceExportPages((page, pageSize) =>
          http.get<PagedResult<InvoiceApiResponse>>(`/invoices?page=${page}&pageSize=${pageSize}`),
        )
        invoices.value = rows.map(invoiceFromApi)
      } else {
        invoices.value = await useApi<Invoice>('invoices').listAll()
      }
    } catch (error) {
      console.warn('Načtení dokladů pro export selhalo:', error)
      invoices.value = []
      loadError.value = true
    } finally {
      loading.value = false
    }
  }

  return { invoices, loading, loadError, load }
}

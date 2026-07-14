import { describe, expect, it } from 'vitest'
import { collectAllInvoiceExportPages } from '@/composables/useInvoiceExport'

describe('collectAllInvoiceExportPages', () => {
  it('načte všechny stránky podle serverového total bez stropu první stovky', async () => {
    const rows = Array.from({ length: 205 }, (_, index) => ({ id: `invoice-${index + 1}` }))
    const requestedPages: number[] = []

    const result = await collectAllInvoiceExportPages(async (page, pageSize) => {
      requestedPages.push(page)
      const start = (page - 1) * pageSize
      return {
        items: rows.slice(start, start + pageSize),
        total: rows.length,
        page,
        pageSize,
      }
    })

    expect(requestedPages).toEqual([1, 2, 3])
    expect(result).toHaveLength(205)
  })

  it('odmítne neúplný nebo nestabilní výsledek místo zavádějícího exportu', async () => {
    await expect(
      collectAllInvoiceExportPages(async (page, pageSize) => ({
        items: page === 1 ? [{ id: 'same' }] : [{ id: 'same' }],
        total: 101,
        page,
        pageSize,
      })),
    ).rejects.toThrow('1 z 101 dokladů')
  })
})

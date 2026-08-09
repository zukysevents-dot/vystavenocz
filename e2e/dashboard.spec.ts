import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

test('dashboard zobrazí metriky, graf a poslední faktury', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [
      {
        id: 'i1',
        documentType: 'invoice',
        status: 'paid',
        invoiceNumber: 'FA-2026-0001',
        clientId: null,
        clientSnapshot: { name: 'Acme s.r.o.' },
        supplierSnapshot: { companyName: 'Test' },
        items: [],
        currency: 'CZK',
        issueDate: '2026-06-10',
        dueDate: '2026-06-24',
        taxableDate: '2026-06-10',
        paidAt: '2026-06-12T00:00:00.000Z',
        variableSymbol: '20260001',
        constantSymbol: null,
        specificSymbol: null,
        paymentMethod: 'bank_transfer',
        subtotal: 5000,
        vatTotal: 0,
        total: 5000,
        notes: null,
        createdAt: '2026-06-10T00:00:00.000Z',
        updatedAt: '2026-06-10T00:00:00.000Z',
      },
    ],
  })
  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Dnes ve firmě' })).toBeVisible()
  await expect(page.getByText('Faktury celkem')).toBeVisible()
  await expect(page.getByText('Tržby (posledních 6 měsíců)')).toBeVisible()
  await expect(page.getByText('FA-2026-0001').first()).toBeVisible()
})

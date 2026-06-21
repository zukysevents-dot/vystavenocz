import { test, expect } from '@playwright/test'
import { seedApp } from './helpers/seed'

test.use({ viewport: { width: 375, height: 812 } })

test('faktury: na mobilu se místo tabulky zobrazí karty', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [
      {
        id: 'i1',
        documentType: 'invoice',
        status: 'issued',
        invoiceNumber: 'FA-2026-0001',
        clientId: null,
        clientSnapshot: { name: 'Acme s.r.o.' },
        supplierSnapshot: { companyName: 'Test' },
        items: [],
        currency: 'CZK',
        issueDate: '2026-06-10',
        dueDate: '2026-06-24',
        taxableDate: '2026-06-10',
        paidAt: null,
        variableSymbol: '20260001',
        constantSymbol: null,
        specificSymbol: null,
        paymentMethod: 'bank_transfer',
        subtotal: 1000,
        vatTotal: 0,
        total: 1000,
        notes: null,
        createdAt: '2026-06-10T00:00:00.000Z',
        updatedAt: '2026-06-10T00:00:00.000Z',
      },
    ],
  })
  await page.goto('/app/faktury')

  // Desktopová tabulka je na mobilu skrytá; číslo faktury je i ve skryté tabulce,
  // proto bereme první výskyt = viditelná mobilní karta.
  await expect(page.locator('table')).toBeHidden()
  await expect(page.getByText('FA-2026-0001').first()).toBeVisible()
})

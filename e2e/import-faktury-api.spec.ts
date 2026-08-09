import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

/**
 * Import faktur v API režimu — důkaz, že se to, co vytěžíme z PDF, opravdu
 * odešle ve tvaru, který backend `POST /invoices/import` přijímá.
 *
 * Backend endpoint je hotový (`InvoiceService.ImportAsync`) a má povinná pole;
 * tenhle test hlídá kontrakt z druhé strany, aby se rozjetí tvaru payloadu
 * poznalo hned, ne až na produkci. Odpověď serveru se mockuje, ale payload
 * kontrolujeme přesně proti `ImportInvoiceRequest`.
 */

const API = '**/api/v1/**'
const MODULES = ['core', 'invoicing']

async function seedApiSession(page: Page): Promise<void> {
  await page.addInitScript((mods) => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    localStorage.setItem(
      'vystaveno.auth.tokens.v1',
      JSON.stringify({ accessToken: 'e2e-access', refreshToken: 'e2e-refresh' }),
    )
    localStorage.setItem(
      'vystaveno.auth.session.v1',
      JSON.stringify({
        user: { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Test' },
        companyId: 'c_e2e',
        role: 'Owner',
        modules: mods,
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, MODULES)
}

interface ImportBody {
  number: string
  status: string
  issueDate: string
  currency: string
  isVatPayer: boolean
  paidDate: string | null
  client: { name: string; ico: string | null }
  supplier: { name: string | null; ico: string | null }
  subtotal: number
  vatTotal: number
  total: number
  items: {
    description: string
    quantity: number
    unitPrice: number
    vatRate: number
    lineBase: number
    lineVat: number
    lineTotal: number
  }[]
}

async function routeApp(page: Page, captured: ImportBody[]): Promise<void> {
  await page.route(API, async (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    const method = route.request().method()

    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          fullName: 'E2E Test',
          companyId: 'c_e2e',
          role: 'Owner',
          modules: MODULES,
          features: [],
        },
      })

    if (method === 'GET' && path === '/company')
      return route.fulfill({
        json: {
          id: 'c_e2e',
          name: 'E2E s.r.o.',
          ico: '12345678',
          invoiceNumberPrefix: 'FA',
          invoiceNumberFormat: '{prefix}-{year}-{seq}',
          nextInvoiceSeq: 1,
          defaultPaymentDays: 14,
        },
      })

    if (method === 'GET' && path === '/invoices')
      return route.fulfill({ json: { items: [], total: 0 } })

    if (method === 'POST' && path === '/invoices/import') {
      const body = route.request().postDataJSON() as ImportBody
      captured.push(body)
      // Backend vrací 201 s plnou fakturou (tvar InvoiceResponse).
      return route.fulfill({
        status: 201,
        json: {
          id: `srv-${captured.length}`,
          number: body.number,
          status: body.status,
          documentType: 'Invoice',
          clientId: null,
          clientName: body.client.name,
          issueDate: body.issueDate,
          dueDate: null,
          currency: body.currency,
          subtotal: body.subtotal,
          vatTotal: body.vatTotal,
          total: body.total,
          items: [],
          createdAt: '2026-08-09T00:00:00.000Z',
          updatedAt: '2026-08-09T00:00:00.000Z',
        },
      })
    }

    return route.fulfill({ status: 200, json: {} })
  })
}

test('PDF import odešle payload ve tvaru, který backend /invoices/import přijímá', async ({
  page,
}) => {
  const captured: ImportBody[] = []
  await seedApiSession(page)
  await routeApp(page, captured)

  await page.goto('/app/import/faktury')
  await page.locator('#invoice-file').setInputFiles('e2e/fixtures/faktura-pdf-import.pdf')
  await expect(page.getByText('1 importuje')).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: /Importovat 1 faktur/ }).click()
  await expect(page.getByText('Import dokončen')).toBeVisible()

  expect(captured).toHaveLength(1)
  const body = captured[0]

  // Povinná pole serverového validátoru — bez nich by import skončil na 422.
  expect(body.number).toBe('2024-0042')
  expect(body.status).toBe('Issued')
  expect(body.issueDate).toBe('2024-03-01')
  expect(body.currency).toHaveLength(3)
  expect(body.client.name).toBe('Stavby Dvořák a.s.')
  expect(body.items.length).toBeGreaterThan(0)
  // status Issued → paidDate musí zůstat null (jinak by doklad tvrdil úhradu)
  expect(body.paidDate).toBeNull()

  // Částky jdou „jak jsou" a sedí na originál — server je nepřepočítává.
  expect(body.subtotal).toBe(10000)
  expect(body.vatTotal).toBe(2100)
  expect(body.total).toBe(12100)

  // Řádkové částky musí sedět na hlavičku, jinak by VAT rozpad na serveru nesouhlasil.
  const line = body.items[0]
  expect(line.lineBase).toBe(10000)
  expect(line.lineVat).toBe(2100)
  expect(line.lineTotal).toBe(12100)
  expect(line.vatRate).toBe(21)

  // Peníze i množství musí sednout na numeric(18,2) / 3dp, jinak validátor 422.
  for (const it of body.items) {
    expect(Math.round(it.unitPrice * 100) / 100).toBe(it.unitPrice)
    expect(Math.round(it.quantity * 1000) / 1000).toBe(it.quantity)
  }
})

test('doklad bez povinných polí se k importu vůbec nenabídne', async ({ page }) => {
  const captured: ImportBody[] = []
  await seedApiSession(page)
  await routeApp(page, captured)

  // ZIP obsahuje čitelné faktury; kdyby některá povinné pole postrádala,
  // musí se označit „Nelze uložit" a na server se neodešle.
  await page.goto('/app/import/faktury')
  await page.locator('#invoice-file').setInputFiles('e2e/fixtures/faktury-davka.zip')
  await expect(page.getByText('2 importuje')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Nelze uložit')).toHaveCount(0)

  await page.getByRole('button', { name: /Importovat 2 faktur/ }).click()
  await expect(page.getByText('Import dokončen')).toBeVisible()

  // Každý odeslaný doklad má vyplněná všechna pole, která server vyžaduje.
  expect(captured).toHaveLength(2)
  for (const body of captured) {
    expect(body.number.trim()).not.toBe('')
    expect(body.issueDate.trim()).not.toBe('')
    expect(body.client.name.trim()).not.toBe('')
    expect(body.items.length).toBeGreaterThan(0)
  }
})

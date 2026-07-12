import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// GAP 2 — Přehled DPH v API režimu: čísla bere VÝHRADNĚ ze serverového /invoices/vat-summary
// (proforma vyloučena, dobropis nettuje záporně — počítá server). FE peníze/DPH nepočítá.
// Klíčový důkaz cesty: list-summary nese items:[] (bez řádků), takže client-side dph.ts by dal
// count 0 → prázdný stav. Když stránka ukáže serverové řádky, jede přes vat-summary endpoint.

const API = '**/api/v1/**'
const MODULES = ['core', 'invoicing', 'reporting']

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

// List-summary faktur (BEZ řádků — jako reálný backend list). issueDate plní nabídku období.
const INVOICE_SUMMARY = {
  items: [
    {
      id: 'inv-1',
      number: 'FA-2026-0001',
      status: 'Issued',
      documentType: 'Invoice',
      clientId: 'cli-1',
      clientName: 'Acme s.r.o.',
      issueDate: '2026-07-05',
      dueDate: '2026-07-19',
      subtotal: 10000,
      vatTotal: 2100,
      total: 12100,
      currency: 'CZK',
    },
  ],
  total: 1,
}

interface VatSummaryCapture {
  from: string | null
  to: string | null
}

async function routeApp(page: Page, captured: VatSummaryCapture[]): Promise<void> {
  await page.route(API, async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const method = route.request().method()

    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: 'c_e2e',
          role: 'Owner',
          modules: MODULES,
          features: [],
        },
      })
    if (method === 'GET' && path === '/company/modules')
      return route.fulfill({ json: { modules: MODULES } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E s.r.o.', currency: 'CZK' } })
    if (method === 'GET' && path === '/locations')
      return route.fulfill({ json: { items: [{ id: 'loc1', name: 'Praha' }], total: 1 } })

    // Serverový DPH přehled — zdroj pravdy pro stránku. Zachytí from/to a vrátí odpovídající čísla.
    if (method === 'GET' && path === '/invoices/vat-summary') {
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      captured.push({ from, to })
      // Konkrétní měsíc 7/2026 → jen 21% řada; „vše" → dvě řady (21 % + 12 %).
      const monthly = from === '2026-07-01' && to === '2026-07-31'
      return route.fulfill({
        json: monthly
          ? {
              rows: [{ rate: 21, base: 10000, vat: 2100 }],
              totalBase: 10000,
              totalVat: 2100,
              count: 1,
            }
          : {
              rows: [
                { rate: 21, base: 10000, vat: 2100 },
                { rate: 12, base: 5000, vat: 600 },
              ],
              totalBase: 15000,
              totalVat: 2700,
              count: 3,
            },
      })
    }
    if (method === 'GET' && path === '/invoices') return route.fulfill({ json: INVOICE_SUMMARY })

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('Přehled DPH: čísla jsou ze serverového vat-summary (ne z prázdných summary řádků)', async ({
  page,
}) => {
  const captured: VatSummaryCapture[] = []
  await seedApiSession(page)
  await routeApp(page, captured)

  await page.goto('/app/dph')

  // Server vrátil dvě sazbové řady → stránka je ukazuje (client-side z items:[] by dal prázdný stav).
  await expect(page.getByRole('heading', { name: 'Přehled DPH' })).toBeVisible()
  await expect(page.getByText('Žádné doklady pro DPH')).toHaveCount(0)
  await expect(page.getByRole('cell', { name: '21 %' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '12 %' })).toBeVisible()

  // První dotaz je „vše" (bez from/to).
  expect(captured[0]).toEqual({ from: null, to: null })
})

test('Přehled DPH: výběr měsíce pošle from/to a přenačte serverový přehled', async ({ page }) => {
  const captured: VatSummaryCapture[] = []
  await seedApiSession(page)
  await routeApp(page, captured)

  await page.goto('/app/dph')
  await expect(page.getByRole('cell', { name: '12 %' })).toBeVisible()

  // Nabídka období se plní z issueDate summary listu (API režim summary nemá DUZP).
  await page.selectOption('#period', '2026-07')

  // Měsíční payload má jen 21% řadu → 12% řádek zmizí; server dostal celý rozsah měsíce.
  await expect(page.getByRole('cell', { name: '12 %' })).toHaveCount(0)
  await expect(page.getByRole('cell', { name: '21 %' })).toBeVisible()
  expect(captured.at(-1)).toEqual({ from: '2026-07-01', to: '2026-07-31' })
})

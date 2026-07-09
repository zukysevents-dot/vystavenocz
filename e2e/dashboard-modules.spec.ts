import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Dashboard (Přehled) a modul `invoicing`: fakturační část je za modulem invoicing (backend jinak 403). Dřív to
// shodilo celý Přehled jako „Server je momentálně nedostupný". Gastro/POS tenant bez invoicing musí Přehled
// normálně vidět (POS provoz), fakturační widgety a tlačítka skryté. Tenant s invoicing vidí fakturační přehled dál.

const API = '**/api/v1/**'
const GASTRO_MODULES = [
  'core',
  'pos',
  'gastro',
  'stock',
  'reporting',
  'loyalty',
  'integrations',
  'verified_signing',
]
const FULL_MODULES = [...GASTRO_MODULES, 'invoicing']

async function seedApiSession(page: Page, modules: string[]): Promise<void> {
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
  }, modules)
}

async function routeDashboard(
  page: Page,
  modules: string[],
  opts: { invoicingData?: boolean } = {},
): Promise<void> {
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: 'c_e2e',
          role: 'Owner',
          modules,
          features: [],
        },
      })
    if (method === 'GET' && path === '/company/modules') return route.fulfill({ json: { modules } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E Gastro', currency: 'CZK' } })
    // useApi.list() očekává PagedResult ({ items }), ne holé pole.
    if (method === 'GET' && path === '/locations')
      return route.fulfill({
        json: { items: [{ id: 'loc1', name: 'Praha — Vinohrady' }], total: 1 },
      })
    if (method === 'GET' && path === '/sales')
      return route.fulfill({
        json: {
          items: [
            {
              id: 's1',
              total: 1990,
              locationId: 'loc1',
              createdAt: '2026-07-09T10:00:00Z',
              items: [],
            },
          ],
          total: 1,
        },
      })

    // Fakturační endpointy: s modulem invoicing vrací data, bez něj simulují backend 403 (dashboard je ale nevolá).
    if (path === '/invoices' || path.startsWith('/dashboard/')) {
      if (!opts.invoicingData) return route.fulfill({ status: 403, json: { title: 'Forbidden' } })
      if (path.startsWith('/invoices')) return route.fulfill({ json: { total: 2 } })
      if (path.startsWith('/dashboard/summary'))
        return route.fulfill({
          json: {
            totalInvoiced: 57838,
            totalPaid: 48158,
            paidCount: 1,
            overdueCount: 0,
            overdueAmount: 0,
          },
        })
      if (path.startsWith('/dashboard/revenue'))
        return route.fulfill({
          json: { series: [{ periodStart: '2026-07-01', invoicedAmount: 57838 }] },
        })
      if (path.startsWith('/dashboard/recent-invoices'))
        return route.fulfill({
          json: [
            {
              id: 'i1',
              number: 'FA20260001',
              clientName: 'Acme s.r.o.',
              status: 'paid',
              issueDate: '2026-07-09',
              total: 48158,
            },
          ],
        })
      if (path.startsWith('/dashboard/recent-clients'))
        return route.fulfill({
          json: [{ id: 'c1', name: 'Acme s.r.o.', email: 'acme@example.cz' }],
        })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('dashboard: gastro tenant bez invoicing modulu nespadne na „server nedostupný"', async ({
  page,
}) => {
  await seedApiSession(page, GASTRO_MODULES)
  await routeDashboard(page, GASTRO_MODULES)
  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Přehled' })).toBeVisible()
  // Root-cause fix: žádná chybová karta „Server je momentálně nedostupný".
  await expect(page.getByText('Server je momentálně nedostupný')).toHaveCount(0)
  // Fakturační widgety a tlačítka skryté.
  await expect(page.getByRole('button', { name: 'Nová faktura' })).toHaveCount(0)
  await expect(page.getByText('Faktury celkem')).toHaveCount(0)
  // POS provoz zůstává funkční (tenant má prodeje).
  await expect(page.getByText('Provoz — pokladna')).toBeVisible()
})

test('dashboard: tenant s invoicing modulem dál vidí fakturační přehled', async ({ page }) => {
  await seedApiSession(page, FULL_MODULES)
  await routeDashboard(page, FULL_MODULES, { invoicingData: true })
  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Přehled' })).toBeVisible()
  await expect(page.getByText('Faktury celkem')).toBeVisible()
  await expect(page.getByText('Tržby (posledních 6 měsíců)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nová faktura' })).toBeVisible()
})

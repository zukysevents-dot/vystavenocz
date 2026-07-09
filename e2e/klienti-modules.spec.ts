import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Klienti jsou fakturační entita — backend /clients gatuje modulem invoicing (Permissions.Invoices.Read →
// ProductModules.Invoicing). Bez modulu backend vrací 403 a stránka ukazovala zavádějící „Server je momentálně
// nedostupný" (stejný symptom jako #156). Route i nav „Klienti" proto patří pod invoicing:
//  - tenant bez invoicing „Klienti" v navigaci nevidí a přímý přechod na /app/klienti přesměruje na Přehled,
//  - tenant s invoicing „Klienti" normálně vidí a načte.

const API = '**/api/v1/**'
const GASTRO_MODULES = ['core', 'pos', 'gastro', 'stock', 'reporting', 'loyalty', 'integrations']
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

async function routeApp(page: Page, modules: string[]): Promise<void> {
  const hasInvoicing = modules.includes('invoicing')
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
    if (method === 'GET' && path === '/locations')
      return route.fulfill({
        json: { items: [{ id: 'loc1', name: 'Praha — Vinohrady' }], total: 1 },
      })
    if (method === 'GET' && path === '/sales')
      return route.fulfill({ json: { items: [], total: 0 } })

    // /clients patří modulu invoicing: s modulem vrací seznam, bez něj backend 403 (route ho ale nepustí).
    if (path.startsWith('/clients')) {
      if (!hasInvoicing) return route.fulfill({ status: 403, json: { title: 'Forbidden' } })
      return route.fulfill({
        json: { items: [{ id: 'c1', name: 'Acme s.r.o.', email: 'acme@example.cz' }], total: 1 },
      })
    }
    // Fakturační endpointy Přehledu bez modulu → 403 (Dashboard je díky #156 nevolá).
    if (path === '/invoices' || path.startsWith('/dashboard/')) {
      if (!hasInvoicing) return route.fulfill({ status: 403, json: { title: 'Forbidden' } })
      if (path.startsWith('/invoices')) return route.fulfill({ json: { total: 0 } })
      return route.fulfill({ json: { series: [] } })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('klienti: tenant bez invoicing nevidí nav a /app/klienti přesměruje bez „server nedostupný"', async ({
  page,
}) => {
  await seedApiSession(page, GASTRO_MODULES)
  await routeApp(page, GASTRO_MODULES)

  await page.goto('/app/klienti')

  // Route guard přesměruje na Přehled (name 'app').
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: 'Přehled' })).toBeVisible()
  // Nesmí se zobrazit stránka Klienti ani zavádějící chyba serveru.
  await expect(page.getByRole('heading', { name: 'Klienti' })).toHaveCount(0)
  await expect(page.getByText('Server je momentálně nedostupný')).toHaveCount(0)
  // Nav odkaz „Klienti" je pro tenanta bez invoicing skrytý.
  await expect(page.getByRole('link', { name: 'Klienti' })).toHaveCount(0)
})

test('klienti: tenant s invoicing modulem Klienti normálně vidí a načte', async ({ page }) => {
  await seedApiSession(page, FULL_MODULES)
  await routeApp(page, FULL_MODULES)

  await page.goto('/app/klienti')

  await expect(page.getByRole('heading', { name: 'Klienti' })).toBeVisible()
  await expect(page.getByText('Acme s.r.o.')).toBeVisible()
  await expect(page.getByText('Server je momentálně nedostupný')).toHaveCount(0)
})

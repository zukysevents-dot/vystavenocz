import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Bar za provozu zjistí, že v ceníku něco chybí. Musí to založit od pokladny a hned prodat —
// odejít do katalogu znamená frontu u výčepu. Katalog ale smí měnit jen vedení, takže obsluha
// (Employee) akci vůbec nevidí; jinak by na ni spadla chyba přístupu až po vyplnění formuláře.

const API = '**/api/v1/**'

function paged<T>(items: T[], pageSize = 100) {
  return { items, total: items.length, page: 1, pageSize }
}

const company = {
  id: 'c_e2e',
  name: 'E2E Bar',
  ico: '12345678',
  dic: null,
  email: 'e2e@vystaveno.cz',
  phone: null,
  logoUrl: null,
  defaultDueDays: 14,
  currency: 'CZK',
  address: { street: 'Testovací 1', city: 'Praha', postalCode: '11000', country: 'CZ' },
  bankAccount: { accountNumber: '123456789/0100', iban: null, bic: null },
  publicSlug: 'e2e-bar',
}

const location = {
  id: 'loc-bar',
  name: 'Bar',
  address: 'Barová 1, Praha',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const pivo = {
  id: 'prod-pivo',
  name: 'Pivo 0,5',
  sku: '',
  ean: null,
  salePrice: 65,
  vatRate: 21,
  purchasePrice: null,
  minQuantity: 0,
  categoryId: null,
  allergens: [],
}

async function seedApiMode(page: Page, role: 'Owner' | 'Employee'): Promise<void> {
  await page.addInitScript((r) => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    localStorage.setItem(
      'vystaveno.auth.tokens.v1',
      JSON.stringify({ accessToken: 'e2e-access', refreshToken: 'e2e-refresh' }),
    )
    localStorage.setItem(
      'vystaveno.auth.session.v1',
      JSON.stringify({
        user: { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Obsluha' },
        companyId: 'c_e2e',
        role: r,
        modules: ['core', 'gastro', 'pos', 'stock', 'reporting'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  }, role)
}

/** Zachycené POST /products, aby test viděl, co pokladna serveru opravdu poslala. */
async function routeApi(page: Page, created: Record<string, unknown>[]): Promise<void> {
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'POST' && path === '/products') {
      const body = request.postDataJSON() as Record<string, unknown>
      created.push(body)
      return route.fulfill({
        status: 201,
        json: { ...pivo, id: 'prod-novy', name: body.name, salePrice: body.salePrice },
      })
    }

    if (method === 'GET') {
      if (path === '/company') return route.fulfill({ json: company })
      if (path === '/products') return route.fulfill({ json: paged([pivo]) })
      if (path.startsWith('/products/') && path.endsWith('/variants'))
        return route.fulfill({ json: [] })
      if (path === '/locations') return route.fulfill({ json: paged([location]) })
      if (path === '/categories') return route.fulfill({ json: paged([]) })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('vedoucí založí položku přímo z pokladny a hned ji má na účtence', async ({ page }) => {
  const created: Record<string, unknown>[] = []
  await seedApiMode(page, 'Owner')
  await dismissCookies(page)
  await routeApi(page, created)

  await page.goto('/app/pokladna')

  await page.getByRole('button', { name: 'Nová položka' }).click()
  await page.locator('#pos-quick-name').fill('Prosecco 0,2')
  await page.locator('#pos-quick-price').fill('120')
  await page.getByRole('button', { name: 'Přidat na účtenku' }).click()

  await expect(page.getByText('Prosecco 0,2 přidáno na účtenku.')).toBeVisible()
  await expect(page.getByText('120,00 Kč × 1')).toBeVisible()
  // Dlaždice zůstane v katalogu — druhé pivo se už jen klepne, nezakládá se znovu.
  await expect(page.getByRole('button', { name: /Prosecco 0,2/ })).toBeVisible()

  expect(created).toHaveLength(1)
  expect(created[0]).toMatchObject({ name: 'Prosecco 0,2', salePrice: 120, vatRate: 21 })
  // Skladový kód bar neřeší — posílá se prázdný, ne vymyšlený.
  expect(created[0].sku).toBe('')
})

test('obsluha bez práva na katalog akci nevidí (nedostane chybu až po vyplnění)', async ({
  page,
}) => {
  const created: Record<string, unknown>[] = []
  await seedApiMode(page, 'Employee')
  await dismissCookies(page)
  await routeApi(page, created)

  await page.goto('/app/pokladna')

  await expect(page.getByRole('button', { name: /Pivo 0,5/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nová položka' })).toHaveCount(0)
})

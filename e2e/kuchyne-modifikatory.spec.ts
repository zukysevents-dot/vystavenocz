import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Kuchař musí na bonu vidět vybrané modifikátory položky (např. „bez cibule", velikost), jinak uvaří bez úpravy.
// Backend je vrací v KitchenQueueItem.modifiers; tady ověřujeme, že KuchynePage je vykreslí pod položkou.

const API = '**/api/v1/**'

const company = {
  id: 'c_e2e',
  name: 'E2E Bistro',
  ico: '12345678',
  dic: null,
  email: 'e2e@vystaveno.cz',
  phone: null,
  logoUrl: null,
  defaultDueDays: 14,
  currency: 'CZK',
  address: { street: 'Testovací 1', city: 'Praha', postalCode: '11000', country: 'CZ' },
  bankAccount: { accountNumber: '123456789/0100', iban: null, bic: null },
  publicSlug: 'e2e-bistro',
}

const queueItem = {
  itemId: 'item-1',
  orderId: 'order-1',
  tableName: 'Stůl 5',
  productName: 'Burger',
  quantity: 1,
  course: null,
  note: null,
  kitchenSection: 'Kitchen',
  kitchenStatus: 'Sent',
  sentToKitchenAt: '2026-07-06T10:00:00.000Z',
  kitchenStatusUpdatedAt: '2026-07-06T10:00:00.000Z',
  customerName: null,
  fulfillment: null,
  modifiers: [
    { groupName: 'Úpravy', name: 'Bez cibule' },
    { groupName: 'Velikost', name: 'Velká' },
  ],
}

async function seedApiMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
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
        modules: ['core', 'gastro', 'pos', 'stock', 'reporting'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

test('kuchyňský bon ukazuje vybrané modifikátory položky', async ({ page }) => {
  await seedApiMode(page)

  await page.route(API, async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const method = route.request().method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/kitchen/queue') return route.fulfill({ json: [queueItem] })
    if (method === 'GET' && path === '/kitchen/history') return route.fulfill({ json: [] })

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/kuchyne')

  // Bon s položkou a pod ní vybrané modifikátory (kuchař musí úpravy vidět).
  await expect(page.getByText('Burger')).toBeVisible()
  await expect(page.getByText('Úpravy: Bez cibule')).toBeVisible()
  await expect(page.getByText('Velikost: Velká')).toBeVisible()
})

test('kuchyňský bon oddělí předkrm, hlavní chod, dezert a nezařazené položky', async ({ page }) => {
  await seedApiMode(page)
  const courseItems = [
    { ...queueItem, itemId: 'dessert', productName: 'Dort', course: 'Dezert' },
    { ...queueItem, itemId: 'none', productName: 'Pečivo', course: null },
    { ...queueItem, itemId: 'main', productName: 'Steak', course: '2. chod' },
    { ...queueItem, itemId: 'starter', productName: 'Polévka', course: 'Předkrm' },
  ]

  await page.route(API, async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const method = route.request().method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/kitchen/queue') return route.fulfill({ json: courseItems })
    if (method === 'GET' && path === '/kitchen/history') return route.fulfill({ json: [] })

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/kuchyne')

  const separators = page.locator('[data-testid^="kitchen-course-"]')
  await expect(separators).toHaveText(['Předkrm', 'Hlavní chod', 'Dezert', 'Bez chodu'])
})

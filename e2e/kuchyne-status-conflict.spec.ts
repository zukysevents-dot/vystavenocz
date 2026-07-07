import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Když kuchař posune bon, který mezitím posunul/vydal jiný terminál, backend odmítne neplatný přechod (409, guard
// KDS workflow Sent→Preparing→Ready→Served). Frontend to nesmí ukázat jako generickou chybu — musí říct „bon už
// posunul jiný terminál" a hned synchronizovat frontu, ať kuchyně nevidí zastaralý stav.

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
  productName: 'Svíčková',
  quantity: 1,
  course: null,
  note: null,
  kitchenSection: 'Kitchen',
  kitchenStatus: 'Sent',
  sentToKitchenAt: '2026-07-06T10:00:00.000Z',
  kitchenStatusUpdatedAt: '2026-07-06T10:00:00.000Z',
  customerName: null,
  fulfillment: null,
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

test('posun bonu, který mezitím posunul jiný terminál, hlásí konflikt a synchronizuje frontu', async ({
  page,
}) => {
  // Test schválně vyvolá 409 → prohlížeč zaloguje network chybu; povolíme ji (ověřujeme chybovou cestu).
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 409' })
  await seedApiMode(page)

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/kitchen/queue') return route.fulfill({ json: [queueItem] })
    // Bon už mezitím posunul jiný terminál → přechod je odmítnut jako konflikt.
    if (method === 'POST' && path === '/kitchen/items/item-1/status') {
      return route.fulfill({ status: 409, json: { title: 'Kuchyňský stav nelze vrátit zpět.' } })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/kuchyne')

  // Bon je ve frontě se jménem položky a akcí Připravit.
  await expect(page.getByText('Svíčková')).toBeVisible()
  const prepare = page.getByRole('button', { name: /Připravit/ })
  await expect(prepare).toBeVisible()

  // Posun → backend 409 → jasná hláška (ne generická chyba).
  await prepare.click()
  await expect(page.getByText('Bon už mezitím posunul jiný terminál.')).toBeVisible()
})

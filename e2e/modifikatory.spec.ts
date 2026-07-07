import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

function paged<T>(items: T[]) {
  return { items, total: items.length, page: 1, pageSize: 100 }
}

const company = {
  id: 'c_e2e',
  companyName: 'E2E Bistro',
  fullName: null,
  email: 'e2e@vystaveno.cz',
  ico: '12345678',
  dic: null,
  vatMode: 'non_payer',
  street: 'Testovací 1',
  city: 'Praha',
  zip: '11000',
  country: 'CZ',
  bankAccount: '123456789/0100',
  iban: null,
  swift: null,
  logoUrl: null,
  invoiceColor: null,
  invoiceNumberPrefix: 'FA',
  invoiceNumberFormat: '{prefix}-{year}-{seq}',
  nextInvoiceSeq: 1,
  defaultPaymentDays: 14,
  publicSlug: 'e2e-bistro',
}

const product = {
  id: 'prod-burger',
  name: 'Burger',
  sku: 'BURG',
  ean: null,
  salePrice: 189,
  vatRate: 12,
  purchasePrice: 85,
  minQuantity: 0,
  categoryId: null,
}

const groups = [
  {
    id: 'group-sides',
    name: 'Přílohy',
    selectionType: 'Single',
    isRequired: true,
    maxSelect: null,
    sortOrder: 0,
    options: [
      { id: 'opt-fries', name: 'Hranolky', priceDelta: 0, sortOrder: 0 },
      { id: 'opt-salad', name: 'Salát', priceDelta: 15, sortOrder: 1 },
    ],
  },
  {
    id: 'group-extra',
    name: 'Extra',
    selectionType: 'Multi',
    isRequired: false,
    maxSelect: 2,
    sortOrder: 1,
    options: [{ id: 'opt-cheese', name: 'Sýr navíc', priceDelta: 20, sortOrder: 0 }],
  },
]

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
        modules: ['core', 'stock', 'gastro', 'pos'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

test('správce založí skupinu modifikátorů', async ({ page }) => {
  await seedApiMode(page)
  let createdPayload: unknown

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/modifier-groups')
      return route.fulfill({ json: paged(groups) })
    if (method === 'POST' && path === '/modifier-groups') {
      createdPayload = request.postDataJSON()
      return route.fulfill({
        status: 201,
        json: {
          id: 'group-spice',
          ...createdPayload,
          sortOrder: 2,
          options: [{ id: 'opt-hot', name: 'Pálivé', priceDelta: 0, sortOrder: 0 }],
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/modifikatory')

  await expect(page.getByRole('heading', { name: 'Modifikátory' })).toBeVisible()
  await expect(page.getByText('Přílohy', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Nová skupina' }).click()
  await page.getByLabel('Název *').fill('Ostrost')
  await page.getByPlaceholder('Hranolky').fill('Pálivé')
  await page.getByRole('button', { name: 'Přidat skupinu' }).click()

  await expect(page.getByText('Skupina přidána.')).toBeVisible()
  expect(createdPayload).toMatchObject({
    name: 'Ostrost',
    selectionType: 'Single',
    isRequired: false,
    options: [{ name: 'Pálivé', priceDelta: 0, sortOrder: 0 }],
  })
})

test('správce přiřadí skupiny modifikátorů k produktu ve skladu', async ({ page }) => {
  await seedApiMode(page)
  let assignPayload: unknown

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product]) })
    if (method === 'GET' && path === '/categories') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === '/modifier-groups')
      return route.fulfill({ json: paged(groups) })
    if (method === 'GET' && path === `/products/${product.id}/modifier-groups`)
      return route.fulfill({ json: [groups[0]] })
    if (method === 'PUT' && path === `/products/${product.id}/modifier-groups`) {
      assignPayload = request.postDataJSON()
      return route.fulfill({ json: groups })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/sklad')

  await expect(page.getByText('Burger')).toBeVisible()
  await page.getByTitle('Modifikátory').click()
  await expect(page.getByRole('dialog', { name: 'Modifikátory produktu' })).toBeVisible()
  await page.getByText('Extra', { exact: true }).click()
  await page.getByRole('button', { name: 'Uložit' }).click()

  await expect(page.getByText('Modifikátory produktu uloženy.')).toBeVisible()
  expect(assignPayload).toEqual({
    groups: [
      { modifierGroupId: 'group-sides', sortOrder: 0 },
      { modifierGroupId: 'group-extra', sortOrder: 1 },
    ],
  })
})

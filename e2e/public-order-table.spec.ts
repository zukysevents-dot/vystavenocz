import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

const menu = {
  categories: [{ id: 'cat-coffee', name: 'Káva', sortOrder: 0 }],
  products: [
    {
      id: 'prod-espresso',
      name: 'Espresso',
      categoryId: 'cat-coffee',
      priceWithVat: 59,
      vatRate: 21,
      available: true,
    },
  ],
}

async function seedApiMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
  })
}

test('QR objednávka ke stolu odešle tableId a nepoužije rozvozový tok', async ({ page }) => {
  let postedOrder: unknown = null

  await seedApiMode(page)
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')

    if (request.method() === 'GET' && path === '/public/bistro/menu') {
      return route.fulfill({ json: menu })
    }
    if (request.method() === 'POST' && path === '/public/bistro/orders') {
      postedOrder = request.postDataJSON()
      return route.fulfill({
        status: 201,
        json: { orderId: 'order-qr-1', total: 118, currency: 'CZK' },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${request.method()} ${path}` } })
  })
  await dismissCookies(page)

  await page.goto('/objednavka/bistro?table=table-1&name=St%C5%AFl%201')

  await expect(page.getByRole('heading', { name: 'Objednávka ke stolu' })).toBeVisible()
  await expect(page.getByText('Stůl 1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Výdej' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Rozvoz' })).toBeHidden()
  await expect(page.getByLabel('Adresa rozvozu')).toBeHidden()

  await page.getByRole('button', { name: 'Přidat' }).click()
  await page.getByRole('button', { name: 'Přidat' }).click()
  await expect(page.getByText('2 × 59,00 Kč')).toBeVisible()

  await page.getByLabel('Jméno').fill('Host u stolu')
  await page.getByLabel('Telefon').fill('777123456')
  await page.getByLabel('Poznámka').fill('bez cukru')
  await page.getByRole('button', { name: 'Odeslat objednávku' }).click()

  await expect(page.getByRole('heading', { name: 'Objednávka přijata' })).toBeVisible()
  await expect(page.getByText('zaplatíte ji u obsluhy')).toBeVisible()
  expect(postedOrder).toEqual({
    items: [{ productId: 'prod-espresso', quantity: 2 }],
    customerName: 'Host u stolu',
    customerPhone: '777123456',
    note: 'bez cukru',
    fulfillment: 'pickup',
    address: null,
    tableId: 'table-1',
  })
})

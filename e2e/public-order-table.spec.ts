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
      allergens: [1, 7],
      modifierGroups: [],
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

  await page.setViewportSize({ width: 390, height: 844 })
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
  await expect(page.getByText('Alergeny: 1 Lepek, 7 Mléko')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Výdej' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Rozvoz' })).toBeHidden()
  await expect(page.getByLabel('Adresa rozvozu')).toBeHidden()

  await page.getByRole('button', { name: 'Přidat' }).click()
  await page.getByRole('button', { name: 'Přidat' }).click()
  await expect(page.getByText('2 položky v košíku')).toBeVisible()
  await page.getByRole('button', { name: /^Košík$/ }).click()
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

test('QR objednávka ke stolu vyžádá povinné modifikátory a odešle volby', async ({ page }) => {
  let postedOrder: unknown = null
  const menuWithModifiers = {
    categories: [{ id: 'cat-burger', name: 'Burgery', sortOrder: 0 }],
    products: [
      {
        id: 'prod-burger',
        name: 'Burger',
        categoryId: 'cat-burger',
        priceWithVat: 189,
        vatRate: 21,
        available: true,
        modifierGroups: [
          {
            id: 'group-size',
            name: 'Velikost',
            selectionType: 'Single',
            isRequired: true,
            maxSelect: null,
            sortOrder: 0,
            options: [
              { id: 'opt-small', name: 'Malý', priceDelta: 0, sortOrder: 0 },
              { id: 'opt-large', name: 'Velký', priceDelta: 30, sortOrder: 1 },
            ],
          },
        ],
      },
    ],
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')

    if (request.method() === 'GET' && path === '/public/bistro/menu') {
      return route.fulfill({ json: menuWithModifiers })
    }
    if (request.method() === 'POST' && path === '/public/bistro/orders') {
      postedOrder = request.postDataJSON()
      return route.fulfill({
        status: 201,
        json: { orderId: 'order-qr-2', total: 219, currency: 'CZK' },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${request.method()} ${path}` } })
  })
  await dismissCookies(page)

  await page.goto('/objednavka/bistro?table=table-1&name=St%C5%AFl%201')
  await page.getByRole('button', { name: 'Vybrat' }).click()
  await expect(page.getByRole('dialog', { name: 'Vybrat možnosti' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Přidat do košíku' })).toBeDisabled()

  await page.getByRole('button', { name: /Velký/ }).click()
  await page.getByRole('button', { name: 'Přidat do košíku' }).click()
  await expect(page.getByText('1 položka v košíku')).toBeVisible()
  await page.getByRole('button', { name: /^Košík$/ }).click()
  await expect(page.getByText('Velký')).toBeVisible()
  await expect(page.getByText('1 × 219,00 Kč')).toBeVisible()

  await page.getByLabel('Jméno').fill('Host u stolu')
  await page.getByRole('button', { name: 'Odeslat objednávku' }).click()

  await expect(page.getByRole('heading', { name: 'Objednávka přijata' })).toBeVisible()
  expect(postedOrder).toEqual({
    items: [{ productId: 'prod-burger', quantity: 1, modifierOptionIds: ['opt-large'] }],
    customerName: 'Host u stolu',
    customerPhone: null,
    note: null,
    fulfillment: 'pickup',
    address: null,
    tableId: 'table-1',
  })
})

test('QR objednávka vybere variantu, ukáže její cenu a pošle jen její ID', async ({ page }) => {
  let postedOrder: unknown = null
  const menuWithVariants = {
    categories: [{ id: 'cat-drink', name: 'Nápoje', sortOrder: 0 }],
    products: [
      {
        id: 'prod-lemonade',
        name: 'Domácí limonáda',
        categoryId: 'cat-drink',
        priceWithVat: 79,
        vatRate: 12,
        available: true,
        allergens: [],
        modifierGroups: [],
        variants: [
          { id: 'variant-small', name: 'Malá', priceWithVat: 79, sortOrder: 0 },
          { id: 'variant-large', name: 'Velká', priceWithVat: 109, sortOrder: 1 },
        ],
      },
    ],
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    if (request.method() === 'GET' && path === '/public/bistro/menu')
      return route.fulfill({ json: menuWithVariants })
    if (request.method() === 'POST' && path === '/public/bistro/orders') {
      postedOrder = request.postDataJSON()
      return route.fulfill({
        status: 201,
        json: { orderId: 'order-variant-1', total: 109, currency: 'CZK' },
      })
    }
    return route.fulfill({ status: 404, json: { title: `Unhandled ${request.method()} ${path}` } })
  })
  await dismissCookies(page)
  await page.goto('/objednavka/bistro?table=table-1')

  await page.getByRole('button', { name: 'Vybrat' }).click()
  await expect(page.getByRole('dialog', { name: 'Vyberte velikost' })).toBeVisible()
  await page.getByRole('button', { name: /Velká/ }).click()
  await page.getByRole('button', { name: 'Pokračovat' }).click()
  await expect(page.getByText('Domácí limonáda · Velká')).toBeVisible()
  await expect(page.getByText('1 × 109,00 Kč')).toBeVisible()

  await page.getByLabel('Jméno').fill('Host u stolu')
  await page.getByRole('button', { name: 'Odeslat objednávku' }).click()
  await expect(page.getByRole('heading', { name: 'Objednávka přijata' })).toBeVisible()
  expect(postedOrder).toMatchObject({
    items: [{ productId: 'prod-lemonade', quantity: 1, productVariantId: 'variant-large' }],
  })
})

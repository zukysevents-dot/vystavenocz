import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

const floor = { id: 'floor-main', name: 'Sál', sortOrder: 0, locationId: null }
const tables = [
  {
    id: 'table-target',
    floorId: floor.id,
    name: 'Stůl 1',
    x: 32,
    y: 32,
    width: 110,
    height: 76,
    rotation: 0,
    seats: 4,
    shape: 'Rect',
  },
  {
    id: 'table-source',
    floorId: floor.id,
    name: 'Stůl 2',
    x: 190,
    y: 32,
    width: 110,
    height: 76,
    rotation: 0,
    seats: 4,
    shape: 'Rect',
  },
]

function paged<T>(items: T[]) {
  return { items, total: items.length, page: 1, pageSize: 200 }
}

function order(id: string, tableId: string, total: number) {
  return {
    id,
    tableId,
    locationId: null,
    status: 'Open',
    saleId: null,
    openedAt: '2026-07-13T10:00:00.000Z',
    closedAt: null,
    discountPercent: 0,
    tipAmount: 0,
    totalNet: total,
    totalVat: 0,
    total,
    splitGroups: [],
    items: [
      {
        id: 'item-' + id,
        productId: null,
        name: id === 'order-target' ? 'Espresso' : 'Limonáda',
        quantity: 1,
        unitPrice: total,
        vatRate: 0,
        course: null,
        note: null,
        kitchenSection: 'Bar',
        kitchenStatus: id === 'order-target' ? 'New' : 'Sent',
        lineTotal: total,
      },
    ],
  }
}

async function seed(page: Page) {
  await dismissCookies(page)
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

async function mockCockpit(page: Page, includeSource = true) {
  let openOrders = [order('order-target', 'table-target', 59)]
  if (includeSource) openOrders.push(order('order-source', 'table-source', 89))
  let cancelCalls = 0
  let mergeCalls = 0
  let mergePayload: unknown = null
  let itemUpdatePayload: unknown = null

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', name: 'E2E Bistro' } })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === '/categories') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged(tables) })
    if (method === 'GET' && path === '/orders') return route.fulfill({ json: paged(openOrders) })
    if (method === 'GET' && path.startsWith('/orders/')) {
      const found = openOrders.find((candidate) => candidate.id === path.split('/')[2])
      return found ? route.fulfill({ json: found }) : route.fulfill({ status: 404, json: {} })
    }
    if (method === 'PUT' && path === '/orders/order-target/items/item-order-target') {
      itemUpdatePayload = request.postDataJSON()
      const target = openOrders.find((candidate) => candidate.id === 'order-target')!
      target.items[0] = { ...target.items[0], ...(itemUpdatePayload as object) }
      return route.fulfill({ json: target })
    }
    if (method === 'POST' && path === '/orders/order-target/cancel') {
      cancelCalls++
      openOrders = openOrders.filter((candidate) => candidate.id !== 'order-target')
      return route.fulfill({ status: 204, body: '' })
    }
    if (method === 'POST' && path === '/orders/order-target/merge') {
      mergeCalls++
      mergePayload = request.postDataJSON()
      const merged = order('order-target', 'table-target', 148)
      openOrders = [merged]
      return route.fulfill({ json: merged })
    }
    return route.fulfill({ status: 404, json: { title: 'Unhandled ' + method + ' ' + path } })
  })

  return {
    cancelCalls: () => cancelCalls,
    mergeCalls: () => mergeCalls,
    mergePayload: () => mergePayload,
    itemUpdatePayload: () => itemUpdatePayload,
  }
}

test('obsluha zařadí jídlo do srozumitelného chodu a účet zobrazí oddělovač', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await seed(page)
  const calls = await mockCockpit(page, false)
  await page.goto('/app/restaurace')

  await page.getByTestId('restaurant-table-map-table-target').click()
  await page
    .getByRole('button', { name: 'Upravit poznámku a pořadí výdeje položky Espresso' })
    .click()

  await expect(page.getByRole('button', { name: 'Předkrm', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hlavní chod', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dezert', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Hlavní chod', exact: true }).click()
  await page.getByRole('button', { name: 'Uložit', exact: true }).click()

  expect(calls.itemUpdatePayload()).toEqual({ quantity: 1, note: null, course: 'Hlavní chod' })
  await expect(page.getByTestId('restaurant-course-Hlavní chod')).toContainText('Hlavní chod')
})

test('zrušení účtu neodešle požadavek před potvrzením', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await seed(page)
  const calls = await mockCockpit(page, false)
  await page.goto('/app/restaurace')

  await page.getByTestId('restaurant-table-map-table-target').click()
  await page.getByRole('button', { name: 'Další' }).click()
  await page.getByRole('button', { name: 'Zrušit účet' }).click()
  await expect(page.getByTestId('restaurant-cancel-dialog')).toBeVisible()
  expect(calls.cancelCalls()).toBe(0)

  await page.getByRole('button', { name: 'Ponechat účet' }).click()
  expect(calls.cancelCalls()).toBe(0)

  await page.getByRole('button', { name: 'Další' }).click()
  await page.getByRole('button', { name: 'Zrušit účet' }).click()
  await page.getByTestId('restaurant-confirm-cancel').click()
  await expect(page.getByTestId('restaurant-map-view')).toBeVisible()
  expect(calls.cancelCalls()).toBe(1)
})

test('sloučení je dvoukrokové a pošle přesný zdrojový účet', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await seed(page)
  const calls = await mockCockpit(page)
  await page.goto('/app/restaurace')

  await page.getByTestId('restaurant-table-map-table-target').click()
  await page.getByRole('button', { name: 'Další' }).click()
  await page.getByRole('button', { name: 'Sloučit s jiným účtem' }).click()
  await page.getByRole('button', { name: /Stůl 2/ }).click()
  expect(calls.mergeCalls()).toBe(0)
  await expect(page.getByText(/Stůl 2.*Stůl 1/)).toBeVisible()

  await page.getByRole('button', { name: 'Sloučit účty' }).click()
  await expect(page.getByText(/Účty sloučeny/)).toBeVisible()
  expect(calls.mergeCalls()).toBe(1)
  expect(calls.mergePayload()).toEqual({ sourceOrderId: 'order-source' })
})

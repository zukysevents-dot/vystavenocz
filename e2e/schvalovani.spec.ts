import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

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

function paged<T>(items: T[], status = 'Pending') {
  return { items, total: items.length, page: 1, pageSize: 20, status }
}

function request(id: string, summary: string, type: 'SaleStorno' | 'StockIssue' | 'Stocktake') {
  return {
    id,
    type,
    status: 'Pending',
    summary,
    estimatedValue: id === 'approval-storno' ? 1250 : 480,
    locationId: null,
    requestedByUserId: 'u_waiter',
    requestedByName: 'Jana Obsluha',
    createdAt: '2026-07-07T10:30:00.000Z',
    resolvedByUserId: null,
    resolvedByName: null,
    resolvedAt: null,
    resolutionNote: null,
  }
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
        user: { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Manager' },
        companyId: 'c_e2e',
        role: 'Manager',
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

test('manager nastaví limity a vyřídí čekající schválení', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  let settingsPayload: unknown
  let approvedId: string | null = null
  let rejectedId: string | null = null
  const pending = [
    request('approval-storno', 'Storno účtenky 2026-0042', 'SaleStorno'),
    request('approval-writeoff', 'Odpis položky Rum 0,04l', 'StockIssue'),
  ]

  await page.route(API, async (route: Route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = req.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })

    if (method === 'GET' && path === '/approvals/settings') {
      return route.fulfill({
        json: { stornoLimit: 1000, writeOffLimit: 300, stocktakeLimit: null },
      })
    }

    if (method === 'PUT' && path === '/approvals/settings') {
      settingsPayload = req.postDataJSON()
      return route.fulfill({ json: settingsPayload })
    }

    if (method === 'GET' && path === '/approvals') {
      const status = url.searchParams.get('status') ?? 'Pending'
      if (status !== 'Pending') return route.fulfill({ json: paged([], status) })
      return route.fulfill({
        json: paged(
          pending.filter((item) => item.id !== approvedId && item.id !== rejectedId),
          status,
        ),
      })
    }

    if (method === 'POST' && path === '/approvals/approval-storno/approve') {
      approvedId = 'approval-storno'
      return route.fulfill({
        json: { ...pending[0], status: 'Approved', resolvedAt: '2026-07-07T10:35:00.000Z' },
      })
    }

    if (method === 'POST' && path === '/approvals/approval-writeoff/reject') {
      rejectedId = 'approval-writeoff'
      return route.fulfill({
        json: { ...pending[1], status: 'Rejected', resolvedAt: '2026-07-07T10:36:00.000Z' },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/schvalovani')

  await expect(page.getByRole('heading', { name: 'Schvalování' })).toBeVisible()
  await expect(page.getByText('Storno účtenky 2026-0042')).toBeVisible()
  await expect(page.getByText('Odpis položky Rum 0,04l')).toBeVisible()

  await page.getByLabel('Limit storna').fill('1500')
  await page.getByLabel('Limit výdeje/odpisu').fill('500')
  await page.getByLabel('Limit inventury').fill('0')
  await page.getByRole('button', { name: 'Uložit limity' }).click()

  await expect(page.getByText('Limity schvalování uloženy.')).toBeVisible()
  expect(settingsPayload).toEqual({ stornoLimit: 1500, writeOffLimit: 500, stocktakeLimit: 0 })

  await page
    .locator('article')
    .filter({ hasText: 'Storno účtenky 2026-0042' })
    .getByRole('button', { name: 'Schválit' })
    .click()
  await expect(page.getByText('Žádost schválena a akce provedena.')).toBeVisible()
  await expect(page.getByText('Storno účtenky 2026-0042')).toBeHidden()

  await page
    .locator('article')
    .filter({ hasText: 'Odpis položky Rum 0,04l' })
    .getByRole('button', { name: 'Zamítnout' })
    .click()
  await expect(page.getByText('Žádost zamítnuta.')).toBeVisible()
  await expect(page.getByText('Žádné žádosti v tomhle stavu')).toBeVisible()

  await page.getByRole('button', { name: 'Schválené' }).click()
  await expect(page.getByText('Žádné žádosti v tomhle stavu')).toBeVisible()
})

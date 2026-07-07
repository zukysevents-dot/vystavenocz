import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Editor skupin modifikátorů (fáze 5): prázdný stav → vytvoření skupiny s volbou → seznam se aktualizuje.
// Reálná HTTP cesta je mockovaná přes page.route (backend má vlastní integrační testy).

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

interface PostedGroup {
  name: string
  selectionType: string
  isRequired: boolean
  maxSelect: number | null
  options: { name: string; priceDelta: number }[]
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

test('vytvoření skupiny modifikátorů přes stránku Modifikátory', async ({ page }) => {
  await seedApiMode(page)

  const groups: unknown[] = []
  let posted: PostedGroup | null = null

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/modifier-groups') return route.fulfill({ json: groups })
    if (method === 'POST' && path === '/modifier-groups') {
      posted = request.postDataJSON() as PostedGroup
      const created = {
        id: 'grp-1',
        name: posted.name,
        selectionType: posted.selectionType,
        isRequired: posted.isRequired,
        maxSelect: posted.maxSelect,
        sortOrder: 0,
        options: posted.options.map((o, i) => ({
          id: `opt-${i}`,
          name: o.name,
          priceDelta: o.priceDelta,
          sortOrder: i,
        })),
      }
      groups.push(created)
      return route.fulfill({ status: 201, json: created })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/modifikatory')

  // Prázdný stav.
  await expect(page.getByRole('heading', { name: 'Modifikátory' })).toBeVisible()
  await expect(page.getByText('Zatím žádné skupiny modifikátorů')).toBeVisible()

  // Otevřít dialog nové skupiny.
  await page
    .getByRole('button', { name: /Nová skupina/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'Nová skupina modifikátorů' })).toBeVisible()

  // Vyplnit název + první (předvyplněnou) volbu.
  await page.getByLabel('Název skupiny').fill('Velikost')
  await page.getByPlaceholder('např. Velká').first().fill('Velká')

  // Uložit → POST proběhne, dialog se zavře, seznam se obnoví.
  await page.getByRole('button', { name: /^Uložit$/ }).click()

  await expect(page.getByText('Velikost', { exact: true })).toBeVisible()
  expect(posted).not.toBeNull()
  expect(posted!.name).toBe('Velikost')
  expect(posted!.options).toHaveLength(1)
  expect(posted!.options[0].name).toBe('Velká')
})

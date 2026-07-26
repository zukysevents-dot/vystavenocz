import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Tým (správa členů a pozvánek): seznam členů s rolí a PINem, pozvánka ukáže jednorázový odkaz
// (vč. poctivé hlášky při nedoručeném e-mailu), pracovník bez e-mailu, zrušení čekající pozvánky.
// API režim s mockovanými routes (vzor api-webhooky.spec.ts) — reálný backend se nevolá.

const API = '**/api/v1/**'
const MODULES = ['core', 'invoicing', 'pos']

type Json = Record<string, unknown>
const MEMBERS: Json[] = []
const INVITATIONS: Json[] = []

async function seedApiSession(page: Page): Promise<void> {
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
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, MODULES)
}

function paged(items: Json[]): Json {
  return { items, total: items.length, page: 1, pageSize: 100 }
}

async function routeApp(page: Page, opts: { emailDelivered: boolean }): Promise<void> {
  MEMBERS.length = 0
  MEMBERS.push({
    userId: 'u_e2e',
    email: 'e2e@vystaveno.cz',
    displayName: 'E2E Test',
    role: 'Owner',
    locationId: null,
    discountLimitPercent: null,
    hasPin: false,
  })
  INVITATIONS.length = 0

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
          modules: MODULES,
          features: [],
        },
      })
    if (method === 'GET' && path === '/company/members')
      return route.fulfill({ json: paged(MEMBERS) })
    if (method === 'GET' && path === '/company/invitations')
      return route.fulfill({ json: paged(INVITATIONS) })
    if (method === 'GET' && path === '/locations') return route.fulfill({ json: paged([]) })
    if (method === 'POST' && path === '/company/invitations') {
      const body = request.postDataJSON() as Json
      const invitation = {
        id: `inv_${INVITATIONS.length + 1}`,
        email: body.email,
        role: body.role,
        locationId: null,
        status: 'Pending',
        expiresAt: '2026-08-02T00:00:00Z',
        createdAt: '2026-07-26T00:00:00Z',
      }
      INVITATIONS.push(invitation)
      return route.fulfill({
        status: 201,
        json: { invitation, token: 'tok_e2e_pozvanka', emailDelivered: opts.emailDelivered },
      })
    }
    if (method === 'DELETE' && path.startsWith('/company/invitations/')) {
      const id = path.split('/').pop()
      const found = INVITATIONS.find((i) => i.id === id)
      if (found) found.status = 'Revoked'
      return route.fulfill({ status: 204, body: '' })
    }
    if (method === 'POST' && path === '/company/members/staff') {
      const body = request.postDataJSON() as Json
      const member = {
        userId: `u_staff_${MEMBERS.length + 1}`,
        email: null,
        displayName: body.displayName,
        role: body.role,
        locationId: null,
        discountLimitPercent: null,
        hasPin: false,
      }
      MEMBERS.push(member)
      return route.fulfill({ status: 201, json: member })
    }
    if (method === 'PUT' && path.endsWith('/pin')) {
      const userId = path.split('/')[3]
      const member = MEMBERS.find((m) => m.userId === userId)
      if (member) member.hasPin = true
      return route.fulfill({ status: 204, body: '' })
    }
    return route.fulfill({ status: 404, json: { title: 'not mocked', detail: path } })
  })
}

test('pozvánka ukáže jednorázový odkaz a upozorní na nedoručený e-mail', async ({ page }) => {
  await seedApiSession(page)
  await routeApp(page, { emailDelivered: false })
  await page.goto('/app/tym')

  await expect(page.getByRole('heading', { name: 'Tým' })).toBeVisible()
  await expect(page.getByText('E2E Test')).toBeVisible()

  await page.getByRole('button', { name: 'Pozvat člena' }).click()
  await page.getByLabel('E-mail').fill('kolegyne@firma.cz')
  await page.getByRole('button', { name: 'Poslat pozvánku' }).click()

  // Jednorázový odkaz + poctivá hláška o nedoručeném e-mailu.
  const reveal = page.getByTestId('secret-reveal-dialog')
  await expect(reveal).toBeVisible()
  await expect(reveal.getByTestId('secret-value')).toContainText('/pozvanka/tok_e2e_pozvanka')
  await expect(reveal).toContainText('E-mail se nepodařilo odeslat')
  await reveal.getByRole('button', { name: 'Uložil jsem, zavřít' }).click()

  // Pozvánka je v čekajících a jde zrušit.
  await expect(page.getByText('kolegyne@firma.cz')).toBeVisible()
  await page.getByRole('button', { name: 'Zrušit pozvánku' }).click()
  await expect(page.getByText('Žádné čekající pozvánky.')).toBeVisible()
})

test('pracovník bez e-mailu se založí a dostane PIN', async ({ page }) => {
  await seedApiSession(page)
  await routeApp(page, { emailDelivered: true })
  await page.goto('/app/tym')

  await page.getByRole('button', { name: 'Pracovník bez e-mailu' }).click()
  await page.getByLabel('Jméno a příjmení').fill('Kuchař Karel')
  await page.getByLabel('Role', { exact: true }).selectOption('Kitchen')
  await page.getByRole('button', { name: 'Založit pracovníka' }).click()

  await expect(page.getByText('Kuchař Karel')).toBeVisible()
  await expect(page.getByText('Bez e-mailu — přihlašuje se jen PINem')).toBeVisible()

  // Nastavení PINu (hodnota se nikam nevrací, jen hasPin).
  await page.getByRole('button', { name: 'Nastavit PIN' }).last().click()
  await page.getByLabel('PIN (4–8 číslic)').fill('1234')
  await page.getByRole('button', { name: 'Uložit PIN' }).click()
  await expect(page.getByText('PIN nastaven', { exact: false })).toBeVisible()
})

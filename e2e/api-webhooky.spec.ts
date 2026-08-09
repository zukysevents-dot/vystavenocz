import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Nastavení firmy → API a webhooky: vytvoření tokenu ukáže plaintext JEN jednou (výpis nese jen prefix),
// vytvoření webhooku ukáže signing secret, test event potvrdí toast a historie doručení vykreslí stavy.
// API režim s mockovanými routes (vzor klienti-modules.spec.ts) — reálný backend se nevolá.

const API = '**/api/v1/**'
const MODULES = ['core', 'invoicing', 'pos', 'stock', 'loyalty', 'integrations']

const TOKEN_LIST: Array<Record<string, unknown>> = []
const WEBHOOK_LIST: Array<Record<string, unknown>> = []
const vueWarnings = new WeakMap<Page, string[]>()

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
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, MODULES)
}

async function routeApp(page: Page): Promise<void> {
  TOKEN_LIST.length = 0
  WEBHOOK_LIST.length = 0
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

    if (method === 'GET' && path === '/company/modules')
      return route.fulfill({ json: { modules: MODULES } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E Firma', currency: 'CZK' } })
    if (method === 'GET' && path === '/locations')
      return route.fulfill({ json: { items: [], total: 0 } })

    if (method === 'GET' && path === '/api-tokens') return route.fulfill({ json: TOKEN_LIST })
    if (method === 'POST' && path === '/api-tokens') {
      const body = request.postDataJSON() as { name: string; scopes: string[] }
      const token = {
        id: 'tok_1',
        name: body.name,
        tokenPrefix: 'vst_abcd1234',
        scopes: body.scopes,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: '2026-07-12T08:00:00Z',
      }
      TOKEN_LIST.push(token)
      return route.fulfill({
        status: 201,
        json: { ...token, token: 'vst_abcd1234tajnyplaintext' },
      })
    }

    if (method === 'GET' && path === '/webhook-subscriptions')
      return route.fulfill({ json: WEBHOOK_LIST })
    if (method === 'POST' && path === '/webhook-subscriptions') {
      const body = request.postDataJSON() as { url: string; events: string[]; isEnabled: boolean }
      const subscription = {
        id: 'wh_1',
        url: body.url,
        events: body.events,
        isEnabled: body.isEnabled,
        createdAt: '2026-07-12T08:00:00Z',
        updatedAt: '2026-07-12T08:00:00Z',
      }
      WEBHOOK_LIST.push(subscription)
      return route.fulfill({
        status: 201,
        json: { ...subscription, secret: 'whsec_e2e-tajny-secret' },
      })
    }
    if (method === 'POST' && path === '/webhook-subscriptions/wh_1/test')
      return route.fulfill({ status: 202, json: { eventId: 'evt_ping' } })
    if (method === 'GET' && path === '/webhook-subscriptions/wh_1/deliveries')
      return route.fulfill({
        json: {
          items: [
            {
              id: 'd1',
              eventId: 'evt_1',
              eventType: 'sale.completed',
              status: 'Succeeded',
              attemptCount: 1,
              lastHttpStatus: 200,
              lastError: null,
              nextAttemptAt: null,
              lastAttemptAt: '2026-07-12T08:05:00Z',
              createdAt: '2026-07-12T08:05:00Z',
            },
            {
              id: 'd2',
              eventId: 'evt_2',
              eventType: 'invoice.paid',
              status: 'Failed',
              attemptCount: 6,
              lastHttpStatus: 500,
              lastError: 'HTTP 500',
              nextAttemptAt: null,
              lastAttemptAt: '2026-07-12T07:00:00Z',
              createdAt: '2026-07-11T20:00:00Z',
            },
          ],
          total: 2,
          page: 1,
          pageSize: 20,
        },
      })

    return route.fulfill({ status: 404, json: { title: 'Not found (e2e mock)' } })
  })
}

test.describe('API a webhooky', () => {
  test.beforeEach(async ({ page }) => {
    const warnings: string[] = []
    vueWarnings.set(page, warnings)
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('[Vue warn]')) {
        warnings.push(message.text())
      }
    })
    await seedApiSession(page)
    await routeApp(page)
    await page.goto('/app/nastaveni/api-webhooky')
  })

  test.afterEach(async ({ page }) => {
    expect(vueWarnings.get(page) ?? []).toEqual([])
  })

  test('token se zobrazí jen jednou, výpis nese jen prefix', async ({ page }) => {
    await page.getByTestId('new-token').click()
    await page.locator('#token-name').fill('E-shop Shoptet')
    await page.getByText('Produkty (čtení)').click()
    await page.getByTestId('submit-token').click()

    // Reveal dialog ukáže plaintext přesně jednou.
    const reveal = page.getByRole('dialog', { name: 'API token vytvořen' })
    await expect(reveal).toBeVisible()
    await expect(reveal.locator('code')).toHaveText('vst_abcd1234tajnyplaintext')
    await reveal.getByRole('button', { name: 'Uložil jsem, zavřít' }).click()
    await expect(reveal).toBeHidden()

    // Výpis: jen prefix, plaintext nikde.
    await expect(page.getByTestId('token-list')).toContainText('vst_abcd1234…')
    await expect(page.getByTestId('token-list')).not.toContainText('vst_abcd1234tajnyplaintext')
  })

  test('webhook: vytvoření ukáže secret, test event potvrdí toast, historie vykreslí stavy', async ({
    page,
  }) => {
    await page.getByTestId('new-webhook').click()
    await page.locator('#webhook-url').fill('https://muj-eshop.cz/webhooky')
    await page.getByText('Prodej dokončen').click()
    await page.getByTestId('submit-webhook').click()

    const reveal = page.getByRole('dialog', { name: 'Webhook vytvořen' })
    await expect(reveal).toBeVisible()
    await expect(reveal.locator('code')).toHaveText('whsec_e2e-tajny-secret')
    await reveal.getByRole('button', { name: 'Uložil jsem, zavřít' }).click()

    await expect(page.getByTestId('webhook-list')).toContainText('https://muj-eshop.cz/webhooky')

    // Test event → potvrzující toast.
    await page.getByTestId('test-webhook-wh_1').click()
    await expect(page.getByText('Zkušební oznámení bylo zařazeno')).toBeVisible()

    // Historie doručení: úspěch i selhání s HTTP statusem a chybou.
    await page.getByRole('button', { name: 'Historie' }).click()
    const history = page.getByTestId('delivery-history')
    await expect(history).toContainText('Doručeno')
    await expect(history).toContainText('Selhalo')
    await expect(history).toContainText('HTTP 500')
  })
})

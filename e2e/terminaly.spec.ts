import { test, expect, type Page, type Route } from '@playwright/test'

const API = '**/api/v1/**'

// Registr platebních čteček. Klíčová vlastnost: terminály jsou rozdělené podle POBOČEK, protože přiřazení
// určuje, komu spadne tržba, a obsluha smí platit jen na terminálu své pobočky.
test.beforeEach(async ({ page }) => {
  await seedApiMode(page)
})

interface Device {
  id: string
  name: string
  locationId: string | null
  locationName: string | null
  isActive: boolean
}

async function routeApi(page: Page, devices: Device[], captured: { body?: unknown }) {
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/locations') {
      return route.fulfill({
        json: {
          items: [
            { id: 'loc-1', name: 'Bar A', address: null, isActive: true },
            { id: 'loc-2', name: 'Bar B', address: null, isActive: true },
          ],
          total: 2,
          page: 1,
          pageSize: 100,
        },
      })
    }
    if (method === 'GET' && path === '/integrations/payment-provider-connections') {
      return route.fulfill({
        json: [
          {
            id: 'conn-1',
            providerKey: 'sumup',
            displayName: 'SumUp — Backstreet',
            mode: 'Production',
            status: 'Ready',
            locationId: null,
            configuredFields: ['merchantCodeRef', 'apiKeyRef'],
            createdAt: '2026-08-13T10:00:00Z',
            updatedAt: '2026-08-13T10:00:00Z',
          },
        ],
      })
    }
    if (method === 'GET' && path === '/integrations/terminal-devices') {
      return route.fulfill({
        json: {
          items: devices.map((d) => ({
            ...d,
            providerKey: 'sumup',
            providerDeviceId: 'reader-' + d.id,
            providerConnectionId: 'conn-1',
            providerConnectionName: 'SumUp — Backstreet',
            configurationState: 'Ready',
            status: 'ONLINE',
            batteryLevel: 0.8,
            lastSeenAt: null,
            lastSuccessfulPaymentAt: null,
            note: null,
            createdAt: '2026-08-13T10:00:00Z',
          })),
          total: devices.length,
          page: 1,
          pageSize: 100,
        },
      })
    }
    if (method === 'POST' && path === '/integrations/terminal-devices') {
      captured.body = request.postDataJSON()
      const body = captured.body as { name: string; locationId: string | null }
      devices.push({
        id: 'dev-new',
        name: body.name,
        locationId: body.locationId,
        locationName: body.locationId === 'loc-2' ? 'Bar B' : 'Bar A',
        isActive: true,
      })
      return route.fulfill({ status: 201, json: devices.at(-1) })
    }
    return route.fulfill({ status: 200, json: {} })
  })
}

test('terminály jsou rozdělené podle poboček', async ({ page }) => {
  await routeApi(
    page,
    [
      {
        id: 'dev-1',
        name: 'Bar A — SumUp 01',
        locationId: 'loc-1',
        locationName: 'Bar A',
        isActive: true,
      },
      {
        id: 'dev-2',
        name: 'Bar B — SumUp 01',
        locationId: 'loc-2',
        locationName: 'Bar B',
        isActive: true,
      },
      { id: 'dev-3', name: 'Rezervní', locationId: null, locationName: null, isActive: true },
    ],
    {},
  )
  await page.goto('/app/nastaveni/terminaly')

  const barA = page.getByTestId('terminal-group-loc-1')
  const barB = page.getByTestId('terminal-group-loc-2')
  await expect(barA).toContainText('Bar A — SumUp 01')
  await expect(barA).not.toContainText('Bar B — SumUp 01') // terminál cizího baru nesmí spadnout do skupiny
  await expect(barB).toContainText('Bar B — SumUp 01')
  // Terminál bez pobočky má vlastní skupinu i vysvětlení — může ho použít kdokoli.
  await expect(page.getByTestId('terminal-group-none')).toContainText(
    'může použít kterákoli pobočka',
  )
})

test('spárování pošle kód i pobočku a terminál se objeví u svého baru', async ({ page }) => {
  const captured: { body?: unknown } = {}
  await routeApi(page, [], captured)
  await page.goto('/app/nastaveni/terminaly')

  await expect(page.getByTestId('terminals-empty')).toContainText('Menu → Connections')
  await page.getByTestId('register-terminal').click()

  await page.locator('#terminal-name').fill('Bar B — SumUp 02')
  await page.locator('#terminal-pairing').fill('ABCD1234')
  await page.locator('#terminal-location').click()
  await page.getByRole('option', { name: 'Bar B' }).click()
  await page.getByRole('button', { name: 'Spárovat', exact: true }).click()

  await expect(page.getByTestId('terminal-group-loc-2')).toContainText('Bar B — SumUp 02')
  expect(captured.body).toEqual({
    providerConnectionId: 'conn-1',
    name: 'Bar B — SumUp 02',
    pairingCode: 'ABCD1234',
    locationId: 'loc-2',
    note: null,
  })
})

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
        modules: ['core', 'invoicing', 'pos', 'integrations'],
        features: [],
      }),
    )
  })
}

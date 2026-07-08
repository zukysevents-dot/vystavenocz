import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'
import type { Route } from '@playwright/test'

const API = '**/api/v1/**'

test('nastavení firmy se promítne do nové faktury (číslo + splatnost)', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    company: { invoiceNumberPrefix: 'TEST', nextInvoiceSeq: 7, defaultPaymentDays: 30 },
  })
  await page.goto('/app/faktury/editor')

  const year = new Date().getFullYear()
  await expect(page.locator('#inv-number')).toHaveValue(`TEST-${year}-0007`)

  const due = new Date()
  due.setDate(due.getDate() + 30)
  await expect(page.locator('#inv-due')).toHaveValue(due.toISOString().slice(0, 10))
})

test('výchozí splatnost 0 dní → splatnost = datum vystavení', async ({ page }) => {
  await seedApp(page, { subscription: 'pro', company: { defaultPaymentDays: 0 } })
  await page.goto('/app/faktury/editor')

  const issue = await page.locator('#inv-issue').inputValue()
  await expect(page.locator('#inv-due')).toHaveValue(issue)
})

test('nastavení ukáže pravdivý stav integrací a exportů', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/nastaveni')

  await expect(page.getByRole('heading', { name: 'Nastavení firmy' })).toBeVisible()
  await expect(page.getByText('Integrace a exporty')).toBeVisible()

  await expect(page.getByText('Faktury do účetnictví')).toBeVisible()
  await expect(page.getByText('Účtárna umí exportovat faktury jako ISDOC XML')).toBeVisible()
  await expect(page.getByText('Gastro Z-reporty')).toBeVisible()
  await expect(page.getByText('denní i měsíční účetní CSV')).toBeVisible()

  await expect(page.getByText('Platební terminál')).toBeVisible()
  await expect(page.getByText('Účtenky a kuchyňské bony')).toBeVisible()
  await expect(page.getByText('Manuální krok')).toHaveCount(2)
  await expect(page.getByText('Čeká na konektor')).toBeVisible()
  await expect(page.getByText('POHODA / Money')).toBeVisible()
  await expect(page.getByText('Exportní režim')).toBeVisible()
  await expect(page.getByText('Generic CSV a POHODA XML export běží')).toBeVisible()
  await expect(page.getByText('Partnerské API')).toBeVisible()
  await expect(page.getByText('Plánováno')).toBeVisible()
})

test('nastavení v API režimu ukáže živý stav integrací a stáhne účetní export', async ({
  page,
}) => {
  await seedApiMode(page)

  let exportDownloadQuery = ''
  let registeredPrintAgentBody: unknown = null
  let revokedPrintAgentId = ''
  let createdConnectionBody: Record<string, unknown> | null = null
  const paymentConnections: Array<Record<string, unknown>> = []
  const printAgents: Array<{
    id: string
    name: string
    locationId: string | null
    lastSeenAt: string | null
    createdAt: string
  }> = [
    {
      id: 'agent-1',
      name: 'Kuchyně tiskárna',
      locationId: 'loc-1',
      lastSeenAt: new Date().toISOString(),
      createdAt: '2026-07-08T11:00:00Z',
    },
  ]
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') {
      return route.fulfill({
        json: {
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
        },
      })
    }
    if (method === 'GET' && path === '/company/modules') {
      return route.fulfill({
        json: { modules: ['core', 'invoicing', 'pos', 'gastro', 'reporting', 'integrations'] },
      })
    }
    if (method === 'GET' && path === '/locations') {
      return route.fulfill({
        json: {
          items: [{ id: 'loc-1', name: 'Bistro Praha', address: null, isActive: true }],
          total: 1,
          page: 1,
          pageSize: 100,
        },
      })
    }
    if (method === 'GET' && path === '/integrations/terminal-payments') {
      const pendingOnly = url.searchParams.get('status') === 'Pending'
      return route.fulfill({
        json: {
          items: pendingOnly
            ? []
            : [
                {
                  id: 'pay-1',
                  provider: 'manual',
                  status: 'Succeeded',
                  amount: 209,
                  currency: 'CZK',
                  orderId: null,
                  locationId: 'loc-1',
                  reference: 'order-1-card',
                  providerReference: null,
                  failureReason: null,
                  createdAt: '2026-07-08T12:00:00Z',
                  updatedAt: '2026-07-08T12:01:00Z',
                },
              ],
          total: pendingOnly ? 2 : 1,
          page: 1,
          pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        },
      })
    }
    if (method === 'GET' && path === '/integrations/print-jobs') {
      const queuedOnly = url.searchParams.get('status') === 'Queued'
      return route.fulfill({
        json: {
          items: queuedOnly
            ? []
            : [
                {
                  id: 'print-1',
                  type: 'KitchenTicket',
                  status: 'Queued',
                  printer: 'kitchen',
                  payload: 'Burger',
                  relatedOrderId: 'order-1',
                  relatedSaleId: null,
                  relatedDayCloseId: null,
                  locationId: 'loc-1',
                  failureReason: null,
                  createdAt: '2026-07-08T12:02:00Z',
                  updatedAt: '2026-07-08T12:02:00Z',
                },
              ],
          total: queuedOnly ? 1 : 1,
          page: 1,
          pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        },
      })
    }
    if (method === 'GET' && path === '/integrations/print-agents') {
      return route.fulfill({ json: printAgents })
    }
    if (method === 'POST' && path === '/integrations/print-agents') {
      registeredPrintAgentBody = request.postDataJSON()
      const created = {
        id: 'agent-2',
        name: 'Bar tiskárna',
        locationId: null,
        token: 'pat_test_print_agent_token',
        lastSeenAt: null,
        createdAt: '2026-07-08T12:10:00Z',
      }
      printAgents.push({
        id: created.id,
        name: created.name,
        locationId: created.locationId,
        lastSeenAt: created.lastSeenAt,
        createdAt: created.createdAt,
      })
      return route.fulfill({ status: 201, json: created })
    }
    if (method === 'DELETE' && path.startsWith('/integrations/print-agents/')) {
      revokedPrintAgentId = path.split('/').at(-1) ?? ''
      return route.fulfill({ status: 204 })
    }
    if (method === 'GET' && path === '/integrations/payment-providers/catalog') {
      return route.fulfill({
        json: [
          {
            key: 'manual',
            name: 'Manuální terminál',
            category: 'terminal',
            status: 'operational',
            isOperational: true,
            supportsInPerson: true,
            supportsOnline: false,
            supportsWebhooks: false,
            requiresPartnerContract: false,
            requiresCredentials: false,
            setupFields: [],
            notes: 'Obsluha potvrzuje výsledek platby ručně.',
          },
          {
            key: 'csob',
            name: 'ČSOB',
            category: 'hybrid',
            status: 'planned',
            isOperational: false,
            supportsInPerson: true,
            supportsOnline: true,
            supportsWebhooks: true,
            requiresPartnerContract: true,
            requiresCredentials: true,
            setupFields: ['merchantId', 'apiKey'],
            notes: 'Vyžaduje smlouvu s ČSOB a přístup do platební brány.',
          },
          {
            key: 'nfctron',
            name: 'NFCTRON',
            category: 'terminal',
            status: 'planned',
            isOperational: false,
            supportsInPerson: true,
            supportsOnline: false,
            supportsWebhooks: true,
            requiresPartnerContract: true,
            requiresCredentials: true,
            setupFields: ['deviceId'],
            notes: 'Bezhotovostní terminál pro gastro a eventy.',
          },
        ],
      })
    }
    if (method === 'GET' && path === '/integrations/payment-provider-connections') {
      return route.fulfill({ json: paymentConnections })
    }
    if (method === 'POST' && path === '/integrations/payment-provider-connections') {
      createdConnectionBody = request.postDataJSON()
      const created = {
        id: 'conn-1',
        ...createdConnectionBody,
        createdAt: '2026-07-08T13:00:00Z',
        updatedAt: '2026-07-08T13:00:00Z',
      }
      paymentConnections.push(created)
      return route.fulfill({ status: 201, json: created })
    }
    if (method === 'PUT' && path.startsWith('/integrations/payment-provider-connections/')) {
      return route.fulfill({
        json: { id: path.split('/').at(-1), ...(request.postDataJSON() as object) },
      })
    }
    if (method === 'DELETE' && path.startsWith('/integrations/payment-provider-connections/')) {
      return route.fulfill({ status: 204 })
    }
    if (method === 'GET' && path === '/integrations/exports/download') {
      exportDownloadQuery = url.search
      return route.fulfill({
        headers: {
          'content-type': 'application/xml',
          'content-disposition': 'attachment; filename="pohoda-zreports.xml"',
        },
        body: '<dataPack id="E2E" />',
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/nastaveni')

  await expect(page.getByText('Účetní export')).toBeVisible()
  await expect(page.getByText('2 plateb čeká')).toBeVisible()
  await expect(page.getByText('1 tisků čeká')).toBeVisible()
  await expect(page.getByText('209,00 Kč')).toBeVisible()
  await expect(page.getByText('Bon', { exact: true })).toBeVisible()
  await expect(page.getByText('Tiskoví agenti')).toBeVisible()
  await expect(page.getByText('Kuchyně tiskárna')).toBeVisible()
  await expect(page.getByText('Online', { exact: true })).toBeVisible()

  // Platební provideri — provider-neutral marketplace (ČSOB/NFCTRON jako cíle, ne Stripe-first, bez "zaplatit").
  await expect(page.getByText('Platební provideri')).toBeVisible()
  await expect(page.getByText('ČSOB', { exact: true })).toBeVisible() // název karty (ne úvodní text/poznámka)
  await expect(page.getByText('NFCTRON', { exact: true })).toBeVisible()
  await expect(page.getByText('Aktivní', { exact: true })).toHaveCount(1) // jen manuální terminál je operational
  await expect(page.getByText('Připraveno k napojení')).toHaveCount(2) // ČSOB + NFCTRON (planned)
  await expect(page.getByText('Online platby')).toBeVisible() // capability badge ČSOB
  await expect(page.getByText('Vyžaduje smlouvu s poskytovatelem.').first()).toBeVisible()
  // Marketplace nikdy nenabízí platbu ani netvrdí, že plánovaný provider ostře funguje.
  await expect(page.getByRole('button', { name: /zaplatit/i })).toHaveCount(0)

  // Konfigurace providera — dialog bez ukládání tajných hodnot (ČSOB je 2. v katalogu: manual, csob, nfctron).
  await page.getByRole('button', { name: 'Nastavit' }).nth(1).click()
  await expect(page.getByRole('heading', { name: 'Nastavit ČSOB' })).toBeVisible()
  await expect(page.getByText('Tajné klíče se do aplikace neukládají')).toBeVisible()
  await page.locator('#conn-name').fill('ČSOB terminál Praha')
  // Zaškrtnout jen jedno setup pole (merchantId); hodnota se nikam nezadává (placeholder input je disabled).
  await page.getByRole('dialog').getByRole('checkbox').first().click()
  await page.getByRole('button', { name: 'Vytvořit konfiguraci' }).click()
  await expect(page.getByText('ČSOB terminál Praha')).toBeVisible() // konfigurace se objeví v seznamu dialogu

  // Payload NIKDY nenese tajné hodnoty — jen metadata a checklist názvů připravených polí.
  expect(createdConnectionBody).toEqual({
    providerKey: 'csob',
    name: 'ČSOB terminál Praha',
    mode: 'sandbox',
    status: 'draft',
    locationId: null,
    configuredFields: ['merchantId'],
  })
  await page.keyboard.press('Escape') // zavřít modal před dalším krokem (print agent)
  await expect(page.getByRole('heading', { name: 'Nastavit ČSOB' })).toBeHidden()

  await page.locator('#print-agent-name').fill('Bar tiskárna')
  await page.getByRole('button', { name: 'Přidat' }).click()
  await expect(page.getByText('Token pro Bar tiskárna')).toBeVisible()
  await expect(page.locator('#print-agent-token')).toHaveValue('pat_test_print_agent_token')
  expect(registeredPrintAgentBody).toEqual({ name: 'Bar tiskárna', locationId: null })

  await page.getByRole('button', { name: 'Zrušit agenta' }).first().click()
  expect(revokedPrintAgentId).toBe('agent-1')

  await page.locator('#integration-export-target').click()
  await page.getByRole('option', { name: 'Pohoda XML' }).click()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Stáhnout XML' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('pohoda-zreports.xml')
  expect(exportDownloadQuery).toContain('type=ZReports')
  expect(exportDownloadQuery).toContain('target=Pohoda')
  expect(exportDownloadQuery).toContain('format=Xml')
})

test('veřejný slug se normalizuje pro online objednávky a QR stoly', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/nastaveni')

  await page.locator('#public_slug').fill('  Žluťoučký Bistro 2026!!  ')
  await page.locator('#public_slug').blur()

  await expect(page.locator('#public_slug')).toHaveValue('zlutoucky-bistro-2026')
  await expect(page.getByText(/\/objednavka\/zlutoucky-bistro-2026/)).toBeVisible()

  await page.getByRole('button', { name: 'Uložit nastavení' }).click()
  await expect(page.getByText('Nastavení uloženo')).toBeVisible()

  const storedSlug = await page.evaluate(() => {
    const raw = localStorage.getItem('vystaveno.company.v1')
    return raw ? JSON.parse(raw).publicSlug : null
  })
  expect(storedSlug).toBe('zlutoucky-bistro-2026')
})

async function seedApiMode(page: Parameters<typeof seedApp>[0]): Promise<void> {
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
        modules: ['core', 'invoicing', 'pos', 'gastro', 'reporting', 'integrations'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

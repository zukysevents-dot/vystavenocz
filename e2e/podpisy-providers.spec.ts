import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Nastavení poskytovatelů ověřených podpisů + credential trezor — testováno v API mock režimu (Playwright route mock).
// Modul verified_signing (ne integrations). Backend endpointy /api/v1/verified-signing/* mockujeme jako budoucí kontrakt.

const API = '**/api/v1/**'

const BANKID_CREDENTIAL_FIELDS = ['clientSecretRef', 'certificateRef']

test('provider podpisů: katalog, vytvoření konfigurace a credential trezor (uložit → vyčistit → smazat)', async ({
  page,
}) => {
  await seedApiMode(page)
  const connections: Array<Record<string, unknown>> = []
  const secrets: Record<string, Record<string, string>> = {}
  await routeSigning(page, connections, secrets)
  await page.goto('/app/podpisy')

  await page.getByRole('tab', { name: 'Provider podpisů' }).click()

  // Katalog: BankID připravené k napojení (netvrdí ostrý podpis hotový).
  const bankidCard = page.getByTestId('signing-provider-bankid')
  await expect(bankidCard.getByText('BankID')).toBeVisible()
  await expect(bankidCard.getByText('Připraveno k napojení')).toBeVisible()

  // Vytvořit konfiguraci BankID.
  await bankidCard.getByRole('button', { name: 'Nastavit' }).click()
  await expect(page.getByRole('heading', { name: 'Nastavit BankID' })).toBeVisible()
  await page.locator('#sign-conn-name').fill('BankID produkce')
  await page.getByRole('button', { name: 'Vytvořit konfiguraci' }).click()
  await expect(page.getByText('BankID produkce')).toBeVisible()

  // Upravit konfiguraci → načte se trezor (obě credential pole chybí).
  await page.getByTitle('Upravit konfiguraci').click()
  await expect(page.getByTestId('signing-credential-vault')).toBeVisible()
  const field = page.getByTestId('signing-secret-clientSecretRef')
  await expect(field.getByTestId('signing-secret-state-clientSecretRef')).toHaveText('Chybí')

  // Uložit klíč → input se vyčistí, stav = Uloženo (hodnota se nikdy nezobrazí).
  await page.locator('#signing-secret-input-clientSecretRef').fill('super-secret-client-key')
  await field.getByRole('button', { name: 'Uložit klíč' }).click()
  await expect(field.getByTestId('signing-secret-state-clientSecretRef')).toHaveText('Uloženo')
  await expect(page.locator('#signing-secret-input-clientSecretRef')).toHaveValue('')
  await expect(page.getByText('Klíč uložen do zabezpečeného trezoru.')).toBeVisible()

  // Smazat klíč → zpět na Chybí.
  await field.getByTitle('Odstranit klíč z trezoru').click()
  await expect(field.getByTestId('signing-secret-state-clientSecretRef')).toHaveText('Chybí')
})

test('provider podpisů: 503 při chybějícím serverovém šifrovacím klíči', async ({ page }) => {
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 503' })
  await seedApiMode(page)
  const connections: Array<Record<string, unknown>> = [
    {
      id: 'sign-conn-1',
      providerKey: 'bankid',
      name: 'BankID produkce',
      mode: 'sandbox',
      status: 'awaiting_credentials',
      configuredFields: ['clientId'],
      createdAt: '2026-07-09T10:00:00Z',
      updatedAt: '2026-07-09T10:00:00Z',
    },
  ]
  await routeSigning(page, connections, {}, { put503: true })
  await page.goto('/app/podpisy')

  await page.getByRole('tab', { name: 'Provider podpisů' }).click()
  await page
    .getByTestId('signing-provider-bankid')
    .getByRole('button', { name: 'Nastavit' })
    .click()
  await page.getByTitle('Upravit konfiguraci').click()
  await page.locator('#signing-secret-input-clientSecretRef').fill('secret')
  await page
    .getByTestId('signing-secret-clientSecretRef')
    .getByRole('button', { name: 'Uložit klíč' })
    .click()

  await expect(page.getByText(/šifrovací klíč na backendu/i)).toBeVisible()
})

test('podpisy: odeslat obálku přes Ready provider connection (providerConnectionId + reference)', async ({
  page,
}) => {
  await seedApiMode(page)
  let sendBody: Record<string, unknown> | null = null

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company/modules') {
      return route.fulfill({ json: { modules: ['core', 'verified_signing'] } })
    }
    if (method === 'GET' && path === '/company') {
      return route.fulfill({ json: { id: 'c_e2e', name: 'E2E', currency: 'CZK' } })
    }
    if (method === 'GET' && path === '/verified-signing/envelopes') {
      return route.fulfill({ json: [readyEnvelope()] })
    }
    if (method === 'GET' && path === '/verified-signing/envelopes/env-1/evidence') {
      return route.fulfill({
        json: {
          envelopeId: 'env-1',
          documentName: 'Smlouva k podpisu',
          evidenceHash: 'abc',
          provider: 'bankid',
          entries: [],
        },
      })
    }
    if (method === 'GET' && path === '/verified-signing/providers') {
      return route.fulfill({ json: [] })
    }
    if (method === 'GET' && path === '/verified-signing/provider-connections') {
      return route.fulfill({
        json: [
          {
            id: 'sign-conn-ready',
            providerKey: 'bankid',
            name: 'BankID produkce',
            mode: 'production',
            status: 'ready',
            configuredFields: ['clientId'],
            requiredCredentialFields: BANKID_CREDENTIAL_FIELDS,
            storedCredentialFields: BANKID_CREDENTIAL_FIELDS,
            createdAt: '2026-07-09T10:00:00Z',
            updatedAt: '2026-07-09T10:00:00Z',
          },
        ],
      })
    }
    if (method === 'POST' && path === '/verified-signing/envelopes/env-1/send') {
      sendBody = request.postDataJSON() as Record<string, unknown>
      return route.fulfill({
        json: {
          ...readyEnvelope(),
          status: 'sent',
          sentAt: '2026-07-09T15:00:00Z',
          providerReference: 'prov-ref-XYZ',
        },
      })
    }
    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/podpisy')

  // Obálky tab je výchozí; otevři Ready obálku → detail nabídne výběr provider connection (předvybraná Ready).
  await page.getByTestId('envelope-env-1').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('send-connection-picker')).toBeVisible()

  await page.getByRole('button', { name: 'Odeslat k podpisu' }).click()

  await expect(page.getByTestId('provider-reference')).toHaveText('prov-ref-XYZ')
  await expect(page.getByTestId('detail-status')).toHaveText('Odesláno')
  expect(sendBody).toEqual({ providerConnectionId: 'sign-conn-ready' })
})

function readyEnvelope(): Record<string, unknown> {
  return {
    id: 'env-1',
    documentName: 'Smlouva k podpisu',
    documentType: 'contract',
    externalReference: 'ORDER-1',
    status: 'ready',
    provider: 'bankid',
    providerLabel: 'BankID',
    signer: { name: 'Jan Novák', email: null, phone: null },
    evidenceHash: 'abc',
    providerReference: null,
    createdAt: '2026-07-09T09:00:00Z',
    sentAt: null,
    signedAt: null,
    expiresAt: null,
  }
}

async function routeSigning(
  page: Page,
  connections: Array<Record<string, unknown>>,
  secrets: Record<string, Record<string, string>>,
  opts: { put503?: boolean } = {},
): Promise<void> {
  const fieldStatus = (connectionId: string) => {
    const stored = secrets[connectionId] ?? {}
    const fields = BANKID_CREDENTIAL_FIELDS.map((f) => ({
      fieldName: f,
      required: true,
      hasSecret: Boolean(stored[f]),
      updatedAt: stored[f] ?? null,
    }))
    return {
      connectionId,
      providerKey: 'bankid',
      fields,
      allRequiredPresent: fields.every((x) => x.hasSecret),
    }
  }
  const withSummary = (conn: Record<string, unknown>) => ({
    ...conn,
    requiredCredentialFields: BANKID_CREDENTIAL_FIELDS,
    storedCredentialFields: Object.keys(secrets[conn.id as string] ?? {}),
  })

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
        json: { modules: ['core', 'invoicing', 'pos', 'reporting', 'verified_signing'] },
      })
    }
    if (method === 'GET' && path === '/verified-signing/envelopes') {
      return route.fulfill({ json: [] })
    }
    if (method === 'GET' && path === '/verified-signing/providers') {
      return route.fulfill({
        json: [
          {
            key: 'mock',
            name: 'Testovací poskytovatel',
            category: 'verified-identity',
            status: 'operational-dev',
            isOperational: true,
            requiresPartnerContract: false,
            requiresCredentials: false,
            setupFields: [],
            credentialFields: [],
            notes: 'Auto-schválení pro testy/dev.',
          },
          {
            key: 'bankid',
            name: 'BankID',
            category: 'verified-identity',
            status: 'planned-adapter',
            isOperational: false,
            requiresPartnerContract: true,
            requiresCredentials: true,
            setupFields: ['clientId', 'environment', 'redirectUrl', ...BANKID_CREDENTIAL_FIELDS],
            credentialFields: BANKID_CREDENTIAL_FIELDS,
            notes: 'Připravené k napojení — ostrý podpis po smlouvě a credentialech.',
          },
        ],
      })
    }
    if (method === 'GET' && path === '/verified-signing/provider-connections') {
      return route.fulfill({ json: connections.map(withSummary) })
    }
    if (method === 'POST' && path === '/verified-signing/provider-connections') {
      const body = request.postDataJSON() as Record<string, unknown>
      const created = {
        id: 'sign-conn-1',
        ...body,
        createdAt: '2026-07-09T13:00:00Z',
        updatedAt: '2026-07-09T13:00:00Z',
      }
      connections.push(created)
      return route.fulfill({ status: 201, json: withSummary(created) })
    }
    if (method === 'PUT' && /\/provider-connections\/[^/]+$/.test(path)) {
      const id = path.split('/').at(-1) ?? ''
      const body = request.postDataJSON() as Record<string, unknown>
      const idx = connections.findIndex((c) => c.id === id)
      if (idx >= 0) connections[idx] = { ...connections[idx], ...body }
      return route.fulfill({ json: withSummary({ id, ...body }) })
    }
    if (method === 'DELETE' && /\/provider-connections\/[^/]+$/.test(path)) {
      const id = path.split('/').at(-1) ?? ''
      const idx = connections.findIndex((c) => c.id === id)
      if (idx >= 0) connections.splice(idx, 1)
      delete secrets[id]
      return route.fulfill({ status: 204 })
    }
    if (method === 'GET' && /\/provider-connections\/[^/]+\/secrets$/.test(path)) {
      return route.fulfill({ json: fieldStatus(path.split('/').at(-2) ?? '') })
    }
    if (method === 'PUT' && /\/provider-connections\/[^/]+\/secrets\/[^/]+$/.test(path)) {
      if (opts.put503) return route.fulfill({ status: 503, json: { title: 'Vault unavailable' } })
      const parts = path.split('/')
      const connectionId = parts.at(-3) ?? ''
      const field = parts.at(-1) ?? ''
      secrets[connectionId] = { ...(secrets[connectionId] ?? {}), [field]: '2026-07-09T14:00:00Z' }
      return route.fulfill({ json: fieldStatus(connectionId) })
    }
    if (method === 'DELETE' && /\/provider-connections\/[^/]+\/secrets\/[^/]+$/.test(path)) {
      const parts = path.split('/')
      const connectionId = parts.at(-3) ?? ''
      const field = parts.at(-1) ?? ''
      if (secrets[connectionId]) delete secrets[connectionId][field]
      return route.fulfill({ status: 204 })
    }
    if (method === 'DELETE' && /\/provider-connections\/[^/]+\/secrets$/.test(path)) {
      delete secrets[path.split('/').at(-2) ?? '']
      return route.fulfill({ status: 204 })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
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
        modules: ['core', 'invoicing', 'pos', 'reporting', 'verified_signing'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
    // Odbav cookie consent, ať banner nepřekrývá akce (fixed bottom-right).
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  })
}

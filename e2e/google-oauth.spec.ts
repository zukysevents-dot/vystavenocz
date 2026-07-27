import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Přihlášení a registrace přes Google z pohledu uživatele. Backend je zamockovaný — tady se
// ověřuje, co vidí a kam se dostane člověk: jedno tlačítko na obou stránkách, zrušení bez falešné
// chyby, propojení existujícího účtu heslem a to, že se v adresním řádku nedrží autorizační kód.

const API = '**/api/v1/**'

type CallbackResult =
  | { kind: 'tokens'; returnTo?: string | null; companyId?: string | null }
  | { kind: 'link'; email: string }

async function apiMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-27T00:00:00.000Z' }),
    )
  })
}

/** Zamockovaný poskytovatel: `/start` vrátí URL zpět na náš callback, takže test neopouští origin. */
async function routeOauth(
  page: Page,
  result: CallbackResult,
  opts: { linkPasswordOk?: boolean } = {},
): Promise<{ startCalls: () => number }> {
  let startCalls = 0

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'POST' && path === '/auth/external/google/start') {
      startCalls++
      return route.fulfill({
        json: {
          authorizeUrl: '/oauth/callback?code=test-code&state=test-state',
          state: 'test-state',
        },
      })
    }

    if (method === 'POST' && path === '/auth/external/google/callback') {
      if (result.kind === 'link') {
        return route.fulfill({
          json: {
            tokens: null,
            linkRequired: { ticket: 'ticket-123', email: result.email },
            returnTo: null,
          },
        })
      }
      return route.fulfill({
        json: {
          tokens: { accessToken: 'acc', refreshToken: 'ref' },
          linkRequired: null,
          returnTo: result.returnTo ?? null,
        },
      })
    }

    if (method === 'POST' && path === '/auth/external/link/confirm') {
      if (opts.linkPasswordOk === false) {
        return route.fulfill({ status: 401, json: { title: 'Unauthorized' } })
      }
      return route.fulfill({ json: { accessToken: 'acc', refreshToken: 'ref' } })
    }

    if (method === 'GET' && path === '/me') {
      const companyId =
        result.kind === 'tokens' && 'companyId' in result ? result.companyId : 'c_e2e'
      return route.fulfill({
        json: {
          userId: 'u_g',
          email: 'novy@gmail.com',
          displayName: 'Nový Uživatel',
          companyId,
          role: 'Owner',
          modules: ['core', 'invoicing'],
          features: [],
          companies: [],
        },
      })
    }

    // Po přihlášení se otevře Přehled a načítá data. Testujeme přihlášení, ne dashboard — proto
    // prázdné, ale TVAROVĚ správné odpovědi (jinak stránka zaloguje chybu a shodí fixture).
    if (method === 'GET' && path.startsWith('/dashboard'))
      return route.fulfill({ json: { items: [], series: [], metrics: {} } })
    if (method === 'GET')
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } })
    return route.fulfill({ json: {} })
  })

  return { startCalls: () => startCalls }
}

test('přihlašovací stránka nabízí Google jako druhou cestu vedle e-mailu', async ({ page }) => {
  await apiMode(page)
  await routeOauth(page, { kind: 'tokens' })
  await page.goto('/prihlaseni')

  await expect(page.getByRole('button', { name: 'Pokračovat přes Google' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Přihlásit se', exact: true })).toBeVisible()
})

test('registrační stránka nabízí stejný Google flow s vlastním textem', async ({ page }) => {
  await apiMode(page)
  await routeOauth(page, { kind: 'tokens' })
  await page.goto('/registrace')

  await expect(page.getByRole('button', { name: 'Registrovat se přes Google' })).toBeVisible()
})

test('nový Google účet bez firmy pokračuje do onboardingu a v URL nezůstane kód', async ({
  page,
}) => {
  await apiMode(page)
  await routeOauth(page, { kind: 'tokens', companyId: null })
  await page.goto('/registrace')

  await page.getByRole('button', { name: 'Registrovat se přes Google' }).click()

  await expect(page).toHaveURL(/\/app\/onboarding$/)
  expect(page.url()).not.toContain('code=')
  expect(page.url()).not.toContain('state=')
})

test('existující Google účet se přihlásí a vrátí na původně chtěnou stránku', async ({ page }) => {
  await apiMode(page)
  await routeOauth(page, { kind: 'tokens', returnTo: '/app/faktury' })
  await page.goto('/prihlaseni?redirect=/app/faktury')

  await page.getByRole('button', { name: 'Pokračovat přes Google' }).click()

  await expect(page).toHaveURL(/\/app\/faktury$/)
})

test('dvojklik na tlačítko nezaloží dvě přihlášení', async ({ page }) => {
  await apiMode(page)
  const { startCalls } = await routeOauth(page, { kind: 'tokens' })
  await page.goto('/prihlaseni')

  const button = page.getByRole('button', { name: 'Pokračovat přes Google' })
  await button.click({ force: true })
  await button.click({ force: true, timeout: 1000 }).catch(() => {
    /* tlačítko je po prvním kliknutí zablokované — přesně o to jde */
  })

  await expect(page).toHaveURL(/\/app/)
  expect(startCalls()).toBe(1)
})

test('zrušení u Googlu není chyba — uživatel se vrátí s vysvětlením', async ({ page }) => {
  await apiMode(page)
  await routeOauth(page, { kind: 'tokens' })
  await page.goto('/oauth/callback?error=access_denied')

  await expect(page.getByText('Přihlášení přes Google bylo zrušeno.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zpět na přihlášení' })).toBeVisible()
  expect(page.url()).not.toContain('error=')
})

test('selhání poskytovatele řekne, co dělat, a neukáže technický detail', async ({ page }) => {
  await apiMode(page)
  await routeOauth(page, { kind: 'tokens' })
  await page.goto('/oauth/callback?error=server_error')

  await expect(
    page.getByText('Přihlášení přes Google se nepodařilo dokončit. Zkuste to prosím znovu.'),
  ).toBeVisible()
  await expect(page.getByText(/401|500|state|token/i)).toHaveCount(0)
})

test('e-mail existujícího účtu se nepropojí sám — vyžádá si heslo', async ({ page }) => {
  await apiMode(page)
  await routeOauth(page, { kind: 'link', email: 'majitel@firma.cz' })
  await page.goto('/prihlaseni')

  await page.getByRole('button', { name: 'Pokračovat přes Google' }).click()

  await expect(page.getByText('Tento e-mail už ve Vystaveno používáte')).toBeVisible()
  await expect(page.getByText('majitel@firma.cz')).toBeVisible()

  await page.getByLabel('Heslo').fill('SpravneHeslo1')
  await page.getByRole('button', { name: 'Propojit účty' }).click()

  await expect(page).toHaveURL(/\/app/)
})

test('špatné heslo při propojení nepustí dál a nenapoví, co bylo špatně', async ({ page }) => {
  // Test schválně vyvolá odmítnutí serverem — prohlížeč pak zaloguje network chybu.
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 401' })
  await apiMode(page)
  await routeOauth(page, { kind: 'link', email: 'majitel@firma.cz' }, { linkPasswordOk: false })
  await page.goto('/prihlaseni')

  await page.getByRole('button', { name: 'Pokračovat přes Google' }).click()
  // Počkat na obrazovku propojení — jinak by `fill` trefil pole na přihlašovací stránce.
  await expect(page.getByText('Tento e-mail už ve Vystaveno používáte')).toBeVisible()
  await page.getByLabel('Heslo').fill('spatne')
  await page.getByRole('button', { name: 'Propojit účty' }).click()

  await expect(page.getByText('Heslo se nepodařilo ověřit. Zkuste to prosím znovu.')).toBeVisible()
  await expect(page).toHaveURL(/\/oauth\/callback/)
})

test('cizí returnTo ze serveru se ignoruje (žádný odchod mimo aplikaci)', async ({ page }) => {
  await apiMode(page)
  await routeOauth(page, { kind: 'tokens', returnTo: 'https://zlyweb.cz/app' })
  await page.goto('/prihlaseni')

  await page.getByRole('button', { name: 'Pokračovat přes Google' }).click()

  await expect(page).toHaveURL(/localhost.*\/app$/)
})

test('na mobilu je tlačítko dosažitelné a čitelné', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await apiMode(page)
  await routeOauth(page, { kind: 'tokens' })
  await page.goto('/prihlaseni')

  const button = page.getByRole('button', { name: 'Pokračovat přes Google' })
  await expect(button).toBeVisible()
  const box = await button.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(40)
})

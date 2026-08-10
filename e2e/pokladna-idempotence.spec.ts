import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Regrese k festivalovému nálezu: na slabé síti obsluha zopakuje platbu po timeoutu.
// Bez idempotency klíče vznikly DVA prodeje (dvojí naúčtování + dvojí výdej ze skladu).
// Test hlídá, že opakovaný pokus se STEJNÝM košíkem posílá TÝŽ klíč a že změna košíku dá klíč nový.

const API = '**/api/v1/**'

function paged<T>(items: T[], pageSize = 100) {
  return { items, total: items.length, page: 1, pageSize }
}

const company = {
  id: 'c_e2e',
  name: 'Festival Bar',
  ico: '12345678',
  dic: null,
  email: 'bar@vystaveno.cz',
  phone: null,
  logoUrl: null,
  defaultDueDays: 14,
  currency: 'CZK',
  address: { street: 'Louka 1', city: 'Praha', postalCode: '11000', country: 'CZ' },
  bankAccount: { accountNumber: '123456789/0100', iban: null, bic: null },
  publicSlug: 'festival-bar',
}

const location = {
  id: 'loc-bar',
  name: 'Bar u pódia',
  address: 'Louka 1',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const pivo = {
  id: 'prod-pivo',
  name: 'Pivo 0,5l',
  sku: 'PIVO05',
  ean: '8594001020306',
  salePrice: 60,
  vatRate: 21,
  purchasePrice: 20,
  minQuantity: 0,
  categoryId: null,
  allergens: [],
}

async function seedApiMode(page: Page, opts: { loyalty?: boolean } = {}): Promise<void> {
  // BEZ modulu loyalty pokladna nevolá /promotions/calculate — testy idempotence tak cílí jen na prodej.
  const modules = opts.loyalty ? ['core', 'pos', 'stock', 'loyalty'] : ['core', 'pos', 'stock']
  await page.addInitScript((mods: string[]) => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    localStorage.setItem(
      'vystaveno.auth.tokens.v1',
      JSON.stringify({ accessToken: 'e2e-access', refreshToken: 'e2e-refresh' }),
    )
    localStorage.setItem(
      'vystaveno.auth.session.v1',
      JSON.stringify({
        user: { id: 'u_e2e', email: 'bar@vystaveno.cz', fullName: 'Barman Bob' },
        companyId: 'c_e2e',
        role: 'Owner',
        modules: mods,
        features: [],
      }),
    )
  }, modules)
}

/** Nasměruje API na mock a vrátí seznam idempotency klíčů odeslaných na POST /sales. */
async function routeApi(page: Page, opts: { failFirstSale: boolean }): Promise<string[]> {
  const keys: string[] = []
  let saleAttempts = 0

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET') {
      if (path === '/company') return route.fulfill({ json: company })
      if (path === '/products') return route.fulfill({ json: paged([pivo]) })
      if (path === `/products/${pivo.id}/variants`) return route.fulfill({ json: [] })
      if (path === '/locations') return route.fulfill({ json: paged([location]) })
      if (path === '/categories') return route.fulfill({ json: paged([]) })
      if (path === '/sales') return route.fulfill({ json: paged([]) })
      if (path === '/sales/summary')
        return route.fulfill({
          json: {
            date: '2026-08-05',
            count: 0,
            totalNet: 0,
            totalVat: 0,
            total: 0,
            cashTotal: 0,
            cardTotal: 0,
          },
        })
    }

    if (method === 'POST' && path === '/sales') {
      saleAttempts++
      keys.push((request.postDataJSON() as { idempotencyKey?: string }).idempotencyKey ?? '')
      // 1. pokus: spojení spadne (výpadek Wi-Fi uprostřed platby).
      if (opts.failFirstSale && saleAttempts === 1) return route.abort('connectionfailed')
      const body = request.postDataJSON() as { items: { quantity: number; unitPrice: number }[] }
      const total = body.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
      return route.fulfill({
        status: 201,
        json: {
          id: `sale-${saleAttempts}`,
          locationId: location.id,
          paymentMethod: 'Card',
          status: 'Completed',
          discountPercent: 0,
          tipAmount: 0,
          cashReceived: null,
          cashChange: null,
          totalNet: Math.round((total / 1.21) * 100) / 100,
          totalVat: Math.round((total - total / 1.21) * 100) / 100,
          total,
          createdAt: '2026-08-05T10:00:00Z',
          redeemPoints: 0,
          redeemDiscount: 0,
          earnedPoints: 0,
          items: [],
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  return keys
}

async function addPivo(page: Page, times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await page.getByRole('button', { name: new RegExp(pivo.name) }).click()
  }
}

// Platba kartou = nejkratší cesta dialogem (terminál zatím není propojený, výsledek se potvrzuje ručně).
async function payCard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Zaplatit' }).click()
  await page.getByRole('button', { name: /Kartou/ }).click()
  await page.getByRole('button', { name: /Platba prošla/ }).click()
}

test('opakovaná platba po výpadku sítě pošle TÝŽ idempotency klíč (nenaúčtuje dvakrát)', async ({
  page,
}) => {
  // Přerušené spojení je záměr testu — prohlížeč ho zaloguje jako chybu.
  test.info().annotations.push({ type: 'allowConsoleError', description: 'ERR_CONNECTION_FAILED' })
  test.info().annotations.push({ type: 'allowConsoleError', description: 'Failed to fetch' })

  await seedApiMode(page)
  await dismissCookies(page)
  const keys = await routeApi(page, { failFirstSale: true })

  await page.goto('/app/pokladna')
  await addPivo(page, 2)

  // 1. pokus — spojení spadne. Platební dialog zůstává otevřený, aby obsluha mohla zkusit znovu.
  await payCard(page)
  await expect(page.getByText(/nepodařilo dokončit/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Platba prošla/ })).toBeVisible()

  // 2. pokus — stejný košík, tedy stejný klíč: server vrátí původní prodej místo druhého naúčtování.
  await page.getByRole('button', { name: /Platba prošla/ }).click()
  await expect(page.getByText(/Zaplaceno/)).toBeVisible()

  expect(keys).toHaveLength(2)
  expect(keys[0]).toBeTruthy()
  expect(keys[1]).toBe(keys[0])
})

test('selhání náhledu akcí NEZABLOKUJE platbu (cenu autoritativně počítá server)', async ({
  page,
}) => {
  test.info().annotations.push({ type: 'allowConsoleError', description: 'ERR_CONNECTION_FAILED' })
  test.info().annotations.push({ type: 'allowConsoleError', description: 'Failed to fetch' })

  await seedApiMode(page, { loyalty: true })
  await dismissCookies(page)
  const keys = await routeApi(page, { failFirstSale: false })
  // Náhled akcí je na slabé síti nedostupný — dřív to obsluze úplně zablokovalo pokladnu.
  await page.route('**/api/v1/promotions/calculate', (route) => route.abort('connectionfailed'))
  await page.route('**/api/v1/price-levels*', (route) => route.fulfill({ json: paged([]) }))
  await page.route('**/api/v1/customers*', (route) => route.fulfill({ json: paged([]) }))
  await page.route('**/api/v1/loyalty/settings', (route) =>
    route.fulfill({
      json: { earnRateCzkPerPoint: 0, pointValueCzk: 0, maxRedeemPointsPerSale: 0 },
    }),
  )

  await page.goto('/app/pokladna')
  await addPivo(page, 1)
  await payCard(page)

  await expect(page.getByText(/Zaplaceno/)).toBeVisible()
  expect(keys).toHaveLength(1)
})

test('po zrušené platbě dostane STEJNĚ vypadající nákup NOVÝ klíč (nespojí se s cizí účtenkou)', async ({
  page,
}) => {
  // Nejnebezpečnější festivalový případ: platba spadne, obsluha účtenku zahodí a další host si
  // koupí PŘESNĚ TOTÉŽ. Když by se recykloval klíč z neúspěšného pokusu, server by vrátil původní
  // prodej — pokladní vidí „Zaplaceno", ale druhá tržba nikde není a sklad se neodečte.
  test.info().annotations.push({ type: 'allowConsoleError', description: 'ERR_CONNECTION_FAILED' })
  test.info().annotations.push({ type: 'allowConsoleError', description: 'Failed to fetch' })

  await seedApiMode(page)
  await dismissCookies(page)
  const keys = await routeApi(page, { failFirstSale: true })

  await page.goto('/app/pokladna')
  await addPivo(page, 1)

  await payCard(page)
  await expect(page.getByText(/nepodařilo dokončit/i)).toBeVisible()

  // Obsluha pokus vzdá a účtenku zahodí.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Vyprázdnit' }).click()
  await expect(page.getByRole('button', { name: 'Vyprázdnit' })).toBeHidden()

  // Další host, shodná objednávka → musí to být NOVÁ účtenka, ne recyklovaný pokus.
  await addPivo(page, 1)
  await payCard(page)
  await expect(page.getByText(/Zaplaceno/)).toBeVisible()

  expect(keys).toHaveLength(2)
  expect(keys[1]).not.toBe(keys[0])
})

test('platba s nejistým koncem přežije refresh a pošle obsluhu tržbu ověřit', async ({ page }) => {
  // Tablet se může zavřít přesně ve chvíli, kdy prodej na serveru vzniká. Klíč pokusu žije jen
  // v paměti stránky, takže po refreshi už opakování NEJDE zachytit idempotencí — obsluha musí
  // dostat varování, ne prázdnou pokladnu, do které naúčtuje podruhé.
  test.info().annotations.push({ type: 'allowConsoleError', description: 'ApiError: Server error' })
  test
    .info()
    .annotations.push({ type: 'allowConsoleError', description: 'Failed to load resource' })

  await seedApiMode(page)
  await dismissCookies(page)
  await routeApi(page, { failFirstSale: false })
  // Server odpoví 500 — prodej mohl vzniknout, ale odpověď se ztratila.
  await page.route('**/api/v1/sales', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    return route.fulfill({ status: 500, json: { title: 'Server error' } })
  })

  await page.goto('/app/pokladna')
  await addPivo(page, 1)
  await payCard(page)
  await expect(page.getByText(/nepodařilo dokončit/i)).toBeVisible()

  // Obsluha (nebo prohlížeč) stránku obnoví — košík je pryč, ale varování musí zůstat.
  await page.reload()
  const banner = page.getByTestId('pos-unresolved-payment')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText(/nevíme, jestli se zapsala/i)

  // Když to obsluha vyřeší, varování zmizí i po dalším načtení.
  await banner.getByRole('button', { name: 'Vyřešeno' }).click()
  await expect(banner).toBeHidden()
  await page.reload()
  await expect(page.getByTestId('pos-unresolved-payment')).toBeHidden()
})

test('dokončený prodej po refreshi ŽÁDNÉ varování nenechá', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)
  await routeApi(page, { failFirstSale: false })

  await page.goto('/app/pokladna')
  await addPivo(page, 1)
  await payCard(page)
  await expect(page.getByText(/Zaplaceno/)).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('pos-unresolved-payment')).toBeHidden()
})

test('nový prodej dostane NOVÝ idempotency klíč (dva různé nákupy se nesloučí)', async ({
  page,
}) => {
  await seedApiMode(page)
  await dismissCookies(page)
  const keys = await routeApi(page, { failFirstSale: false })

  await page.goto('/app/pokladna')
  await addPivo(page, 1)
  await payCard(page)
  await expect(page.getByText(/Zaplaceno/)).toBeVisible()
  await page.getByRole('button', { name: 'Hotovo' }).click()

  await addPivo(page, 1)
  await payCard(page)
  await expect(page.getByText(/Zaplaceno/).last()).toBeVisible()

  expect(keys).toHaveLength(2)
  expect(keys[0]).toBeTruthy()
  expect(keys[1]).not.toBe(keys[0])
})

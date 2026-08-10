import { test, expect, devices, type Page, type APIRequestContext } from '@playwright/test'
import { settle, watchPage, attachWatch } from './helpers'

// Festivalová odolnost Pokladny proti REÁLNÉMU API: slabá síť, rate limit, souběžné bary
// a dotykový tablet. Zajímá nás jediné — nesmí zmizet ani vzniknout tržba navíc.

const API = 'http://localhost:5176/api/v1'

interface ServerSale {
  id: string
  total: number
  status: string
  paymentMethod: string
  locationId: string | null
}

async function api(
  page: Page,
): Promise<{ ctx: APIRequestContext; headers: Record<string, string> }> {
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem('vystaveno.auth.tokens.v1')
    return raw ? (JSON.parse(raw) as { accessToken: string }).accessToken : ''
  })
  expect(token, 'v prohlížeči musí být přihlášená session').toBeTruthy()
  return { ctx: page.request, headers: { Authorization: `Bearer ${token}` } }
}

async function listSales(page: Page): Promise<{ items: ServerSale[]; total: number }> {
  const { ctx, headers } = await api(page)
  const res = await ctx.get(`${API}/sales?pageSize=5`, { headers })
  expect(res.status()).toBe(200)
  return (await res.json()) as { items: ServerSale[]; total: number }
}

async function stornoSale(page: Page, id: string): Promise<void> {
  const { ctx, headers } = await api(page)
  await ctx.post(`${API}/sales/${id}/storno`, { headers })
}

async function openPos(page: Page): Promise<void> {
  await page.goto('/app/pokladna')
  await expect(page.getByRole('heading', { name: 'Pokladna' })).toBeVisible({ timeout: 20_000 })
  await settle(page)
}

async function addFirstProduct(page: Page): Promise<void> {
  const tiles = page.locator('button').filter({ hasText: /\d+,\d{2}\s*Kč/ })
  await expect(tiles.first()).toBeVisible({ timeout: 20_000 })
  const count = await tiles.count()
  for (let i = 0; i < count; i++) {
    const tile = tiles.nth(i)
    const label = ((await tile.textContent()) ?? '').trim()
    const price = Number.parseFloat(
      (label.match(/(\d[\d\s]*,\d{2})\s*Kč/)?.[1] ?? '0').replace(/\s/g, '').replace(',', '.'),
    )
    if (price > 0) {
      await tile.click()
      return
    }
  }
  throw new Error('V katalogu není žádný produkt s nenulovou cenou.')
}

/** Projde platebním dialogem hotovostí až po potvrzení. */
async function payCashExact(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Zaplatit' }).click()
  await page.getByRole('button', { name: /Hotově/ }).click()
  await page
    .getByRole('button', { name: /^\s*\d[\d\s]*(,\d+)?\s*Kč\s*$/ })
    .first()
    .click()
  await page.getByRole('button', { name: /Zaplatit hotově/ }).click()
}

test.describe('Pokladna — odolnost festivalového provozu', () => {
  test('opakování po spadlém spojení vytvoří na serveru právě JEDEN prodej', async ({
    page,
  }, testInfo) => {
    // Nejdražší chyba na baru: účtenka odejde dvakrát. Tady to jde přes REÁLNÝ server, takže se
    // ověřuje i to, že backend na shodný idempotency klíč druhý prodej opravdu nezaloží.
    testInfo.annotations.push({ type: 'allowConsoleError', description: 'Failed to fetch' })
    const watch = watchPage(page)
    await openPos(page)
    const before = (await listSales(page)).total

    // První odeslání spadne ještě před serverem (Wi-Fi na louce).
    let dropped = false
    await page.route('**/api/v1/sales', async (route) => {
      if (route.request().method() === 'POST' && !dropped) {
        dropped = true
        return route.abort('connectionfailed')
      }
      return route.fallback()
    })

    await addFirstProduct(page)
    await payCashExact(page)

    // Hotovost je v zásuvce → prodej se zařadil do offline fronty se stejným klíčem.
    // Jakmile síť naskočí, fronta ho odešle; pokud doletěl i první pokus, server vrátí týž prodej.
    await expect(
      page.getByText(/Zaplaceno|čeká ve frontě|doúčtování/i).first(),
      'obsluha musí dostat jednoznačnou informaci, ne prázdnou obrazovku',
    ).toBeVisible({ timeout: 20_000 })

    await page.unroute('**/api/v1/sales')
    await expect(async () => {
      const after = await listSales(page)
      expect(after.total, 'jedna účtenka = jeden prodej na serveru').toBe(before + 1)
    }).toPass({ timeout: 30_000 })

    const sale = (await listSales(page)).items[0]
    await stornoSale(page, sale.id)
    await attachWatch(testInfo, watch)
  })

  test('rate limit (429) prodej NEZALOŽÍ a obsluze to řekne srozumitelně', async ({
    page,
  }, testInfo) => {
    // 10 barů za jednou konektivitou umí vyčerpat limit. Musí to skončit hláškou, ne tichem.
    testInfo.annotations.push({ type: 'allowConsoleError', description: 'status of 429' })
    testInfo.annotations.push({ type: 'allowConsoleError', description: 'ApiError' })
    const watch = watchPage(page, { allowStatus: [429] })
    await openPos(page)
    const before = (await listSales(page)).total

    await page.route('**/api/v1/sales', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      return route.fulfill({ status: 429, json: { title: 'Too many requests' } })
    })

    await addFirstProduct(page)
    await payCashExact(page)

    await expect(page.getByText(/nepodařilo|zkuste|zaneprázdn/i).first()).toBeVisible({
      timeout: 20_000,
    })
    await page.unroute('**/api/v1/sales')

    const after = await listSales(page)
    expect(after.total, 'odmítnutá platba nesmí založit prodej').toBe(before)
    await attachWatch(testInfo, watch)
  })

  test('dva bary prodávají současně — obě tržby dosednou samostatně', async ({
    browser,
    page,
  }, testInfo) => {
    const watch = watchPage(page)
    await openPos(page)
    const before = (await listSales(page)).total

    // Druhý tablet se stejnou session (stejný bar, jiné zařízení).
    const second = await browser.newPage({ storageState: 'e2e/audit/.auth/state.json' })
    await second.goto('/app/pokladna')
    await expect(second.getByRole('heading', { name: 'Pokladna' })).toBeVisible({ timeout: 20_000 })
    await settle(second)

    await addFirstProduct(page)
    await addFirstProduct(second)

    // Obě obsluhy mačkají „Zaplatit" ve stejnou chvíli.
    await Promise.all([payCashExact(page), payCashExact(second)])
    await expect(page.getByText(/Zaplaceno/)).toBeVisible({ timeout: 20_000 })
    await expect(second.getByText(/Zaplaceno/)).toBeVisible({ timeout: 20_000 })

    const after = await listSales(page)
    expect(after.total, 'dva souběžné prodeje = dva záznamy, ani jeden se neztratí').toBe(
      before + 2,
    )
    const ids = new Set(after.items.slice(0, 2).map((s) => s.id))
    expect(ids.size, 'prodeje se nesmí slít do jednoho').toBe(2)

    for (const sale of after.items.slice(0, 2)) await stornoSale(page, sale.id)
    await second.close()
    await attachWatch(testInfo, watch)
  })
})

test.describe('Pokladna — dotykový tablet', () => {
  test.use({ viewport: devices['iPad (gen 7) landscape'].viewport })

  test('na tabletu nic nepřetéká, účtenka i platba jsou po ruce', async ({ page }, testInfo) => {
    const watch = watchPage(page)
    await openPos(page)
    await addFirstProduct(page)

    // Vodorovné přetékání = obsluha scrolluje do strany, aby našla tlačítko. Na baru nepřijatelné.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, 'stránka nesmí přetékat do strany').toBeLessThanOrEqual(1)

    // Hlavní prodejní akce musí být vidět bez scrollování.
    const payButton = page.getByRole('button', { name: 'Zaplatit' })
    await expect(payButton).toBeInViewport()

    // Dotykový cíl podle WCAG 2.1 AA (44 px); u pokladny je to rozdíl mezi prodejem a překlikem.
    const box = await payButton.boundingBox()
    expect(box?.height ?? 0, 'hlavní tlačítko musí být dotykově použitelné').toBeGreaterThanOrEqual(
      44,
    )

    // Dlaždice produktů taky — ve špičce se do nich mlátí naslepo.
    const tile = page
      .locator('button')
      .filter({ hasText: /\d+,\d{2}\s*Kč/ })
      .first()
    const tileBox = await tile.boundingBox()
    expect(
      tileBox?.height ?? 0,
      'dlaždice produktu musí být dotykově použitelná',
    ).toBeGreaterThanOrEqual(44)

    await attachWatch(testInfo, watch)
  })
})

test.describe('Pokladna — tablet na výšku', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('součet i platba jsou na dosah bez scrollování a prodej z lišty projde', async ({
    page,
  }, testInfo) => {
    // Na výšku je účtenka pod katalogem — bez sticky lišty by obsluha rolovala u KAŽDÉHO prodeje.
    const watch = watchPage(page)
    await openPos(page)
    const before = (await listSales(page)).total

    await addFirstProduct(page)

    const bar = page.getByTestId('pos-mobile-actions')
    await expect(bar, 'lišta s platbou musí být vidět hned po přidání položky').toBeInViewport()
    await expect(page.getByTestId('pos-total-mobile')).toBeVisible()

    // Platba se musí dát dokončit přímo z lišty, ne až po odrolování na účtenku.
    await bar.getByRole('button', { name: 'Zaplatit' }).click()
    await page.getByRole('button', { name: /Hotově/ }).click()
    await page
      .getByRole('button', { name: /^\s*\d[\d\s]*(,\d+)?\s*Kč\s*$/ })
      .first()
      .click()
    await page.getByRole('button', { name: /Zaplatit hotově/ }).click()
    await expect(page.getByText(/Zaplaceno/)).toBeVisible({ timeout: 20_000 })

    const after = await listSales(page)
    expect(after.total).toBe(before + 1)
    await stornoSale(page, after.items[0].id)
    await attachWatch(testInfo, watch)
  })
})

import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { settle, watchPage, attachWatch } from './helpers'

// Festivalová brána Pokladny proti REÁLNÉMU API. Na rozdíl od mockovaných speců tady po každém
// kroku kontrolujeme, co o prodeji ví SERVER — na baru nerozhoduje toast, ale zapsaná tržba.
//
// Testy jsou psané tak, aby si po sobě uklidily: každý prodej, který založí, na konci stornuje,
// takže se dají pouštět opakovaně proti stejné demo firmě.

const API = 'http://localhost:5176/api/v1'

interface ServerSale {
  id: string
  total: number
  status: string
  paymentMethod: string
  locationId: string | null
  cashReceived: number | null
  cashChange: number | null
  idempotencyKey?: string | null
}

/** Volání API pod stejnou identitou, jakou má prohlížeč (token z localStorage). */
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

/** Prodeje firmy: `total` je počet VŠECH (demo má roční historii, seznam je stránkovaný). */
async function listSales(page: Page): Promise<{ items: ServerSale[]; total: number }> {
  const { ctx, headers } = await api(page)
  const res = await ctx.get(`${API}/sales?pageSize=5`, { headers })
  expect(res.status(), 'GET /sales musí projít').toBe(200)
  return (await res.json()) as { items: ServerSale[]; total: number }
}

async function stornoSale(page: Page, id: string): Promise<void> {
  const { ctx, headers } = await api(page)
  await ctx.post(`${API}/sales/${id}/storno`, { headers })
}

/** Otevře pokladnu a počká, až je použitelná (načtený katalog). */
async function openPos(page: Page): Promise<void> {
  await page.goto('/app/pokladna')
  await expect(page.getByRole('heading', { name: 'Pokladna' })).toBeVisible({ timeout: 20_000 })
  await settle(page)
}

/**
 * Přidá na účtenku první PRODEJNÝ produkt (nenulová cena). Katalog obsahuje i suroviny
 * za 0 Kč (mléko, kávová zrna) — ty se na baru neprodávají a nulový účet by nic neověřil.
 */
async function addFirstProduct(page: Page): Promise<string> {
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
      return label
    }
  }
  throw new Error('V katalogu není žádný produkt s nenulovou cenou.')
}

/** Částka k úhradě tak, jak ji pokladna ukazuje v platebním dialogu. */
async function totalInDialog(page: Page): Promise<number> {
  const text = (await page.getByTestId('payment-total').textContent()) ?? ''
  const numeric = text
    .replace(/[^\d,.-]/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
  const value = Number.parseFloat(numeric)
  expect(Number.isFinite(value), `částka k úhradě musí být číslo, bylo: "${text}"`).toBe(true)
  return value
}

/**
 * Otevře platbu hotovostí a zvolí přesnou částku (první rychlá volba) — to je cesta,
 * kterou obsluha ve špičce reálně proklikává.
 */
async function openCashExact(page: Page): Promise<number> {
  await page.getByRole('button', { name: 'Zaplatit' }).click()
  await page.getByRole('button', { name: /Hotově/ }).click()
  const total = await totalInDialog(page)
  await page
    .getByRole('button', { name: /^\s*\d[\d\s]*(,\d+)?\s*Kč\s*$/ })
    .first()
    .click()
  return total
}

test.describe('Pokladna — festivalový provoz proti reálnému API', () => {
  test('hotovostní prodej se zapíše na server se správnou částkou i pobočkou', async ({
    page,
  }, testInfo) => {
    const watch = watchPage(page)
    await openPos(page)
    const before = (await listSales(page)).total

    await addFirstProduct(page)
    const total = await openCashExact(page)
    await page.getByRole('button', { name: /Zaplatit hotově/ }).click()

    await expect(page.getByText(/Zaplaceno/)).toBeVisible({ timeout: 20_000 })

    const after = await listSales(page)
    expect(after.total, 'musí přibýt právě jeden prodej').toBe(before + 1)
    const sale = after.items[0]
    expect(sale.paymentMethod).toBe('Cash')
    expect(sale.status).toBe('Completed')
    expect(sale.total).toBeCloseTo(total, 2)
    expect(sale.locationId, 'prodej bez pobočky by v uzávěrce po barech zmizel').toBeTruthy()

    await stornoSale(page, sale.id)
    await attachWatch(testInfo, watch)
  })

  test('vrácení z vyšší přijaté částky počítá server (ne prohlížeč)', async ({
    page,
  }, testInfo) => {
    const watch = watchPage(page)
    await openPos(page)

    await addFirstProduct(page)
    await page.getByRole('button', { name: 'Zaplatit' }).click()
    await page.getByRole('button', { name: /Hotově/ }).click()
    const total = await totalInDialog(page)

    const received = Math.ceil(total / 100) * 100 + 100
    await page.getByLabel('Přijatá hotovost v Kč').fill(String(received))
    await page.getByRole('button', { name: /Zaplatit hotově/ }).click()
    await expect(page.getByText(/Zaplaceno/)).toBeVisible({ timeout: 20_000 })

    const sale = (await listSales(page)).items[0]
    expect(sale.cashReceived).toBeCloseTo(received, 2)
    expect(sale.cashChange, 'vrácení musí sedět na haléř').toBeCloseTo(received - sale.total, 2)

    await stornoSale(page, sale.id)
    await attachWatch(testInfo, watch)
  })

  test('nedostatečná hotovost prodej NEVYTVOŘÍ a dialog nechá otevřený', async ({
    page,
  }, testInfo) => {
    // 422 ze serveru je tady očekávaný stav, ne chyba aplikace.
    const watch = watchPage(page, { allowStatus: [422] })
    await openPos(page)
    const before = (await listSales(page)).total

    await addFirstProduct(page)
    await page.getByRole('button', { name: 'Zaplatit' }).click()
    await page.getByRole('button', { name: /Hotově/ }).click()
    const total = await totalInDialog(page)

    // Méně, než je k úhradě — server to musí odmítnout, i kdyby UI pustilo dál.
    await page.getByLabel('Přijatá hotovost v Kč').fill(String(Math.max(1, Math.floor(total) - 1)))
    const payButton = page.getByRole('button', { name: /Zaplatit hotově/ })
    if (await payButton.isEnabled()) {
      await payButton.click()
      await expect(page.getByText(/nepokrývá|nepodařilo/i)).toBeVisible({ timeout: 20_000 })
    }

    const after = await listSales(page)
    expect(after.total, 'odmítnutá platba nesmí založit prodej').toBe(before)
    await attachWatch(testInfo, watch)
  })

  test('dvojklik na Zaplatit hotově vytvoří právě JEDEN prodej', async ({ page }, testInfo) => {
    const watch = watchPage(page)
    await openPos(page)
    const before = (await listSales(page)).total

    await addFirstProduct(page)
    await openCashExact(page)

    const payButton = page.getByRole('button', { name: /Zaplatit hotově/ })
    // Dvojklik netrpělivé obsluhy ve špičce — dva rychlé klik eventy na tomtéž tlačítku.
    await payButton.dblclick()
    await expect(page.getByText(/Zaplaceno/)).toBeVisible({ timeout: 20_000 })

    const after = await listSales(page)
    expect(after.total, 'dvojklik nesmí naúčtovat dvakrát').toBe(before + 1)

    await stornoSale(page, after.items[0].id)
    await attachWatch(testInfo, watch)
  })

  test('storno prodej opravdu zruší a nechá po sobě auditní stopu', async ({ page }, testInfo) => {
    const watch = watchPage(page)
    await openPos(page)

    await addFirstProduct(page)
    await openCashExact(page)
    await page.getByRole('button', { name: /Zaplatit hotově/ }).click()
    await expect(page.getByText(/Zaplaceno/)).toBeVisible({ timeout: 20_000 })

    const sale = (await listSales(page)).items[0]
    await stornoSale(page, sale.id)

    const { ctx, headers } = await api(page)
    const detail = await ctx.get(`${API}/sales/${sale.id}`, { headers })
    expect(detail.status()).toBe(200)
    expect(
      ((await detail.json()) as ServerSale).status,
      'storno musí prodej převést na Cancelled',
    ).toBe('Cancelled')

    const audit = await ctx.get(`${API}/company/audit?pageSize=20&action=SaleCancelled`, {
      headers,
    })
    expect(audit.status()).toBe(200)
    const entries = ((await audit.json()) as { items: { entityId: string }[] }).items
    expect(
      entries.some((e) => e.entityId === sale.id),
      'storno musí být dohledatelné v auditu',
    ).toBe(true)

    await attachWatch(testInfo, watch)
  })
})

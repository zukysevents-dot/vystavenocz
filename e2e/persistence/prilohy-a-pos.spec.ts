import { test, expect, type Page } from '@playwright/test'
import { expectWrite, loginFresh, settle, toast, unique } from './helpers'

// Dvě zvláštní cesty ukládání: nahrání souboru (multipart) a automatické (debouncované)
// uložení slevy/spropitného na otevřeném účtu v restauraci.
// Testy slevy pracují se stejným (prvním) stolem — paralelně by si účet přebíraly.
test.describe.configure({ mode: 'serial' })

test('nahraný soubor u zakázky zůstane po reloadu i po novém přihlášení', async ({
  page,
  browser,
}) => {
  const jobName = unique('E2E Přílohy')
  await page.goto('/app/zakazky')
  await settle(page)
  await page.getByRole('button', { name: 'Nová zakázka' }).click()
  await page.locator('#job-name').fill(jobName)
  await expectWrite(page, 'POST', /\/jobs$/, () =>
    page.getByRole('button', { name: 'Vytvořit', exact: true }).click(),
  )
  await expect(page).toHaveURL(/\/app\/zakazky\/[\w-]+/)
  const detailUrl = new URL(page.url()).pathname
  await settle(page)

  const fileName = `e2e-priloha-${Date.now().toString(36)}.png`
  // Nejmenší platné PNG (1×1 px) — soubor musí projít kontrolou typu na backendu.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const upload = page.waitForResponse(
    (r) => r.request().method() === 'POST' && /\/files$/.test(new URL(r.url()).pathname),
  )
  await page.locator('input[type="file"]').setInputFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: png,
  })
  expect((await upload).status(), 'POST /jobs/{id}/files').toBeLessThan(300)
  await expect(page.getByText(fileName).first()).toBeVisible()

  await page.reload()
  await settle(page)
  await expect(page.getByText(fileName).first()).toBeVisible()

  const fresh = await loginFresh(browser)
  await fresh.page.goto(detailUrl)
  await settle(fresh.page)
  await expect(fresh.page.getByText(fileName).first()).toBeVisible()
  await fresh.close()
})

test('příliš velký soubor se neuloží a uživatel dostane hlášku', async ({ page }) => {
  const jobName = unique('E2E Velký soubor')
  await page.goto('/app/zakazky')
  await settle(page)
  await page.getByRole('button', { name: 'Nová zakázka' }).click()
  await page.locator('#job-name').fill(jobName)
  await expectWrite(page, 'POST', /\/jobs$/, () =>
    page.getByRole('button', { name: 'Vytvořit', exact: true }).click(),
  )
  await settle(page)

  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e-velky.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(11 * 1024 * 1024, 1), // limit backendu je 10 MiB
  })
  await expect(toast(page, /velk|10 MB|nepodařilo/i)).toBeVisible()
  await page.reload()
  await settle(page)
  await expect(page.getByText('e2e-velky.png')).toHaveCount(0)
})

/** Otevře účet na prvním stole a v něm panel Úpravy se slevou. */
async function openAccountAdjustments(page: Page) {
  await page.goto('/app/restaurace')
  await settle(page)
  // Na širokém displeji je vizuální mapa, na úzkém kompaktní seznam — obojí vede na stejnou akci.
  const table = page
    .locator('[data-testid^="restaurant-table-map-"], [data-testid^="restaurant-table-list-"]')
    .filter({ visible: true })
    .first()
  await expect(table).toBeVisible()
  await table.click()
  await settle(page)
  const productTile = page.locator('[data-testid^="restaurant-product-"]').first()
  await expect(productTile).toBeVisible()
  await productTile.click()
  await settle(page)
  await page.getByRole('button', { name: 'Úpravy' }).click()
  const discount = page.locator('#restaurant-discount')
  await expect(discount).toBeVisible()
  return { table, discount }
}

test('na pomalé síti skončí uložená sleva na POSLEDNÍ zadané hodnotě', async ({ page }) => {
  // První uložení uměle zdržíme — dvě souběžná uložení se nesmí na serveru srovnat obráceně.
  let firstPatch = true
  await page.route('**/orders/*/discount', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback()
    if (firstPatch) {
      firstPatch = false
      await new Promise((r) => setTimeout(r, 2500))
    }
    await route.fallback()
  })

  const { discount } = await openAccountAdjustments(page)
  await discount.fill('5')
  await page.waitForTimeout(700) // debounce 500 ms → první uložení odejde a „zamrzne"
  await discount.fill('25')

  // Počkej, až doběhnou obě uložení (zdržené i následné).
  await expect.poll(() => discount.inputValue(), { timeout: 15_000 }).toBe('25')
  await page.waitForTimeout(3000)
  await page.unroute('**/orders/*/discount')

  await page.reload()
  await settle(page)
  const reopened = await openAccountAdjustments(page)
  await expect(reopened.discount).toHaveValue('25')
})

test('sleva na účtu se automaticky uloží a přežije odchod ze stolu', async ({ page }) => {
  const { discount } = await openAccountAdjustments(page)

  // Rychlé psaní za sebou: mezistavy se odeslat můžou, ale uložená musí zůstat POSLEDNÍ hodnota.
  const saves: number[] = []
  page.on('response', async (r) => {
    if (r.request().method() !== 'PATCH') return
    if (!/\/discount$/.test(new URL(r.url()).pathname)) return
    expect(r.status(), 'PATCH /orders/{id}/discount').toBeLessThan(300)
    saves.push((await r.json().catch(() => ({}))).discountPercent)
  })
  await discount.fill('5')
  await discount.fill('10')
  await discount.fill('15')
  await expect.poll(() => saves.at(-1), { timeout: 15_000 }).toBe(15)

  await page.reload()
  await settle(page)
  const reopened = await openAccountAdjustments(page)
  await expect(reopened.discount).toHaveValue('15')
})

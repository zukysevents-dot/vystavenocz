import { test, expect, devices, type Page } from '@playwright/test'
import { apiContext, expectWrite, settle, toast, unique } from './helpers'

// Ukládání na mobilu. Historický nález: dlouhé jméno klienta (nebo produktu) roztáhlo řádek
// seznamu, stránka přetekla do šířky, mobilní prohlížeč kvůli tomu odzoomoval a tlačítko
// v dialogu skončilo POD překryvem — na telefonu pak nešlo uložit vůbec nic.

test.use({ ...devices['Pixel 7'] })

const LONG_NAME = `E2E Dlouhý ${'x'.repeat(90)}`
const cleanup: string[] = []

test.beforeAll(async () => {
  const api = await apiContext()
  const res = await api.post('clients', {
    data: { name: LONG_NAME, country: 'CZ', defaultPaymentDays: 14 },
  })
  expect(res.status(), 'příprava klienta s dlouhým jménem').toBe(201)
  cleanup.push((await res.json()).id)
  const prod = await api.post('products', {
    data: { name: LONG_NAME, sku: `E2EL${Date.now().toString(36)}`, salePrice: 100, vatRate: 21 },
  })
  if (prod.status() < 300) cleanup.push(`produkt:${(await prod.json()).id}`)
  await api.dispose()
})

test.afterAll(async () => {
  const api = await apiContext()
  for (const id of cleanup) {
    if (id.startsWith('produkt:')) await api.delete(`products/${id.slice(8)}`)
    else await api.delete(`clients/${id}`)
  }
  const list = (await (await api.get('clients?pageSize=100')).json()).items as Array<{
    id: string
    name: string
  }>
  for (const c of list.filter((x) => x.name.startsWith('E2E Mobil'))) {
    await api.delete(`clients/${c.id}`)
  }
  await api.dispose()
})

/** Šířka dokumentu nesmí přesáhnout viewport — jinak prohlížeč odzoomuje a rozbije ovládání. */
async function expectNoOverflow(page: Page, kde: string): Promise<void> {
  const m = await page.evaluate(() => ({
    vw: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
  }))
  expect(m.scrollW, `${kde}: vodorovné přetečení stránky`).toBeLessThanOrEqual(m.vw + 1)
  expect(m.vw, `${kde}: prohlížeč odzoomoval (layout širší než displej)`).toBeLessThan(500)
}

test('dlouhé názvy nerozbijí šířku seznamů', async ({ page }) => {
  for (const path of ['/app/klienti', '/app/sklad']) {
    await page.goto(path)
    await settle(page)
    await expectNoOverflow(page, path)
  }
})

test('na telefonu jde uložit nový klient', async ({ page }) => {
  const name = unique('E2E Mobil')
  await page.goto('/app/klienti')
  await settle(page)
  await expectNoOverflow(page, 'seznam klientů')

  await page.getByRole('button', { name: 'Nový klient' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('#c-name').fill(name)
  await expectNoOverflow(page, 'otevřený dialog')

  const status = await expectWrite(page, 'POST', /\/clients$/, () =>
    page.getByRole('button', { name: 'Vytvořit klienta' }).click(),
  )
  expect(status, 'POST /clients z mobilu').toBe(201)
  await expect(toast(page, 'Klient vytvořen')).toBeVisible()

  await page.reload()
  await settle(page)
  await page
    .getByPlaceholder(/Hledat/)
    .first()
    .fill(name)
  await expect(page.locator('div.divide-y > div').filter({ hasText: name })).toBeVisible()
})

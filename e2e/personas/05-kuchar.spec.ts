import { request } from '@playwright/test'
import { test, expect, go, visibleNavLabels } from './fixtures'
import { API_URL, PERSONAS, authFile, personaEmail, personaPassword } from './personas'

// PERSONA 5 — Kuchař (role Kitchen: gastro.read + gastro.kitchen + docházka; BEZ pokladny/cen/faktur).
// Scénář: rychle vidět nové objednávky, měnit stav, neztratit přehled ve špičce.
// Testovací data: bon si test připraví přes API JAKO ČÍŠNÍK (otevře účet bez stolu, přidá položku
// s poznámkou, odešle do kuchyně) — kuchař pak pracuje jen v UI. Lokální e2e DB.
// Bezpečnostní omezení: platby/storna se nedotýkáme; účet zůstane otevřený (kuchyň ho jen odbaví).

test.use({ storageState: authFile('kuchar') })

const NOTE = `E2E bez cibule ${Date.now().toString(36)}`

test.beforeAll(async () => {
  // Příprava bonu přes API (jako číšník) — kuchař pak pracuje jen v UI.
  const api = await request.newContext()
  const cisnik = PERSONAS.cisnik
  const login = await api.post(`${API_URL}/auth/login`, {
    data: { email: personaEmail(cisnik), password: personaPassword(cisnik) },
  })
  expect(login.status(), 'login číšníka pro přípravu bonu').toBe(200)
  const { accessToken } = await login.json()
  const auth = { Authorization: `Bearer ${accessToken}` }

  const open = await api.post(`${API_URL}/orders`, { headers: auth, data: {} })
  expect(open.status(), 'otevření účtu (takeaway)').toBe(201)
  const order = await open.json()

  // Najdi produkt, který jde přidat bez povinné varianty/modifikátoru (zkoušíme prvních pár).
  const productsRes = await api.get(`${API_URL}/products?page=1&pageSize=20`, { headers: auth })
  expect(productsRes.status()).toBe(200)
  const products: Array<{ id: string }> = (await productsRes.json()).items ?? []
  let added = false
  for (const p of products) {
    const add = await api.post(`${API_URL}/orders/${order.id}/items`, {
      headers: auth,
      data: { productId: p.id, quantity: 1, note: NOTE },
    })
    if (add.status() === 200) {
      added = true
      break
    }
  }
  expect(added, 'na účet šla přidat aspoň jedna položka').toBe(true)

  const send = await api.post(`${API_URL}/orders/${order.id}/send-to-kitchen`, {
    headers: auth,
    data: {},
  })
  expect([200, 204]).toContain(send.status())
  await api.dispose()
})

test('kuchyňská fronta: bon s položkou a poznámkou je vidět', async ({ page }) => {
  await go(page, '/app/kuchyne')
  await expect(page.getByRole('heading', { name: /Kuchy/ }).first()).toBeVisible()
  await expect(page.getByText(NOTE).first(), 'poznámka číšníka je na bonu čitelná').toBeVisible({
    timeout: 20_000,
  })
})

test('filtr sekcí Kuchyně/Bar funguje', async ({ page }) => {
  await go(page, '/app/kuchyne')
  for (const name of [/Kuchyně/, /Bar/, /Vše/]) {
    const tab = page.getByRole('tab', { name }).or(page.getByRole('button', { name })).first()
    if (await tab.isVisible().catch(() => false)) {
      await tab.click()
      await expect(page.locator('main')).not.toContainText(/Něco se pokazilo/)
    }
  }
})

test('stav bonu: nová → připravuje se → hotová → vydaná', async ({ page }) => {
  await go(page, '/app/kuchyne')
  // Chodová sekce bonu s naší poznámkou — tlačítka stavu jsou uvnitř této sekce.
  const course = page.locator('main section').filter({ hasText: NOTE }).first()
  await expect(course).toBeVisible({ timeout: 20_000 })
  const start = course.getByRole('button', { name: /Začít přípravu/ }).first()
  await expect(start, 'akce „Začít přípravu" na bonu').toBeVisible()
  await start.click()
  const ready = course.getByRole('button', { name: /Označit jako hotové/ }).first()
  await expect(ready, 'krok „Označit jako hotové"').toBeVisible({ timeout: 10_000 })
  await ready.click()
  const served = course.getByRole('button', { name: /Vydáno hostovi/ }).first()
  await expect(served, 'krok „Vydáno hostovi"').toBeVisible({ timeout: 10_000 })
  await served.click()
  // Bon zmizí z živé fronty…
  await expect(page.getByText(NOTE)).toHaveCount(0, { timeout: 15_000 })
  // …a najde se v historii.
  const historie = page
    .getByRole('tab', { name: /Historie/ })
    .or(page.getByText('Historie', { exact: true }))
    .first()
  if (await historie.isVisible().catch(() => false)) {
    await historie.click()
    await expect(page.getByText(NOTE).first(), 'vydaný bon je v historii').toBeVisible({
      timeout: 15_000,
    })
  }
})

test('fronta se sama obnovuje (bez ručního reloadu)', async ({ page }) => {
  await go(page, '/app/kuchyne')
  const second = page
    .waitForResponse((r) => r.url().includes('/kitchen/queue') && r.ok(), { timeout: 45_000 })
    .then(() =>
      page.waitForResponse((r) => r.url().includes('/kitchen/queue') && r.ok(), {
        timeout: 45_000,
      }),
    )
  await expect(second, 'fronta se dotazuje opakovaně (polling/refresh)').resolves.toBeTruthy()
})

test('čitelnost na tabletu/mobilu: bez horizontálního přetečení', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Jen mobilní viewport.')
  await go(page, '/app/kuchyne')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'KDS bez horizontálního scrollu').toBeLessThanOrEqual(2)
})

test.describe(() => {
  test.use({ allowStatus: [403, 404] })

  test('gating: kuchař vs. pokladna, ceny, faktury, nastavení (dokumentace)', async ({
    page,
  }, testInfo) => {
    await go(page, '/app/uzaverka')
    await expect(page).not.toHaveURL(/uzaverka/)
    await go(page, '/app/audit')
    await expect(page).not.toHaveURL(/audit/)

    const labels = await visibleNavLabels(page)
    testInfo.annotations.push({ type: 'nález', description: `Menu Kitchen: ${labels.join(', ')}` })
    // ZNÁMÝ NÁLEZ P2: FE roli Kitchen nezná (hiddenForRoles) → menu ukazuje i Pokladnu/Faktury.
    testInfo.annotations.push({
      type: 'nález',
      description: `Menu kuchaře obsahuje Pokladna=${labels.join('|').includes('Pokladna')}, Faktury=${labels.join('|').includes('Faktury')} (očekávané P2 — FE roli nefiltruje)`,
    })

    await go(page, '/app/pokladna')
    const text = (
      await page
        .locator('main')
        .innerText()
        .catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .slice(0, 200)
    testInfo.annotations.push({
      type: 'nález',
      description: `Kitchen na /app/pokladna: URL=${page.url()} — ${text}`,
    })
    await expect(page.locator('main')).not.toContainText(/undefined|NaN|Exception/)
  })
})

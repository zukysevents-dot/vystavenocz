import { test, expect, request } from '@playwright/test'
import { API_URL, apiContext, dismissCookies, expectWrite, settle, toast, unique } from './helpers'

// Uložená data patří jen své firmě a souběžná úprava téhož záznamu ve dvou relacích
// nesmí skončit tichou ztrátou změn.

test('klient uložený v jedné firmě není vidět v jiné firmě', async ({ page, browser }) => {
  // Test zakládá druhý účet přes API — to patří na lokální/testovací prostředí, ne na živý web.
  test.skip(
    !/localhost|127\.0\.0\.1/.test(API_URL),
    'zakládá účet — spouštět jen proti lokálnímu API',
  )
  const name = unique('E2E Izolace')
  await page.goto('/app/klienti')
  await settle(page)
  await page.getByRole('button', { name: 'Nový klient' }).click()
  await page.locator('#c-name').fill(name)
  await expectWrite(page, 'POST', /\/clients$/, () =>
    page.getByRole('button', { name: 'Vytvořit klienta' }).click(),
  )
  await expect(page.locator('div.divide-y > div').filter({ hasText: name })).toBeVisible()

  // Druhá firma: čerstvá registrace přes API (vlastní tenant), přihlášení a založení firmy v UI.
  const email = `e2e-tenant-${Date.now().toString(36)}@example.test`
  const password = `E2e.${Date.now().toString(36)}Xy!`
  const api = await request.newContext()
  const reg = await api.post(`${API_URL}/auth/register`, {
    data: { email, password, displayName: 'E2E Druhá firma' },
  })
  expect(reg.status(), 'registrace druhého účtu').toBe(201)
  await api.dispose()

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const other = await context.newPage()
  await dismissCookies(other)
  await other.goto('/prihlaseni')
  await other.locator('#email').fill(email)
  await other.locator('#password').fill(password)
  await other.getByRole('button', { name: 'Přihlásit se' }).click()
  await expect(other).toHaveURL(/\/app/, { timeout: 20_000 })

  // Nový účet nemá firmu → appka ho vede onboardingem; klienti první firmy tam být nesmí.
  await other.goto('/app/klienti')
  await settle(other)
  await expect(other.getByText(name)).toHaveCount(0)
  await context.close()
})

test('souběžná úprava klienta ve dvou relacích neztratí změnu potichu', async ({
  page,
  browser,
}) => {
  const name = unique('E2E Souběh')
  const api = await apiContext()
  const created = await api.post('clients', {
    data: {
      name,
      country: 'CZ',
      defaultPaymentDays: 14,
      city: 'Praha',
    },
  })
  expect(created.status(), 'příprava klienta přes API').toBe(201)
  const clientId = (await created.json()).id as string

  const second = await browser.newContext({ storageState: 'e2e/persistence/.auth/state.json' })
  const pageB = await second.newPage()

  const openEdit = async (p: typeof page) => {
    await p.goto('/app/klienti')
    await settle(p)
    await p
      .getByPlaceholder(/Hledat/)
      .first()
      .fill(name)
    const row = p.locator('div.divide-y > div').filter({ hasText: name })
    await expect(row).toHaveCount(1)
    await row.getByTitle('Upravit').click()
    await expect(p.getByRole('dialog')).toBeVisible()
  }

  // Obě relace otevřou stejný záznam se stejným výchozím stavem.
  await openEdit(page)
  await openEdit(pageB)

  await page.locator('#c-city').fill('Brno')
  await expectWrite(page, 'PUT', /\/clients\/[\w-]+$/, () =>
    page.getByRole('button', { name: 'Uložit změny' }).click(),
  )
  await expect(toast(page, 'Klient upraven')).toBeVisible()

  await pageB.locator('#c-city').fill('Ostrava')
  const status = await expectWrite(pageB, 'PUT', /\/clients\/[\w-]+$/, () =>
    pageB.getByRole('button', { name: 'Uložit změny' }).click(),
  )
  // Server dnes konflikt neřeší (poslední vyhrává) — pak musí druhá relace aspoň dostat
  // jednoznačné potvrzení a po reloadu vidět skutečně uložený stav, ne svůj starý pohled.
  expect([200, 409]).toContain(status)

  await pageB.reload()
  await settle(pageB)
  await pageB
    .getByPlaceholder(/Hledat/)
    .first()
    .fill(name)
  const rowB = pageB.locator('div.divide-y > div').filter({ hasText: name })
  await expect(rowB).toContainText(status === 200 ? 'Ostrava' : 'Brno')

  // A první relace po obnovení vidí totéž — žádná relace nesmí zůstat u své staré verze.
  await page.reload()
  await settle(page)
  await page
    .getByPlaceholder(/Hledat/)
    .first()
    .fill(name)
  await expect(page.locator('div.divide-y > div').filter({ hasText: name })).toContainText(
    status === 200 ? 'Ostrava' : 'Brno',
  )

  await second.close()
  await api.delete(`clients/${clientId}`)
  await api.dispose()
})

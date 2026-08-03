import { test, expect, type Page } from '@playwright/test'
import { apiContext, expectWrite, loginFresh, settle, toast, unique } from './helpers'

// Ukládání klientů proti reálnému API: vytvoření, úprava, smazání, přetrvání
// (reload / návrat na stránku / nové přihlášení), validace a chování při chybách.

const created: string[] = []

test.afterAll(async () => {
  if (!created.length) return
  const api = await apiContext()
  const res = await api.get('clients?pageSize=100')
  const items = (await res.json()).items as Array<{ id: string; name: string }>
  for (const c of items.filter((i) => created.includes(i.name))) {
    await api.delete(`clients/${c.id}`)
  }
  await api.dispose()
})

async function openNewClient(page: Page): Promise<void> {
  await page.goto('/app/klienti')
  await settle(page)
  await page.getByRole('button', { name: 'Nový klient' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

function row(page: Page, name: string) {
  return page.locator('div.divide-y > div').filter({ hasText: name })
}

test('nový klient se uloží a přežije reload, odchod ze stránky i nové přihlášení', async ({
  page,
  browser,
}) => {
  const name = unique('E2E Klient')
  created.push(name)
  await openNewClient(page)
  await page.locator('#c-name').fill(name)
  await page.locator('#c-city').fill('Olomouc')
  await page.locator('#c-email').fill('e2e@example.com')

  const status = await expectWrite(page, 'POST', /\/clients$/, async () => {
    await page.getByRole('button', { name: 'Vytvořit klienta' }).click()
  })
  expect(status, 'POST /clients').toBe(201)
  await expect(toast(page, 'Klient vytvořen')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(row(page, name)).toBeVisible()

  // 1) reload stránky
  await page.reload()
  await settle(page)
  await expect(row(page, name)).toBeVisible()
  await expect(row(page, name)).toContainText('Olomouc')

  // 2) odchod na jinou stránku a návrat
  await page.goto('/app/faktury')
  await settle(page)
  await page.goto('/app/klienti')
  await settle(page)
  await expect(row(page, name)).toBeVisible()

  // 3) nové přihlášení v čisté session
  const fresh = await loginFresh(browser)
  await fresh.page.goto('/app/klienti')
  await settle(fresh.page)
  await expect(row(fresh.page, name)).toBeVisible()
  await fresh.close()
})

test('úprava klienta se uloží včetně diakritiky a dlouhých hodnot', async ({ page }) => {
  const name = unique('E2E Úprava')
  created.push(name)
  await openNewClient(page)
  await page.locator('#c-name').fill(name)
  await expectWrite(page, 'POST', /\/clients$/, () =>
    page.getByRole('button', { name: 'Vytvořit klienta' }).click(),
  )
  await expect(row(page, name)).toBeVisible()

  const newName = `${name} Ř💡 ${'x'.repeat(120)}`
  created.push(newName)
  const note = 'Ěščřžýáíé — "uvozovky", <tag> & ampersand; 日本語'
  await row(page, name).getByTitle('Upravit').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('#c-name').fill(newName)
  await page.locator('#c-notes').fill(note)
  await page.locator('#c-days').fill('30')

  const status = await expectWrite(page, 'PUT', /\/clients\/[\w-]+$/, () =>
    page.getByRole('button', { name: 'Uložit změny' }).click(),
  )
  expect(status, 'PUT /clients/{id}').toBe(200)
  await expect(toast(page, 'Klient upraven')).toBeVisible()

  await page.reload()
  await settle(page)
  await expect(row(page, newName)).toBeVisible()
  // Poznámka a splatnost nejsou v seznamu — ověř přes znovuotevřený formulář.
  await row(page, newName).getByTitle('Upravit').click()
  await expect(page.locator('#c-notes')).toHaveValue(note)
  await expect(page.locator('#c-days')).toHaveValue('30')
})

test('smazaný klient se nevrátí po reloadu', async ({ page }) => {
  const name = unique('E2E Smazat')
  await openNewClient(page)
  await page.locator('#c-name').fill(name)
  await expectWrite(page, 'POST', /\/clients$/, () =>
    page.getByRole('button', { name: 'Vytvořit klienta' }).click(),
  )
  await expect(row(page, name)).toBeVisible()

  await row(page, name).getByTitle('Smazat').click()
  const status = await expectWrite(page, 'DELETE', /\/clients\/[\w-]+$/, () =>
    page.getByRole('button', { name: 'Smazat', exact: true }).click(),
  )
  expect(status, 'DELETE /clients/{id}').toBeLessThan(300)
  await expect(row(page, name)).toHaveCount(0)

  await page.reload()
  await settle(page)
  await expect(row(page, name)).toHaveCount(0)
})

test('prázdný povinný název se neuloží a uživatel dostane hlášku', async ({ page }) => {
  await openNewClient(page)
  await page.locator('#c-name').fill('   ')
  let posted = false
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/clients')) posted = true
  })
  await page.getByRole('button', { name: 'Vytvořit klienta' }).click()
  await expect(toast(page, /Zadejte jméno klienta/)).toBeVisible()
  expect(posted, 'prázdný formulář nesmí volat API').toBe(false)
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('dvojklik na Uložit nevytvoří dva záznamy', async ({ page }) => {
  const name = unique('E2E Dvojklik')
  created.push(name)
  await openNewClient(page)
  await page.locator('#c-name').fill(name)

  let posts = 0
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/clients')) posts++
  })
  const btn = page.getByRole('button', { name: 'Vytvořit klienta' })
  await btn.click({ clickCount: 2, delay: 10 })
  await expect(toast(page, 'Klient vytvořen')).toBeVisible()
  await settle(page)
  expect(posts, 'počet POST /clients').toBe(1)

  await page.reload()
  await settle(page)
  await expect(row(page, name)).toHaveCount(1)
})

test('selhání serveru (500) neohlásí úspěch a změny zůstanou ve formuláři', async ({ page }) => {
  const name = unique('E2E Chyba500')
  await openNewClient(page)
  await page.locator('#c-name').fill(name)

  await page.route('**/api/v1/clients', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Server Error', detail: 'Chyba serveru.', status: 500 }),
    })
  })

  await page.getByRole('button', { name: 'Vytvořit klienta' }).click()
  // Nesmí tvrdit úspěch…
  await expect(toast(page, 'Klient vytvořen')).toHaveCount(0)
  // …a musí říct, že se neuložilo.
  await expect(toast(page, /nepodařilo|chyb|selhal/i)).toBeVisible()
  // Rozdělaná práce se nesmí ztratit.
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('#c-name')).toHaveValue(name)

  await page.unroute('**/api/v1/clients')
  await page.reload()
  await settle(page)
  await expect(row(page, name)).toHaveCount(0)
})

test('konflikt při mazání (409) se uživateli oznámí a klient zůstane v seznamu', async ({
  page,
}) => {
  const name = unique('E2E Konflikt')
  created.push(name)
  await openNewClient(page)
  await page.locator('#c-name').fill(name)
  await expectWrite(page, 'POST', /\/clients$/, () =>
    page.getByRole('button', { name: 'Vytvořit klienta' }).click(),
  )
  await expect(row(page, name)).toBeVisible()

  await page.route('**/api/v1/clients/*', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback()
    await route.fulfill({
      status: 409,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Conflict', detail: 'Klient má faktury.', status: 409 }),
    })
  })

  await row(page, name).getByTitle('Smazat').click()
  await page.getByRole('button', { name: 'Smazat', exact: true }).click()
  await expect(toast(page, 'Klient smazán')).toHaveCount(0)
  await expect(toast(page, /nepodařilo|Klient má faktury/i)).toBeVisible()
  await expect(row(page, name)).toBeVisible()
})

test('offline při ukládání ohlásí chybu a nevyhodí falešný úspěch', async ({ page, context }) => {
  const name = unique('E2E Offline')
  await openNewClient(page)
  await page.locator('#c-name').fill(name)
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Vytvořit klienta' }).click()
  await expect(toast(page, 'Klient vytvořen')).toHaveCount(0)
  await expect(toast(page, /nepodařilo|chyb|selhal|offline|připojení/i)).toBeVisible()
  await context.setOffline(false)
})

test('vypršelá session při ukládání pošle na přihlášení a data se neztratí bez upozornění', async ({
  page,
}) => {
  const name = unique('E2E Session')
  await openNewClient(page)
  await page.locator('#c-name').fill(name)

  // 401 na zápis i na refresh → session je opravdu po expiraci.
  await page.route('**/api/v1/clients', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Unauthorized', detail: 'Vyžaduje přihlášení.', status: 401 }),
    })
  })
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  )

  await page.getByRole('button', { name: 'Vytvořit klienta' }).click()
  await expect(toast(page, 'Klient vytvořen')).toHaveCount(0)
  // Buď hláška o vypršené relaci, nebo přesměrování na přihlášení — obojí je jasná zpětná vazba.
  await expect
    .poll(
      async () => {
        const onLogin = /\/prihlaseni/.test(page.url())
        const msg = await toast(page, /relace|přihlas|nepodařilo|vypršel/i).count()
        return onLogin || msg > 0
      },
      { timeout: 15_000 },
    )
    .toBe(true)
})

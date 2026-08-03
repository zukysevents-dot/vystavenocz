import { test, expect, type Page } from '@playwright/test'
import { expectWrite, loginFresh, settle, toast, unique } from './helpers'

// Ukládání faktury v editoru: koncept, řádky, přetrvání po reloadu i novém přihlášení,
// chování při selhání serveru a při odchodu ze stránky během ukládání.

async function newInvoice(page: Page): Promise<void> {
  await page.goto('/app/faktury/editor')
  await settle(page)
  await expect(page.getByRole('button', { name: 'Uložit koncept' })).toBeVisible()
  await selectFirstClient(page)
}

/** Odběratel je povinný (backend `CreateInvoiceRequest.ClientId`) — vyber prvního z číselníku. */
async function selectFirstClient(page: Page): Promise<void> {
  await page.locator('#inv-client').click()
  await page.getByRole('option').first().click()
  await expect(page.locator('#inv-client')).not.toHaveText(/Vyberte|—|^$/)
}

/** Vyplní první řádek dokladu (popis, množství, cena). */
async function fillFirstItem(page: Page, description: string, price: string): Promise<void> {
  await page.getByLabel('Popis položky').first().fill(description)
  await page.locator('input[id$="-price"]').first().fill(price)
}

test('nový koncept faktury se uloží a přežije reload i nové přihlášení', async ({
  page,
  browser,
}) => {
  const description = unique('E2E položka')
  await newInvoice(page)
  await fillFirstItem(page, description, '1234.50')

  const status = await expectWrite(page, 'POST', /\/invoices$/, () =>
    page.getByRole('button', { name: 'Uložit koncept' }).click(),
  )
  expect(status, 'POST /invoices').toBeLessThan(300)
  await expect(toast(page, 'Koncept uložen')).toBeVisible()
  // Editor si musí převzít serverové id, jinak by další uložení vyrobilo duplicitní doklad.
  await expect(page).toHaveURL(/[?&]id=/)
  const url = page.url()

  await page.reload()
  await settle(page)
  await expect(page.getByLabel('Popis položky').first()).toHaveValue(description)

  const fresh = await loginFresh(browser)
  await fresh.page.goto(url.replace(/^https?:\/\/[^/]+/, ''))
  await settle(fresh.page)
  await expect(fresh.page.getByLabel('Popis položky').first()).toHaveValue(description)
  await fresh.close()
})

test('opakované uložení konceptu nevytvoří druhý doklad', async ({ page }) => {
  await newInvoice(page)
  await fillFirstItem(page, unique('E2E jedna faktura'), '100')

  let posts = 0
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/invoices')) posts++
  })

  const save = page.getByRole('button', { name: 'Uložit koncept' })
  await expectWrite(page, 'POST', /\/invoices$/, () => save.click())
  await expect(toast(page, 'Koncept uložen')).toBeVisible()
  await expectWrite(page, 'PUT', /\/invoices\/[\w-]+$/, () => save.click())
  await settle(page)
  expect(posts, 'druhé uložení už musí být PUT, ne POST').toBe(1)
})

test('dvojklik na Uložit koncept nevytvoří dvě faktury', async ({ page }) => {
  await newInvoice(page)
  await fillFirstItem(page, unique('E2E dvojklik faktura'), '250')

  let posts = 0
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/invoices')) posts++
  })
  await page.getByRole('button', { name: 'Uložit koncept' }).click({ clickCount: 2, delay: 10 })
  await expect(toast(page, 'Koncept uložen')).toBeVisible()
  await settle(page)
  expect(posts, 'počet POST /invoices').toBe(1)
})

test('úprava řádků uloženého konceptu se uloží a přežije reload', async ({ page }) => {
  await newInvoice(page)
  await fillFirstItem(page, unique('E2E původní'), '100')
  await expectWrite(page, 'POST', /\/invoices$/, () =>
    page.getByRole('button', { name: 'Uložit koncept' }).click(),
  )
  await expect(page).toHaveURL(/[?&]id=/)

  const secondDescription = unique('E2E druhý řádek')
  await page.getByRole('button', { name: /Přidat (položku|řádek)/ }).click()
  await page.getByLabel('Popis položky').nth(1).fill(secondDescription)
  await page.locator('input[id$="-price"]').nth(1).fill('42')

  // Existující řádek se smí jen UPRAVIT — kdyby se mazal a zakládal znovu, selhání DELETE
  // by na dokladu nechalo obě kopie (zdvojená částka).
  const deletes: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'DELETE' && r.url().includes('/items/')) deletes.push(r.url())
  })

  // Reorder je poslední request uložení — teprve po něm je serverové pořadí definitivní.
  await expectWrite(page, 'PUT', /\/items\/reorder$/, () =>
    page.getByRole('button', { name: 'Uložit koncept' }).click(),
  )
  expect(deletes, 'nezměněný řádek se nesmí mazat a zakládat znovu').toEqual([])

  await page.reload()
  await settle(page)
  await expect(page.getByLabel('Popis položky').nth(1)).toHaveValue(secondDescription)
  await expect(page.locator('input[id$="-price"]').nth(1)).toHaveValue('42')
})

test('selhání serveru při ukládání faktury nesmí projít bez hlášky', async ({ page }) => {
  await newInvoice(page)
  await fillFirstItem(page, unique('E2E chyba faktury'), '999')

  await page.route('**/api/v1/invoices', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Server Error', status: 500 }),
    })
  })

  await page.getByRole('button', { name: 'Uložit koncept' }).click()
  await expect(toast(page, 'Koncept uložen')).toHaveCount(0)
  await expect(toast(page, /nepodařilo/i)).toBeVisible()
  // Uživatel musí zůstat na rozdělaném dokladu (žádné id v URL = neuloženo).
  await expect(page).not.toHaveURL(/[?&]id=/)
})

test('koncept bez vybraného klienta se neuloží potichu', async ({ page }) => {
  await page.goto('/app/faktury/editor')
  await settle(page)
  await fillFirstItem(page, unique('E2E bez klienta'), '100')

  let posted = false
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/invoices')) posted = true
  })
  await page.getByRole('button', { name: 'Uložit koncept' }).click()
  await expect(toast(page, /Vyberte klienta/i)).toBeVisible()
  await expect(toast(page, 'Koncept uložen')).toHaveCount(0)
  expect(posted, 'neúplný doklad se na server neposílá').toBe(false)
  // Rozdělaná práce zůstává v editoru.
  await expect(page.getByLabel('Popis položky').first()).not.toHaveValue('')
})

test('validační chyba serveru (422) se ukáže uživateli', async ({ page }) => {
  await newInvoice(page)
  await fillFirstItem(page, unique('E2E validace'), '10')

  await page.route('**/api/v1/invoices', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 422,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        title: 'Unprocessable Entity',
        detail: 'Doklad musí mít alespoň jednu položku.',
        status: 422,
      }),
    })
  })

  await page.getByRole('button', { name: 'Uložit koncept' }).click()
  await expect(toast(page, 'Doklad musí mít alespoň jednu položku.')).toBeVisible()
  await expect(toast(page, 'Koncept uložen')).toHaveCount(0)
})

test('odchod ze stránky během ukládání konceptu doklad neztratí', async ({ page }) => {
  const description = unique('E2E odchod')
  await newInvoice(page)
  await fillFirstItem(page, description, '333')

  // Zpomal odpověď, ať se navigace potká s běžícím uložením.
  await page.route('**/api/v1/invoices', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await new Promise((r) => setTimeout(r, 1500))
    await route.fallback()
  })

  const posted = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/invoices'),
  )
  await page.getByRole('button', { name: 'Uložit koncept' }).click()
  // Přechod uvnitř aplikace (jako klik v menu) — tvrdý reload by request zrušil prohlížeč.
  await page.getByRole('link', { name: 'Faktury', exact: true }).click()
  const res = await posted
  expect(res.status(), 'server uložení dokončí i po odchodu').toBeLessThan(300)
  const savedId = (await res.json()).id as string

  // Doklad se musí dát znovu otevřít se stejným obsahem (řádky nese až detail).
  await page.goto(`/app/faktury/editor?id=${savedId}`)
  await settle(page)
  await expect(page.getByLabel('Popis položky').first()).toHaveValue(description)
})

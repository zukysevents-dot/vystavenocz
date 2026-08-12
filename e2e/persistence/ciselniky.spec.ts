import { test, expect, type Page } from '@playwright/test'
import { expectWrite, loginFresh, settle, toast, unique } from './helpers'

// Ukládání číselníků, na kterých stojí zbytek provozu: produkty, kategorie, pobočky,
// dodavatelé a ceník služeb. U každého: uložení → potvrzení → přetrvání po reloadu.

test.describe('Produkty (katalog)', () => {
  async function openNewProduct(page: Page): Promise<void> {
    await page.goto('/app/sklad')
    await settle(page)
    await page.getByRole('button', { name: 'Nový produkt' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  }

  /** Vyhledá produkt podle názvu a otevře jeho editaci (hledání zúží seznam na jeden řádek). */
  async function openEdit(page: Page, name: string): Promise<void> {
    await page
      .getByPlaceholder(/Hledat/)
      .first()
      .fill(name)
    const row = page.locator('div.divide-y > div').filter({ hasText: name })
    await expect(row).toHaveCount(1)
    await row.getByTitle('Upravit').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  }

  test('nový produkt se uloží a přežije reload i nové přihlášení', async ({ page, browser }) => {
    const name = unique('E2E Produkt')
    const sku = `E2E${Date.now().toString(36).toUpperCase()}`
    await openNewProduct(page)
    await page.locator('#p-name').fill(name)
    await page.locator('#p-price').fill('249.90')
    await page.locator('#p-sku').fill(sku)

    const status = await expectWrite(page, 'POST', /\/products$/, () =>
      page.getByRole('button', { name: 'Přidat produkt' }).click(),
    )
    expect(status, 'POST /products').toBeLessThan(300)
    await expect(toast(page, 'Produkt přidán')).toBeVisible()

    await page.reload()
    await settle(page)
    await expect(page.getByText(name).first()).toBeVisible()

    const fresh = await loginFresh(browser)
    await fresh.page.goto('/app/sklad')
    await settle(fresh.page)
    await expect(fresh.page.getByText(name).first()).toBeVisible()
    await fresh.close()
  })

  test('úprava ceny produktu se uloží a po reloadu drží novou hodnotu', async ({ page }) => {
    const name = unique('E2E Cena')
    const sku = `E2EC${Date.now().toString(36).toUpperCase()}`
    await openNewProduct(page)
    await page.locator('#p-name').fill(name)
    await page.locator('#p-price').fill('100')
    await page.locator('#p-sku').fill(sku)
    await expectWrite(page, 'POST', /\/products$/, () =>
      page.getByRole('button', { name: 'Přidat produkt' }).click(),
    )

    await openEdit(page, name)
    await page.locator('#p-price').fill('333.30')
    await expectWrite(page, 'PUT', /\/products\/[\w-]+$/, () =>
      page.getByRole('button', { name: 'Uložit změny' }).click(),
    )
    await expect(toast(page, 'Produkt upraven')).toBeVisible()

    await page.reload()
    await settle(page)
    await openEdit(page, name)
    await expect(page.locator('#p-price')).toHaveValue('333.3')
  })

  // Provoz (bar na festivalu) zakládá položky za pochodu a skladové kódy neřeší — stačí název.
  test('produkt bez skladového kódu se uloží a přežije reload', async ({ page }) => {
    const name = unique('E2E Bez SKU')
    await openNewProduct(page)
    await page.locator('#p-name').fill(name)
    await page.locator('#p-price').fill('10')

    const status = await expectWrite(page, 'POST', /\/products$/, () =>
      page.getByRole('button', { name: 'Přidat produkt' }).click(),
    )
    expect(status, 'POST /products').toBeLessThan(300)
    await expect(toast(page, 'Produkt přidán')).toBeVisible()

    await page.reload()
    await settle(page)
    await expect(page.getByText(name).first()).toBeVisible()
  })

  test('produkt bez názvu se na server neposílá', async ({ page }) => {
    await openNewProduct(page)
    await page.locator('#p-price').fill('10')
    let posted = false
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/products')) posted = true
    })
    await page.getByRole('button', { name: 'Přidat produkt' }).click()
    // Povinné pole hlídá prohlížeč (required) — formulář se neodešle a dialog zůstane otevřený.
    await expect(page.locator('#p-name')).toHaveJSProperty('validity.valid', false)
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(posted, 'neúplný produkt se na server neposílá').toBe(false)
  })
})

test.describe('Kategorie', () => {
  test('nová kategorie se uloží a přežije reload', async ({ page }) => {
    const name = unique('E2E Kategorie')
    await page.goto('/app/kategorie')
    await settle(page)
    await page.getByRole('button', { name: 'Nová kategorie' }).click()
    await page.locator('#cat-name').fill(name)
    const status = await expectWrite(page, 'POST', /\/categories$/, () =>
      page.getByRole('button', { name: 'Přidat', exact: true }).click(),
    )
    expect(status).toBeLessThan(300)

    await page.reload()
    await settle(page)
    await expect(page.getByText(name).first()).toBeVisible()
  })
})

test.describe('Pobočky', () => {
  test('nová pobočka se uloží a přežije reload', async ({ page }) => {
    const name = unique('E2E Pobočka')
    await page.goto('/app/pobocky')
    await settle(page)
    await page.getByRole('button', { name: 'Nová pobočka' }).click()
    await page.locator('#loc-name').fill(name)
    await page.locator('#loc-addr').fill('Zkušební 1, Praha')
    const status = await expectWrite(page, 'POST', /\/locations$/, () =>
      page.getByRole('button', { name: 'Přidat', exact: true }).click(),
    )
    expect(status).toBeLessThan(300)

    await page.reload()
    await settle(page)
    await expect(page.getByText(name).first()).toBeVisible()
  })
})

test.describe('Dodavatelé', () => {
  test('nový dodavatel se uloží, přežije reload a chybu serveru ohlásí', async ({ page }) => {
    const name = unique('E2E Dodavatel')
    await page.goto('/app/dodavatele')
    await settle(page)
    await page.getByRole('button', { name: 'Nový dodavatel' }).click()
    await page.locator('#supplier-name').fill(name)
    const status = await expectWrite(page, 'POST', /\/suppliers$/, () =>
      page.getByRole('button', { name: 'Uložit', exact: true }).click(),
    )
    expect(status).toBeLessThan(300)
    await page.reload()
    await settle(page)
    await expect(page.getByText(name).first()).toBeVisible()

    // Selhání serveru nesmí vypadat jako úspěch.
    await page.getByRole('button', { name: 'Nový dodavatel' }).click()
    await page.locator('#supplier-name').fill(unique('E2E Dodavatel chyba'))
    await page.route('**/api/v1/suppliers', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
        : route.fallback(),
    )
    await page.getByRole('button', { name: 'Uložit', exact: true }).click()
    await expect(toast(page, /nepodařilo/i)).toBeVisible()
  })
})

test.describe('Ceník služeb', () => {
  test('nová služba se uloží a přežije reload', async ({ page }) => {
    const name = unique('E2E Služba')
    await page.goto('/app/cenik-sluzeb')
    await settle(page)
    await page.getByRole('button', { name: 'Nová služba' }).click()
    await page.locator('#svc-name').fill(name)
    await page.locator('#svc-price').fill('850')
    const status = await expectWrite(page, 'POST', /\/service-items$/, () =>
      page.getByRole('button', { name: 'Vytvořit', exact: true }).click(),
    )
    expect(status).toBeLessThan(300)

    await page.reload()
    await settle(page)
    await expect(page.getByText(name).first()).toBeVisible()
  })
})

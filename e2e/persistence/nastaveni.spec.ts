import { test, expect } from '@playwright/test'
import { expectWrite, loginFresh, settle, toast, unique } from './helpers'

// Všechny testy sahají na JEDEN profil firmy — paralelně by se navzájem přepisovaly.
test.describe.configure({ mode: 'serial' })

// Nastavení firmy: profil se ukládá na server (PUT /company). Test hlídá i to, že se
// uložené hodnoty vrátí po přihlášení v ČISTÉM prohlížeči — tam žádná lokální cache není,
// takže projde jen to, co skutečně drží server.

test('údaje firmy se uloží a vrátí i po přihlášení v čistém prohlížeči', async ({
  page,
  browser,
}) => {
  const city = unique('Město')
  await page.goto('/app/nastaveni')
  await settle(page)
  await page.locator('#city').fill(city)
  await page.locator('#street').fill('Serverová 7')

  const status = await expectWrite(page, 'PUT', /\/company$/, () =>
    page.getByRole('button', { name: 'Uložit nastavení' }).click(),
  )
  expect(status, 'PUT /company').toBe(200)
  await expect(toast(page, /Nastavení uloženo/)).toBeVisible()

  await page.reload()
  await settle(page)
  await expect(page.locator('#city')).toHaveValue(city)

  const fresh = await loginFresh(browser)
  await fresh.page.goto('/app/nastaveni')
  await settle(fresh.page)
  await expect(fresh.page.locator('#city')).toHaveValue(city)
  await expect(fresh.page.locator('#street')).toHaveValue('Serverová 7')
  await fresh.close()
})

test('režim DPH přežije přihlášení v čistém prohlížeči', async ({ page, browser }) => {
  await page.goto('/app/nastaveni')
  await settle(page)

  // Přepni na neplátce a zpátky na plátce — ověří se obě strany mapování na server.
  for (const mode of [/Neplátce/, /Plátce DPH/]) {
    await page.locator('#vat_mode').click()
    await page.getByRole('option', { name: mode }).first().click()
    const status = await expectWrite(page, 'PUT', /\/company$/, () =>
      page.getByRole('button', { name: 'Uložit nastavení' }).click(),
    )
    expect(status, 'PUT /company').toBe(200)
    await expect(toast(page, /Nastavení uloženo/).first()).toBeVisible()
  }

  // Jiný prohlížeč = jiný stroj uživatele; projde jen to, co skutečně drží server.
  const fresh = await loginFresh(browser)
  await fresh.page.goto('/app/nastaveni')
  await settle(fresh.page)
  await expect(fresh.page.locator('#vat_mode')).toContainText(/Plátce DPH/)
  await fresh.close()
})

// ZNÁMÝ NEDOSTATEK: prefix/formát/pořadové číslo faktury drží jen localStorage tohoto prohlížeče
// (v API režimu čísla přiděluje server, viz E3-2). Uložení přesto hlásí úspěch, takže na jiném
// zařízení uživatel své nastavení nenajde. Test to hlídá, dokud pole nemá serverovou podporu
// nebo dokud je UI v API režimu nepřestane nabízet.
test.fail('číslování faktur přežije přihlášení v čistém prohlížeči', async ({ page, browser }) => {
  const prefix = `E2E${Date.now().toString(36).toUpperCase().slice(-4)}`
  await page.goto('/app/nastaveni')
  await settle(page)
  await page.locator('#inv_prefix').fill(prefix)
  await expectWrite(page, 'PUT', /\/company$/, () =>
    page.getByRole('button', { name: 'Uložit nastavení' }).click(),
  )
  await expect(toast(page, /Nastavení uloženo/)).toBeVisible()

  const fresh = await loginFresh(browser)
  await fresh.page.goto('/app/nastaveni')
  await settle(fresh.page)
  await expect(fresh.page.locator('#inv_prefix')).toHaveValue(prefix)
  await fresh.close()
})

test('selhání serveru při ukládání nastavení neohlásí úspěch', async ({ page }) => {
  await page.goto('/app/nastaveni')
  await settle(page)
  await page.locator('#city').fill(unique('Chybové město'))

  await page.route('**/api/v1/company', (route) =>
    route.request().method() === 'PUT'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      : route.fallback(),
  )
  await page.getByRole('button', { name: 'Uložit nastavení' }).click()
  await expect(toast(page, /Nastavení uloženo/)).toHaveCount(0)
  await expect(toast(page, /nepodařilo/i)).toBeVisible()
})

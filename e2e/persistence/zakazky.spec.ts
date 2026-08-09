import { test, expect } from '@playwright/test'
import { expectWrite, loginFresh, settle, toast, unique } from './helpers'

// Zakázky: založení, položka pracovního listu, checklist a příloha — všechno musí
// přežít reload i nové přihlášení a při selhání serveru se to nesmí tvářit jako uložené.

test('nová zakázka se uloží a přežije reload i nové přihlášení', async ({ page, browser }) => {
  const name = unique('E2E Zakázka')
  await page.goto('/app/zakazky')
  await settle(page)
  await page.getByRole('button', { name: 'Nová zakázka' }).click()
  await page.locator('#job-name').fill(name)

  const status = await expectWrite(page, 'POST', /\/jobs$/, () =>
    page.getByRole('button', { name: 'Vytvořit', exact: true }).click(),
  )
  expect(status, 'POST /jobs').toBeLessThan(300)
  await expect(toast(page, 'Zakázka vytvořena')).toBeVisible()
  await expect(page).toHaveURL(/\/app\/zakazky\/[\w-]+/)
  const detailUrl = new URL(page.url()).pathname

  await page.reload()
  await settle(page)
  await expect(page.getByText(name).first()).toBeVisible()

  const fresh = await loginFresh(browser)
  await fresh.page.goto(detailUrl)
  await settle(fresh.page)
  await expect(fresh.page.getByText(name).first()).toBeVisible()
  await fresh.close()
})

test('položka pracovního listu se uloží a po reloadu zůstane s cenou', async ({ page }) => {
  const name = unique('E2E Pracovní list')
  await page.goto('/app/zakazky')
  await settle(page)
  await page.getByRole('button', { name: 'Nová zakázka' }).click()
  await page.locator('#job-name').fill(name)
  await expectWrite(page, 'POST', /\/jobs$/, () =>
    page.getByRole('button', { name: 'Vytvořit', exact: true }).click(),
  )
  await expect(page).toHaveURL(/\/app\/zakazky\/[\w-]+/)
  await settle(page)

  const work = unique('Montáž')
  await page
    .getByRole('button', { name: /Přidat práci|Přidat položku práce|Práce/ })
    .first()
    .click()
  await page.locator('#wk-desc').fill(work)
  await page.locator('#wk-qty').fill('2')
  await page.locator('#wk-price').fill('1500')
  const status = await expectWrite(page, 'POST', /\/work-items$/, () =>
    page.getByRole('button', { name: 'Přidat', exact: true }).click(),
  )
  expect(status, 'POST /jobs/{id}/work-items').toBeLessThan(300)

  await page.reload()
  await settle(page)
  await expect(page.getByText(work).first()).toBeVisible()
  await expect(page.getByText('1 500', { exact: false }).first()).toBeVisible()
})

test('selhání serveru u položky pracovního listu neohlásí úspěch', async ({ page }) => {
  const name = unique('E2E List chyba')
  await page.goto('/app/zakazky')
  await settle(page)
  await page.getByRole('button', { name: 'Nová zakázka' }).click()
  await page.locator('#job-name').fill(name)
  await expectWrite(page, 'POST', /\/jobs$/, () =>
    page.getByRole('button', { name: 'Vytvořit', exact: true }).click(),
  )
  await settle(page)

  await page.route('**/work-items', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      : route.fallback(),
  )
  const work = unique('Neuložená práce')
  await page
    .getByRole('button', { name: /Přidat práci|Přidat položku práce|Práce/ })
    .first()
    .click()
  await page.locator('#wk-desc').fill(work)
  await page.locator('#wk-price').fill('100')
  await page.getByRole('button', { name: 'Přidat', exact: true }).click()

  await expect(toast(page, /nepodařilo|nezdařil/i)).toBeVisible()
  await page.unroute('**/work-items')
  await page.reload()
  await settle(page)
  await expect(page.getByText(work)).toHaveCount(0)
})

import { test, expect } from '@playwright/test'
import { demoCreds, watchPage, attachWatch, dismissCookies } from './helpers'

// Testy přihlašovacího flow běží BEZ sdílené session.
test.use({ storageState: { cookies: [], origins: [] } })

test.beforeEach(async ({ page }) => {
  await dismissCookies(page)
})

test.describe('Přihlášení a základní shell', () => {
  test('přihlašovací stránka se načte bez chyb', async ({ page }, testInfo) => {
    const watch = watchPage(page)
    await page.goto('/prihlaseni')
    await expect(page.getByRole('heading', { name: 'Přihlášení' })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await attachWatch(testInfo, watch)
    expect(watch.consoleErrors).toEqual([])
  })

  test('chybné heslo ukáže srozumitelnou chybu, bez technických detailů', async ({ page }) => {
    const { email } = demoCreds()
    const watch = watchPage(page, { allowStatus: [401, 400, 422] })
    await page.goto('/prihlaseni')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('spatne-heslo-test-123')
    await page.getByRole('button', { name: 'Přihlásit se' }).click()

    // Zůstáváme na přihlášení a vidíme českou hlášku.
    await expect(page).toHaveURL(/prihlaseni/)
    const error = page.locator('p.text-destructive')
    await expect(error).toBeVisible({ timeout: 10_000 })
    const text = (await error.textContent()) ?? ''
    expect(text.length).toBeGreaterThan(3)
    // Nesmí prosakovat HTTP/stack/interní názvy.
    expect(text).not.toMatch(/401|500|Exception|stack|Bearer|token/i)
    expect(watch.consoleErrors.filter((e) => !/401|Unauthorized/i.test(e))).toEqual([])
  })

  test('úspěšné přihlášení → /app, refresh drží session, odhlášení vrací na login', async ({
    page,
  }, testInfo) => {
    const { email, password } = demoCreds()
    const watch = watchPage(page)
    await page.goto('/prihlaseni')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: 'Přihlásit se' }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 20_000 })

    // Refresh po přihlášení — appka se načte znovu a session drží.
    await page.reload()
    await expect(page).toHaveURL(/\/app/)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 })

    // Přihlášený uživatel na /prihlaseni je přesměrován zpět do aplikace.
    await page.goto('/prihlaseni')
    await expect(page).toHaveURL(/\/app/)

    // Odhlášení (ikonové tlačítko v sidebaru).
    await page.locator('[title="Odhlásit se"]:visible').first().click()
    await expect(page).toHaveURL(/prihlaseni|^\/$|\/$/, { timeout: 10_000 })

    // Po odhlášení je chráněná routa nedostupná.
    await page.goto('/app/faktury')
    await expect(page).toHaveURL(/prihlaseni/)
    await attachWatch(testInfo, watch)
  })

  test('chráněná URL bez session přesměruje na přihlášení (s redirect parametrem)', async ({
    page,
  }) => {
    await page.goto('/app/sklad')
    await expect(page).toHaveURL(/prihlaseni/)
    expect(page.url()).toContain('redirect')
  })

  test('viditelný fokus a ovladatelnost klávesnicí na přihlášení', async ({ page }) => {
    await page.goto('/prihlaseni')
    await page.keyboard.press('Tab')
    const hasFocus = await page.evaluate(() => document.activeElement !== document.body)
    expect(hasFocus, 'Tab musí posouvat fokus').toBe(true)
  })

  test('neexistující routa ukáže 404 stránku, aplikace nespadne', async ({ page }, testInfo) => {
    const watch = watchPage(page)
    await page.goto('/tahle-routa-neexistuje')
    await expect(page.getByText(/nenalezena|404/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expect(watch.consoleErrors).toEqual([])
  })
})

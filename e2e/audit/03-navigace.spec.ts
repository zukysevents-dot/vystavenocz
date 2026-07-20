import { test, expect } from '@playwright/test'
import { watchPage, attachWatch, settle } from './helpers'

// Očekávaný šum při rychlém proklikávání: 403 z /attendance/current (Owner bez záznamu zaměstnance),
// 404 z growth/subscription-claims na Nastavení (designové empty stavy)
// a zachycený „Failed to fetch" z Restaurace při odchodu ze stránky uprostřed načítání.
const NAV_EXPECTED = [/status of 403/, /status of 404/, /Failed to fetch/]

// Průchod navigací tak, jak ji skutečně vidí uživatel — dynamicky podle vykreslených položek.

test('desktopová navigace: každá položka vede na funkční stránku', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const watch = watchPage(page, { allowStatus: [403, 404] })
  await page.goto('/app')
  await settle(page)

  const nav = page.locator('aside, nav').first()
  const hrefs = await nav
    .locator('a[href^="/app"]')
    .evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute('href')))])
  expect(hrefs.length, 'navigace obsahuje odkazy').toBeGreaterThan(5)

  for (const href of hrefs) {
    if (!href) continue
    // Klikáme přes skutečnou navigaci (ne goto), jako uživatel.
    const link = page.locator(`aside a[href="${href}"], nav a[href="${href}"]`).first()
    if (!(await link.isVisible().catch(() => false))) continue
    await link.click()
    await settle(page)
    await expect(page, `navigace na ${href}`).toHaveURL(new RegExp(href.replace(/\//g, '\\/')))
    await expect(page.getByText('Obsah se nepodařilo načíst')).toHaveCount(0)
    // Operativní stránky (restaurace) sidebar schovávají — vrať se přes URL.
    if (!(await page.locator('aside a[href="/app"], nav a[href="/app"]').first().isVisible().catch(() => false))) {
      await page.goto('/app')
      await settle(page)
    }
  }
  await attachWatch(testInfo, watch)
  expect(watch.consoleErrors.filter((e) => !NAV_EXPECTED.some((re) => re.test(e)))).toEqual([])
  expect(watch.badResponses).toEqual([])
})

test('mobilní menu: otevření, navigace, zavření', async ({ page }, testInfo) => {
  const watch = watchPage(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app')
  await settle(page)

  await page.getByRole('button', { name: 'Otevřít menu' }).click()
  const menuLinks = page.locator('a[href^="/app"]:visible')
  expect(await menuLinks.count()).toBeGreaterThan(3)

  // Navigace z mobilního menu.
  await page.locator('a[href="/app/faktury"]:visible').first().click()
  await expect(page).toHaveURL(/faktury/)
  await settle(page)

  // Menu jde znovu otevřít a zavřít křížkem. Drawer se zavírá transformem (zůstává v DOM),
  // takže ověřujeme odsunutí mimo viewport, ne zmizení. Pozn.: zavřený drawer zůstává
  // v accessibility tree — drobný a11y dluh, viz audit report.
  await page.getByRole('button', { name: 'Otevřít menu' }).click()
  const closeBtn = page.getByRole('button', { name: 'Zavřít menu' })
  await closeBtn.click()
  await expect
    .poll(async () => {
      const box = await closeBtn.boundingBox()
      return box ? box.x + box.width <= 0 : true
    }, { message: 'drawer se musí odsunout mimo viewport' })
    .toBe(true)

  await attachWatch(testInfo, watch)
  expect(watch.consoleErrors).toEqual([])
})

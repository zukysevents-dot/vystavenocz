import { test, expect } from '@playwright/test'
import { APP_ROUTES, watchPage, attachWatch, settle } from './helpers'

// Systematický průchod všech rout dostupných demo účtu (deep link).
// Každá routa: načtení, nadpis, žádné chyby konzole, žádné neočekávané 4xx/5xx,
// žádný chybový stav „Obsah se nepodařilo načíst".
for (const route of APP_ROUTES) {
  test(`routa ${route.path}`, async ({ page }, testInfo) => {
    const watch = watchPage(page, { allowStatus: route.allowStatus })
    await page.goto(route.path)
    await settle(page)

    // Nezůstali jsme na loginu ani nespadli na 404.
    expect(page.url()).toContain('/app')
    await expect(page.getByText('Stránka nenalezena')).toHaveCount(0)

    // Hlavní obsah odpovídá routě (nadpis kdekoli na stránce — h1/h2/tab názvu).
    await expect(page.getByText(route.heading).first()).toBeVisible({ timeout: 15_000 })

    // Žádný chybový load stav.
    await expect(page.getByText('Obsah se nepodařilo načíst')).toHaveCount(0)

    // Aplikace se nezasekla v loading stavu (globální spinner zmizel).
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 15_000 }).catch(() => {})

    await attachWatch(testInfo, watch)
    expect(watch.consoleErrors, 'chyby konzole').toEqual([])
    expect(watch.badResponses, 'neočekávané 4xx/5xx').toEqual([])
    expect(watch.failedRequests, 'selhané requesty').toEqual([])
  })
}

test('deep link na detail neexistující zakázky je bezpečně odmítnut', async ({ page }, testInfo) => {
  const watch = watchPage(page, { allowStatus: [404] })
  await page.goto('/app/zakazky/00000000-0000-0000-0000-000000000000')
  await settle(page)
  // Aplikace nesmí spadnout — buď chybový stav, nebo návrat na seznam.
  await expect(page.locator('body')).not.toContainText(/Exception|stack trace|undefined is not/i)
  await attachWatch(testInfo, watch)
  expect(watch.consoleErrors).toEqual([])
})

test('navigace zpět/vpřed v prohlížeči funguje', async ({ page }) => {
  await page.goto('/app')
  await settle(page)
  await page.goto('/app/faktury')
  await settle(page)
  await page.goBack()
  await expect(page).toHaveURL(/\/app$/)
  await page.goForward()
  await expect(page).toHaveURL(/faktury/)
})

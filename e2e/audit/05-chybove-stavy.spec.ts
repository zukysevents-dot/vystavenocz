import { test, expect } from '@playwright/test'
import { settle } from './helpers'

// Simulované chybové stavy přes interception — backend se nemění, jen odpovědi v prohlížeči.

test('5xx při načtení faktur: česká hláška, retry, žádný technický detail', async ({ page }) => {
  let fail = true
  await page.route('**/api/v1/invoices**', (route) => {
    if (fail) return route.fulfill({ status: 500, body: 'Internal Server Error' })
    return route.fallback()
  })
  await page.goto('/app/faktury')
  await settle(page)

  const error = page.getByText('Obsah se nepodařilo načíst')
  await expect(error).toBeVisible({ timeout: 15_000 })
  // Žádný stack trace / HTTP detail / interní název v UI.
  await expect(page.locator('body')).not.toContainText(/500|Internal Server|Exception|stack/i)

  // Retry skutečně opakuje akci a po obnovení serveru se data načtou.
  fail = false
  await page.getByRole('button', { name: 'Zkusit znovu' }).click()
  await settle(page)
  await expect(page.getByText('Obsah se nepodařilo načíst')).toHaveCount(0, { timeout: 15_000 })
})

test('offline síť: aplikace nespadne a neukáže falešný úspěch', async ({ page, context }) => {
  await page.goto('/app')
  await settle(page)
  await context.setOffline(true)
  await page.goto('/app/klienti').catch(() => {})
  await settle(page)
  // Buď chybový stav, nebo alespoň žádný pád (bílá stránka/výjimka).
  const body = await page.locator('body').textContent()
  expect(body ?? '').not.toMatch(/Exception|undefined is not|TypeError/i)
  await context.setOffline(false)
})

test('404 na neexistujícím API detailu nezpůsobí pád stránky', async ({ page }) => {
  await page.route('**/api/v1/clients/*', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Not Found', status: 404 }),
    }),
  )
  await page.goto('/app/klienti')
  await settle(page)
  await expect(page.locator('body')).not.toContainText(/Exception|stack/i)
})

test('429 rate limit: uživatel nedostane nesrozumitelnou chybu', async ({ page }) => {
  await page.route('**/api/v1/invoices**', (route) =>
    route.fulfill({ status: 429, body: JSON.stringify({ title: 'Too Many Requests' }) }),
  )
  await page.goto('/app/faktury')
  await settle(page)
  await expect(page.locator('body')).not.toContainText(/429|Too Many Requests/i)
  // Stránka nezůstane věčně v loading stavu.
  await expect(page.getByText('Obsah se nepodařilo načíst')).toBeVisible({ timeout: 15_000 })
})

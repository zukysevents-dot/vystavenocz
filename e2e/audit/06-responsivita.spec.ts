import { test, expect } from '@playwright/test'
import { settle } from './helpers'

// Základní responzivní audit: žádný horizontální overflow mimo zamýšlené tabulky,
// dostupné hlavní akce a funkční menu na mobilu.

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]

// Reprezentativní stránky (list, formulářová, operativní, reportová, nastavení).
const ROUTES = ['/app', '/app/faktury', '/app/pokladna', '/app/zasoby', '/app/nastaveni', '/app/uzaverka']

for (const vp of VIEWPORTS) {
  for (const route of ROUTES) {
    test(`bez horizontálního overflow ${route} @ ${vp.width}×${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp)
      await page.goto(route)
      await settle(page)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, 'stránka nesmí přetékat do stran').toBeLessThanOrEqual(1)
    })
  }
}

test('dialog na mobilu nevybíhá mimo viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/klienti')
  await settle(page)
  await page.getByRole('button', { name: 'Nový klient' }).first().click()
  const dialog = page.getByRole('dialog').first()
  await expect(dialog).toBeVisible()
  // Počkej na doběhnutí zoom animace dialogu, jinak měříme mezistav transformace.
  await expect
    .poll(async () => {
      const a = await dialog.boundingBox()
      await page.waitForTimeout(120)
      const b = await dialog.boundingBox()
      return a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.width - b.width) < 0.5
    })
    .toBe(true)
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(-1)
    expect(box.x + box.width).toBeLessThanOrEqual(391)
  }
  await page.keyboard.press('Escape')
})

test('fokus po otevření dialogu + zavření přes Escape', async ({ page }) => {
  await page.goto('/app/klienti')
  await settle(page)
  await page.getByRole('button', { name: 'Nový klient' }).first().click()
  const dialog = page.getByRole('dialog').first()
  await expect(dialog).toBeVisible()
  // Fokus je uvnitř dialogu (po doběhnutí open animace/autofocusu).
  await expect
    .poll(() =>
      page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]')
        return dlg ? dlg.contains(document.activeElement) : false
      }),
    )
    .toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

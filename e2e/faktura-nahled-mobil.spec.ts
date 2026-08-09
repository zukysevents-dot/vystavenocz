import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Doklad se vykresluje na pevné šířce A4 (794 px). Na mobilu se do obrazovky nevešel a byla vidět
// jen jeho levá část — teď se zmenší na dostupnou šířku a klepnutím se otevře přes celou obrazovku.

test('mobil: náhled faktury se vejde na obrazovku a klepnutím se otevře přes celou obrazovku', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seedApp(page, { subscription: 'pro' })
  // Bez rozhodnutého souhlasu překrývá banner spodek stránky (a tím i náhled).
  await page.addInitScript(() => {
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  })

  await page.goto('/app/faktury/editor')

  const preview = page.locator('.invoice-doc').first()
  await expect(preview).toBeVisible()

  const box = await preview.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(0)
  expect(box?.width ?? 0).toBeLessThanOrEqual(375)

  await page.getByRole('button', { name: 'Zobrazit fakturu přes celou obrazovku' }).click()
  await expect(page.getByRole('dialog').getByText('Náhled faktury')).toBeVisible()
})

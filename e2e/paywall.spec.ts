import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

test.describe('Paywall gating', () => {
  test('bez aktivního tarifu: Nová faktura otevře paywall a nenaviguje do editoru', async ({
    page,
  }) => {
    await seedApp(page, { subscription: 'expired' })
    await page.goto('/app/faktury')
    await page.getByRole('button', { name: 'Nová faktura' }).first().click()
    // Scope na dialog — text „Zkušební doba skončila" je i v TrialBanneru.
    await expect(page.getByRole('dialog').getByText('Zkušební doba skončila')).toBeVisible()
    await expect(page).toHaveURL(/\/app\/faktury$/)
  })

  test('s tarifem Pro: Nová faktura otevře editor', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/faktury')
    await page.getByRole('button', { name: 'Nová faktura' }).first().click()
    await expect(page).toHaveURL(/\/app\/faktury\/editor/)
  })

  test('bez tarifu: přímá URL editoru otevře paywall a koncept nelze uložit', async ({ page }) => {
    await seedApp(page, { subscription: 'expired' })
    await page.goto('/app/faktury/editor')
    await expect(page.getByRole('dialog').getByText('Zkušební doba skončila')).toBeVisible()
    await page.getByRole('button', { name: 'Zatím ne' }).click()

    // Počet faktur před pokusem o uložení (appka má demo data ze seed.ts).
    const invCount = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('vystaveno:invoices') || '[]').length)
    const before = await invCount()

    await page.getByRole('button', { name: 'Uložit koncept' }).click()
    // Paywall se vrátí a žádná NOVÁ faktura nepřibude.
    await expect(page.getByRole('dialog').getByText('Zkušební doba skončila')).toBeVisible()
    expect(await invCount()).toBe(before)
  })
})

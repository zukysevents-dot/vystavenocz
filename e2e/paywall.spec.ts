import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

test.describe('Paywall gating', () => {
  test('bez aktivního tarifu: Nová faktura otevře paywall a nenaviguje do editoru', async ({
    page,
  }) => {
    await seedApp(page, { subscription: 'expired' })
    await page.goto('/app/faktury')
    await page.getByRole('button', { name: 'Nová faktura' }).first().click()
    // Dialog říká, co se děje, ale žádnou cenu ani tarif netvrdí — ceník je modulární a
    // fakturace se v něm prodává jako součást bezplatného základu.
    await expect(page.getByRole('dialog').getByText('Novou fakturu teď nevystavíte')).toBeVisible()
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
    await expect(page.getByRole('dialog').getByText('Novou fakturu teď nevystavíte')).toBeVisible()
    await page.getByRole('button', { name: 'Rozumím' }).click()

    // Počet faktur před pokusem o uložení (appka má demo data ze seed.ts).
    const invCount = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('vystaveno:invoices') || '[]').length)
    const before = await invCount()

    await page.getByRole('button', { name: 'Uložit koncept' }).click()
    // Paywall se vrátí a žádná NOVÁ faktura nepřibude.
    await expect(page.getByRole('dialog').getByText('Novou fakturu teď nevystavíte')).toBeVisible()
    expect(await invCount()).toBe(before)
  })

  test('paywall neprodává zrušený tarif „Vystaveno Pro" ani cenu mimo ceník', async ({ page }) => {
    await seedApp(page, { subscription: 'expired' })
    await page.goto('/app/faktury/editor')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Novou fakturu teď nevystavíte')
    // Ceník tarif „Vystaveno Pro" neprodává a ceny uvádí BEZ DPH — dialog nesmí tvrdit ani jedno.
    await expect(dialog).not.toContainText('Vystaveno Pro')
    await expect(dialog).not.toContainText('neplátce DPH')
    await expect(dialog).not.toContainText('159')
    // Data zákazníka zůstávají dostupná — to je to podstatné, co má vědět.
    await expect(dialog).toContainText('vyexportovat')
  })
})

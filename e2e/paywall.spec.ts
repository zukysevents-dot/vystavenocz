import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Fakturace a klienti jsou podle ceníku ZDARMA NAVŽDY. Skončené předplatné proto fakturu
// nezavírá — zavírá ji jen ručně pozastavený přístup. Dřív appka po trialu ukázala paywall
// a chtěla peníze přesně za to, co ceník dává zdarma.
test.describe('Paywall gating', () => {
  test('skončené předplatné fakturu nezavírá — je podle ceníku zdarma navždy', async ({ page }) => {
    await seedApp(page, { subscription: 'expired' })
    await page.goto('/app/faktury')
    await page.getByRole('button', { name: 'Nová faktura' }).first().click()

    await expect(page).toHaveURL(/\/app\/faktury\/editor/)
    // Cookie lišta je taky dialog, proto se ptáme přímo na text paywallu.
    await expect(page.getByText('Přístup je pozastavený')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Uložit koncept' })).toBeEnabled()
  })

  test('s tarifem Pro: Nová faktura otevře editor', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/faktury')
    await page.getByRole('button', { name: 'Nová faktura' }).first().click()
    await expect(page).toHaveURL(/\/app\/faktury\/editor/)
  })

  test('pozastavený přístup: Nová faktura nenaviguje do editoru a vysvětlí to', async ({
    page,
  }) => {
    await seedApp(page, { subscription: 'suspended' })
    await page.goto('/app/faktury')
    await page.getByRole('button', { name: 'Nová faktura' }).first().click()

    await expect(page.getByRole('dialog').getByText('Přístup je pozastavený')).toBeVisible()
    await expect(page).toHaveURL(/\/app\/faktury$/)
  })

  test('pozastavený přístup: přímá URL editoru nedovolí uložit koncept', async ({ page }) => {
    await seedApp(page, { subscription: 'suspended' })
    await page.goto('/app/faktury/editor')
    await expect(page.getByRole('dialog').getByText('Přístup je pozastavený')).toBeVisible()
    await page.getByRole('button', { name: 'Rozumím' }).click()

    // Počet faktur před pokusem o uložení (appka má demo data ze seed.ts).
    const invCount = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('vystaveno:invoices') || '[]').length)
    const before = await invCount()

    await page.getByRole('button', { name: 'Uložit koncept' }).click()
    // Vysvětlení se vrátí a žádná NOVÁ faktura nepřibude.
    await expect(page.getByRole('dialog').getByText('Přístup je pozastavený')).toBeVisible()
    expect(await invCount()).toBe(before)
  })

  test('dialog neprodává zrušený tarif „Vystaveno Pro" ani cenu mimo ceník', async ({ page }) => {
    await seedApp(page, { subscription: 'suspended' })
    await page.goto('/app/faktury/editor')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Přístup je pozastavený')
    // Ceník tarif „Vystaveno Pro" neprodává a ceny uvádí BEZ DPH — dialog nesmí tvrdit ani jedno.
    await expect(dialog).not.toContainText('Vystaveno Pro')
    await expect(dialog).not.toContainText('neplátce DPH')
    await expect(dialog).not.toContainText('159')
    // Data zákazníka zůstávají dostupná — to je to podstatné, co má vědět.
    await expect(dialog).toContainText('vyexportovat')
  })
})

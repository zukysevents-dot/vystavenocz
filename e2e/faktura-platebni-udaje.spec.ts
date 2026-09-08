import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Faktura „převodem" bez čísla účtu je pro odběratele nepoužitelná: nemá kam zaplatit a nevznikne
// ani QR platba (skládá se z IBANu odvozeného z čísla účtu). Číslo účtu je přitom v nastavení
// nepovinné, takže takový doklad dřív vznikl bez jediného upozornění a chybu našla až účetní.

const WARNING = '[data-testid="editor-chybi-cislo-uctu"]'

test.describe('Faktura bez čísla účtu', () => {
  test('editor upozorní, že na dokladu nebude kam zaplatit', async ({ page }) => {
    await seedApp(page, { company: { bankAccount: null, iban: null } })
    await page.goto('/app/faktury/editor')

    const warning = page.locator(WARNING)
    await expect(warning).toBeVisible()
    await expect(warning).toContainText('Nemáte vyplněné číslo účtu')
    // Musí říct, co s tím uživatel udělá — ne jen konstatovat problém.
    await expect(warning.getByRole('link', { name: 'Otevřít nastavení firmy' })).toBeVisible()
  })

  test('u hotovosti upozornění nesvítí — účet se na doklad netiskne', async ({ page }) => {
    await seedApp(page, { company: { bankAccount: null, iban: null } })
    await page.goto('/app/faktury/editor')
    await expect(page.locator(WARNING)).toBeVisible()

    await page.locator('#inv-payment').click()
    await page.getByRole('option', { name: 'Hotově' }).click()

    await expect(page.locator(WARNING)).toBeHidden()
  })

  test('firma s vyplněným účtem upozornění nevidí', async ({ page }) => {
    await seedApp(page) // výchozí profil číslo účtu má
    await page.goto('/app/faktury/editor')

    await expect(page.getByLabel('Způsob úhrady')).toBeVisible() // editor je načtený
    await expect(page.locator(WARNING)).toBeHidden()
  })

  test('samotný IBAN stačí — je z čeho složit QR platbu', async ({ page }) => {
    await seedApp(page, { company: { bankAccount: null, iban: 'CZ6508000000192000145399' } })
    await page.goto('/app/faktury/editor')

    await expect(page.getByLabel('Způsob úhrady')).toBeVisible()
    await expect(page.locator(WARNING)).toBeHidden()
  })
})

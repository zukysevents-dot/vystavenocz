import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Registrace dřív nevynucovala ani nezmiňovala údaje, bez kterých je vystavená faktura vadná:
// uživatel nechal pole prázdná, uložení mlčky prošlo a chybu našla až účetní odběratele.
// Typicky chybějící číslo účtu — na dokladu pak není kam zaplatit a nevznikne QR platba.

const SUMMARY = '[data-testid="onboarding-chybi-udaje"]'

test.describe('Registrace ukáže, co chybí vyplnit', () => {
  test('prázdný profil vypíše chybějící údaje i s důvodem', async ({ page }) => {
    await seedApp(page, {
      company: { bankAccount: null, iban: null, street: '', city: '', zip: '' },
    })
    await page.goto('/app/onboarding')

    const summary = page.locator(SUMMARY)
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('Číslo účtu')
    await expect(summary).toContainText('QR platba')
    await expect(summary).toContainText('Sídlo firmy')
    // Doporučení, ne blokace — dokončit registraci musí jít i tak.
    await expect(summary).toContainText('Pokračovat můžete i bez nich')
    await expect(page.getByRole('button', { name: 'Uložit a pokračovat' })).toBeEnabled()
  })

  test('vyplněné číslo účtu zmizí ze seznamu', async ({ page }) => {
    await seedApp(page, {
      company: { bankAccount: null, iban: null, street: '', city: '', zip: '' },
    })
    await page.goto('/app/onboarding')
    await expect(page.locator(SUMMARY)).toContainText('Číslo účtu')

    await page.locator('#bank_account').fill('123456789/0100')

    await expect(page.locator(SUMMARY)).not.toContainText('Číslo účtu')
    await expect(page.locator(SUMMARY)).toContainText('Sídlo firmy') // zbytek hlásí dál
  })

  test('kompletní profil žádné upozornění neukáže', async ({ page }) => {
    await seedApp(page) // výchozí profil má účet i sídlo
    await page.goto('/app/onboarding')

    await expect(page.locator('#bank_account')).toHaveValue('123456789/0100')
    await expect(page.locator(SUMMARY)).toBeHidden()
  })

  test('kliknutí na chybějící údaj skočí do pole', async ({ page }) => {
    await seedApp(page, { company: { bankAccount: null, iban: null } })
    await page.goto('/app/onboarding')

    await page.locator(SUMMARY).getByRole('button', { name: 'Číslo účtu' }).click()

    await expect(page.locator('#bank_account')).toBeFocused()
  })
})

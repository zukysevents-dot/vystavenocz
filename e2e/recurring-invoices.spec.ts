import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Opakované faktury V2 (mock režim, localStorage) — staví proti kontraktu docs/backend/recurring-invoices-v2.md.
// Ověřuje UI tok: vytvoření šablony, pauza/obnova, ruční „Vygenerovat teď" (vznikne koncept faktury) a odkaz na doklad.
// Součty i další běh v ostrém API režimu počítá server; mock je stand-in pro flow bez backendu.

async function invoiceCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('vystaveno:invoices') ?? '[]').length)
}

test.describe('Opakované faktury V2', () => {
  test('vytvoření, pauza/obnova a vygenerování konceptu', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/opakovane-faktury')

    await expect(
      page.getByRole('heading', { name: 'Opakované faktury', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Zatím žádné opakované faktury')).toBeVisible()

    // --- Nová šablona ---
    await page.getByRole('button', { name: 'Nová šablona' }).first().click()
    await page.getByLabel('Název šablony').fill('Měsíční paušál — web')
    await page.getByLabel('Odběratel').selectOption({ label: 'E2E Klient' })
    await page.getByLabel('Den v měsíci').fill('1')
    await page.getByLabel('Popis').fill('Správa a údržba webu')
    await page.getByLabel('Množství').fill('1')
    await page.getByLabel('Cena/ks').fill('5000')
    await page.getByRole('button', { name: 'Vytvořit' }).click()

    // Řádek se objeví v tabulce jako Aktivní.
    const table = page.locator('table')
    await expect(table.getByText('Měsíční paušál — web')).toBeVisible()
    await expect(table.getByText('E2E Klient')).toBeVisible()
    await expect(table.getByText('Aktivní')).toBeVisible()

    // --- Pauza / obnova ---
    await table.getByRole('button', { name: 'Pozastavit' }).click()
    await expect(table.getByText('Pozastavená')).toBeVisible()
    await table.getByRole('button', { name: 'Obnovit' }).click()
    await expect(table.getByText('Aktivní')).toBeVisible()

    // --- Vygenerovat teď → vznikne koncept faktury ---
    expect(await invoiceCount(page)).toBe(0)
    await table.getByRole('button', { name: 'Vygenerovat teď' }).click()
    await expect(page.getByText('Koncept faktury vytvořen')).toBeVisible()
    expect(await invoiceCount(page)).toBe(1)

    // Detail šablony ukáže vytvořený doklad s odkazem.
    await table.getByRole('button', { name: 'Měsíční paušál — web' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Vytvořené doklady')).toBeVisible()
    await expect(dialog.getByText(/Koncept · \d{4}-\d{2}/)).toBeVisible() // řádek běhu s odkazem na doklad
  })
})

import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'
import { dismissCookies } from './helpers/cookies'

// Sklad produktů je v mocku prázdný (seed plní jen klienty) → všechny 3 se vytvoří.

test('import produktů z CSV: stejný wizard, entita produkty, naplní katalog', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import?entity=products')

  await expect(page.getByRole('heading', { name: 'Import produktů' })).toBeVisible()
  await page.locator('#import-file').setInputFiles('e2e/fixtures/produkty.csv')
  await expect(page.getByText('produkty.csv')).toBeVisible()
  await expect(page.getByText('3 řádků')).toBeVisible()
  await page.getByRole('button', { name: /Pokračovat/ }).click()

  await expect(page.getByText('3 vytvoří')).toBeVisible()
  await page.getByRole('button', { name: /Importovat/ }).click()

  await expect(page.getByText('Import dokončen')).toBeVisible()
  await expect(page.getByText(/Vytvořeno 3 produktů/)).toBeVisible()

  await page.goto('/app/sklad')
  await expect(page.getByText('Espresso')).toBeVisible()
  await expect(page.getByText('Cappuccino')).toBeVisible()
})

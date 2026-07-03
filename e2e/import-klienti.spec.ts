import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'
import { dismissCookies } from './helpers/cookies'

// Fixture klienti.csv: 3 řádky. Třetí (IČO 27604977) je duplicita seedovaného
// E2E Klienta → 2 se vytvoří, 1 se přeskočí.

test('import klientů z CSV: nahrání → mapování → náhled → import → klient v seznamu', async ({
  page,
}) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import')

  // Krok 1: nahraj soubor (skrytý input)
  await page.locator('#import-file').setInputFiles('e2e/fixtures/klienti.csv')

  // Krok 2: mapování — soubor naparsován, předvyplněné mapování
  await expect(page.getByText('klienti.csv')).toBeVisible()
  await expect(page.getByText('3 řádků')).toBeVisible()
  await page.getByRole('button', { name: /Pokračovat/ }).click()

  // Krok 3: náhled — 2 vytvoří, 1 duplicita přeskočí
  await expect(page.getByText('2 vytvoří')).toBeVisible()
  await expect(page.getByText('1 přeskočí')).toBeVisible()
  await page.getByRole('button', { name: /Importovat/ }).click()

  // Krok 4: výsledek
  await expect(page.getByText('Import dokončen')).toBeVisible()
  await expect(page.getByText(/Vytvořeno 2 klientů/)).toBeVisible()

  // Klienti jsou v seznamu
  await page.goto('/app/klienti')
  await expect(page.getByText('Nový Klient s.r.o.')).toBeVisible()
  await expect(page.getByText('Druhý Odběratel')).toBeVisible()
})

test('rollback vrátí naimportované klienty', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import')
  await page.locator('#import-file').setInputFiles('e2e/fixtures/klienti.csv')
  await expect(page.getByText('klienti.csv')).toBeVisible()
  await page.getByRole('button', { name: /Pokračovat/ }).click()
  await page.getByRole('button', { name: /Importovat/ }).click()
  await expect(page.getByText('Import dokončen')).toBeVisible()

  await page.getByRole('button', { name: /Vrátit import/ }).click()

  // Naimportovaní klienti zmizí, seedovaný E2E Klient zůstává
  await page.goto('/app/klienti')
  await expect(page.getByText('Nový Klient s.r.o.')).toHaveCount(0)
  await expect(page.getByText('E2E Klient')).toBeVisible()
})

test('import klientů z XLSX: reálný soubor přes celý wizard', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import')

  await page.locator('#import-file').setInputFiles('e2e/fixtures/klienti.xlsx')
  await expect(page.getByText('klienti.xlsx')).toBeVisible()
  await expect(page.getByText('3 řádků')).toBeVisible()
  await page.getByRole('button', { name: /Pokračovat/ }).click()

  await expect(page.getByText('2 vytvoří')).toBeVisible()
  await expect(page.getByText('1 přeskočí')).toBeVisible()
  await page.getByRole('button', { name: /Importovat/ }).click()

  await expect(page.getByText('Import dokončen')).toBeVisible()
  await page.goto('/app/klienti')
  await expect(page.getByText('Nový Klient s.r.o.')).toBeVisible()
  await expect(page.getByText('Druhý Odběratel')).toBeVisible()
})

test('import klientů z Fakturoid XML: vytáhne unikátní klienty z faktur', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import')

  await page.locator('#import-file').setInputFiles('e2e/fixtures/fakturoid.xml')
  await expect(page.getByText('fakturoid.xml')).toBeVisible()
  await expect(page.getByText('2 řádků')).toBeVisible() // 2 unikátní klienti ze 3 faktur
  await page.getByRole('button', { name: /Pokračovat/ }).click()

  await expect(page.getByText('2 vytvoří')).toBeVisible()
  await page.getByRole('button', { name: /Importovat/ }).click()

  await expect(page.getByText('Import dokončen')).toBeVisible()
  await page.goto('/app/klienti')
  await expect(page.getByText('Alfa Studio s.r.o.')).toBeVisible()
  await expect(page.getByText('Beta Events z. s.')).toBeVisible()
})

test('doplnění z ARES: prázdné město se doplní podle IČO', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import')

  await page.locator('#import-file').setInputFiles('e2e/fixtures/klienti-ares.csv')
  await expect(page.getByText('klienti-ares.csv')).toBeVisible()
  await page.getByRole('button', { name: /Pokračovat/ }).click()

  await page.getByRole('button', { name: /Doplnit z ARES/ }).click()
  await expect(page.getByText(/Doplněno z ARES/)).toBeVisible() // toast = dávka hotová

  await page.getByRole('button', { name: /Importovat/ }).click()
  await expect(page.getByText('Import dokončen')).toBeVisible()

  // Klient má město doplněné z ARES (IČO 27082440 → Alza, Praha 7).
  await page.goto('/app/klienti')
  await expect(page.getByText(/Praha 7/)).toBeVisible()
})

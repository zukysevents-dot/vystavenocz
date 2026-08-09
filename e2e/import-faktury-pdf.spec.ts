import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'
import { dismissCookies } from './helpers/cookies'

/**
 * Import faktur z PDF a ze ZIP dávky.
 *
 * Běží ve skutečném prohlížeči, protože pdf.js potřebuje browser API
 * (DOMMatrix, worker) — v jsdom se tahle cesta ověřit nedá.
 *
 * Fixtures jsou reálné PDF faktury s českou diakritikou, včetně dvousloupcové
 * hlavičky dodavatel/odběratel — přesně to místo, kde se vytěžování láme.
 */

test('import jedné PDF faktury: vytěží čísla, strany i částku', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import/faktury')

  await expect(page.getByRole('heading', { name: 'Import faktur z jiného programu' })).toBeVisible()
  await page.locator('#invoice-file').setInputFiles('e2e/fixtures/faktura-pdf-import.pdf')

  // Doklad je čitelný celý → jde rovnou k importu, ne ke kontrole.
  await expect(page.getByText('1 importuje')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('cell', { name: /2024-0042/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Stavby Dvořák a.s.' })).toBeVisible()
  // Zdrojový soubor je u řádku vidět, aby šla chyba v dávce dohledat.
  await expect(page.getByRole('table').getByText('faktura-pdf-import.pdf')).toBeVisible()

  // Částka musí sedět na originál včetně DPH (10 000 + 21 % = 12 100).
  await expect(page.getByRole('cell', { name: /12\s*100,00/ })).toBeVisible()

  await page.getByRole('button', { name: /Importovat 1 faktur/ }).click()
  await expect(page.getByText('Import dokončen')).toBeVisible()

  await page.goto('/app/faktury')
  await expect(page.getByRole('cell', { name: '2024-0042' })).toBeVisible()
})

test('import ZIP dávky: rozbalí podsložky a nabídne navázání číselné řady', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import/faktury')

  await page.locator('#invoice-file').setInputFiles('e2e/fixtures/faktury-davka.zip')

  await expect(page.getByText('2 importuje')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('cell', { name: /2024-0042/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: /2024-0043/ })).toBeVisible()

  // Jádro věci: po převzetí historie musí být jasné, jaké číslo dostane další
  // faktura. Fixtures jsou z roku 2024, takže se podle kalendáře buď naváže
  // (2024-0044), nebo se pořadí resetuje na nový rok — obojí je správně, ale
  // číslo v nabídce se musí shodovat s tím, co pak ukáže Nastavení.
  const series = page.getByText(/Nejvyšší importované číslo je/)
  await expect(series).toContainText('2024-0043')
  const nextNumber = (await series.textContent())?.match(/\d{4}-\d{4}\s*\.?\s*$/)?.[0]?.trim()
  const expectedNext = nextNumber?.replace(/\.$/, '')
  expect(expectedNext).toBeTruthy()

  await page.getByRole('button', { name: 'Navázat číselnou řadu' }).click()
  await expect(page.getByRole('button', { name: 'Číselná řada nastavena' })).toBeVisible()

  await page.getByRole('button', { name: /Importovat 2 faktur/ }).click()
  await expect(page.getByText(/Naimportováno 2 faktur/)).toBeVisible()

  // Nastavení firmy drží navázanou řadu a ukazuje totéž číslo jako import.
  await page.goto('/app/nastaveni')
  await expect(page.getByText(`Příští faktura: ${expectedNext}`)).toBeVisible()
})

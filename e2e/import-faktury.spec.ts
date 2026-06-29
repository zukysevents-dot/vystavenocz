import { test, expect } from '@playwright/test'
import { seedApp } from './helpers/seed'
import { dismissCookies } from './helpers/cookies'

// E2E běží v mock režimu → importHistorical vytvoří faktury v plné věrnosti
// (číslo, stav, datumy). V API/produkci cílí na /invoices/import (čeká na backend).

test('import faktur z Fakturoid XML: náhled → import → faktury v seznamu', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await dismissCookies(page)
  await page.goto('/app/import/faktury')

  await expect(page.getByRole('heading', { name: 'Import faktur z Fakturoidu' })).toBeVisible()
  await page.locator('#invoice-file').setInputFiles('e2e/fixtures/fakturoid-faktury.xml')

  await expect(page.getByText('2 importuje')).toBeVisible()
  await page.getByRole('button', { name: /Importovat 2 faktur/ }).click()

  await expect(page.getByText('Import dokončen')).toBeVisible()
  await expect(page.getByText(/Naimportováno 2 faktur/)).toBeVisible()

  // Faktury jsou v seznamu se zachovaným číslem, klientem i stavem.
  // (FakturyPage má kartový i tabulkový pohled → cílíme na viditelné buňky tabulky.)
  await page.goto('/app/faktury')
  await expect(page.getByRole('cell', { name: '2024001' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Alfa s.r.o.' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Beta s.r.o.' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Zaplaceno' }).first()).toBeVisible()
})

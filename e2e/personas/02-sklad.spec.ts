import { test, expect, go, visibleNavLabels } from './fixtures'
import { authFile } from './personas'

// PERSONA 2 — Skladník (role Stockkeeper: catalog.read + cost_view, inventory.read/manage, BEZ write_off).
// Scénář: příjem zboží, stav zásob, výdej, inventura, objednání chybějících položek.
// Testovací data: demo sklad (produkty + zásoby ze seedu). Příjem/výdej v páru (+1/−1 ks) na lokální
// e2e DB → čistá nula; inventuru a odpis NEPOTVRZUJEME (jen otevřeme dialog).
//
// ZNÁMÉ NÁLEZY (dokumentují je annotations, allowStatus 403 je propouští):
//  - GET /locations vrací Stockkeeperovi 403 (nemá company.read) → chybí filtr poboček a příjemka
//    může být zablokovaná na výběru pobočky.
//  - FE roli „Stockkeeper" nezná → menu se nefiltruje (vidí i finance), role-gated routy přesměrují.

test.use({ storageState: authFile('sklad'), allowStatus: [403] })

test('přehled stavu skladu + vyhledávání + filtr pobočky', async ({ page }, testInfo) => {
  await go(page, '/app/zasoby')
  await expect(page.getByRole('heading', { name: /Stav skladu|Zásoby/ }).first()).toBeVisible()
  const search = page.getByPlaceholder(/Hledat podle názvu/).first()
  await expect(search).toBeVisible()
  await search.fill('pivo')
  await page.waitForTimeout(600)
  await expect(page.locator('main')).not.toContainText(/Něco se pokazilo|Chyba/)
  await search.clear()
  const filtr = await page
    .getByText(/Všechny pobočky|Centrum/)
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Filtr pobočky pro skladníka: ${filtr ? 'ano' : 'NE — /locations vrací 403 (Stockkeeper nemá company.read)'}`,
  })
})

test('skladové minimum je vidět', async ({ page }, testInfo) => {
  await go(page, '/app/zasoby')
  const min = await page
    .getByText(/minim|doobjedn|Pod limitem/i)
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Indikace skladového minima na Zásobách: ${min ? 'ano' : 'NE'}`,
  })
})

test('příjem zboží: příjemka +1 ks, poté výdej −1 ks (čistá nula)', async ({ page }, testInfo) => {
  test.skip(
    test.info().project.name === 'mobile',
    'Párový příjem/výdej stačí ověřit jednou (desktop).',
  )
  await go(page, '/app/naskladneni')
  await expect(
    page.getByRole('heading', { name: /Příjem zboží|Naskladnění/ }).first(),
  ).toBeVisible()
  await page.getByPlaceholder(/Makro/).first().fill('E2E dodavatel')
  await page.getByPlaceholder(/hledejte podle názvu/i).fill('pivo')
  await page.waitForTimeout(800)
  const hit = page.locator('main button').filter({ hasText: /pivo/i }).first()
  test.skip(
    !(await hit.isVisible().catch(() => false)),
    'Produkt „pivo" nenalezen — příjem ověř manuálně.',
  )
  await hit.click()
  const save = page.getByRole('button', { name: /Uložit příjemku/ }).first()
  await save.click()
  // Úspěch = toast „Příjemka uložena…"; chybová hláška = nález (typicky zablokovaný výběr pobočky kvůli 403).
  const toast = page.locator('[data-sonner-toast], [role="status"], [role="alert"]').last()
  await expect(toast).toBeVisible({ timeout: 15_000 })
  const toastText = (await toast.innerText()).replace(/\s+/g, ' ').trim()
  testInfo.annotations.push({
    type: 'nález',
    description: `Uložení příjemky skladníkem: „${toastText}"`,
  })
  expect(toastText, 'skladník musí umět uložit příjemku (hlavní workflow persony)').toMatch(
    /Příjemka uložena/,
  )

  // Výdej −1 ks stejného produktu ze Stavu skladu (běžný výdej — Stockkeeper na něj má právo).
  await go(page, '/app/zasoby')
  await page
    .getByPlaceholder(/Hledat podle názvu/)
    .first()
    .fill('pivo')
  await page.waitForTimeout(800)
  await page.getByTitle('Výdej').first().click() // ikonová akce v řádku (title = přístupný název)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText(/Výdej/)
  await dialog.locator('input[type="number"]').first().fill('1')
  await dialog.getByRole('button', { name: 'Uložit', exact: true }).click()
  await expect(page.getByText(/uložen|schválení/i).first()).toBeVisible({ timeout: 15_000 })
})

test('korekce a inventura: dialogy se otevřou, NEPOTVRZUJEME', async ({ page }) => {
  await go(page, '/app/zasoby')
  const inventura = page.getByRole('button', { name: /Inventura/ }).first()
  await expect(inventura, 'tlačítko Inventura je dostupné').toBeVisible()
  await inventura.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText(/má být|Realita|Rozdíl/i)
  await page.keyboard.press('Escape') // inventuru nepotvrzujeme
  const korekce = page
    .locator('main')
    .getByRole('button', { name: /Korekce/ })
    .first()
  if (await korekce.isVisible().catch(() => false)) {
    await korekce.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape') // korekci nepotvrzujeme
  }
})

test('pohyby skladu: skladové doklady a zrcadlo', async ({ page }) => {
  await go(page, '/app/skladove-doklady')
  await expect(page.getByRole('heading', { name: /Skladové doklady/ }).first()).toBeVisible()
  await go(page, '/app/zasoby')
  const zrcadlo = page
    .getByRole('tab', { name: /Zrcadlo/ })
    .or(page.getByText('Zrcadlo'))
    .first()
  if (await zrcadlo.isVisible().catch(() => false)) {
    await zrcadlo.click()
    await expect(page.locator('main')).toContainText(/má být|Realita|Rozdíl/i)
  }
})

test('návrhy objednávek a stav podle poboček', async ({ page }, testInfo) => {
  await go(page, '/app/naskladneni')
  const doobj = await page
    .getByText(/K doobjednání/i)
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Sekce „K doobjednání" (návrhy objednávek): ${doobj ? 'ano' : 'NE'}`,
  })
  await go(page, '/app/zasoby')
  const tab = page
    .getByRole('tab', { name: /poboč/i })
    .or(page.getByText(/Podle poboček/))
    .first()
  const tabVisible = await tab.isVisible().catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Tab „Podle poboček" pro skladníka: ${tabVisible ? 'ano' : 'NE (bez /locations se nezobrazí)'}`,
  })
})

test('gating: skladník a cizí oblasti (dokumentace skutečného chování)', async ({
  page,
}, testInfo) => {
  // Role-gated routy FE přesměruje na dashboard (hasRole('Stockkeeper') = false).
  await go(page, '/app/audit')
  await expect(page, 'audit musí skladníka přesměrovat pryč').not.toHaveURL(/\/app\/audit/)
  await go(page, '/app/uzaverka')
  await expect(page, 'uzávěrka musí skladníka přesměrovat pryč').not.toHaveURL(/\/app\/uzaverka/)

  // Modulové routy bez role gate FE pustí — backend musí odmítnout data (403), UI nesmí spadnout.
  await go(page, '/app/faktury')
  const bodyText = (
    await page
      .locator('main')
      .innerText()
      .catch(() => '')
  ).slice(0, 400)
  testInfo.annotations.push({
    type: 'nález',
    description: `Skladník na /app/faktury: URL=${page.url()} — obsah: ${bodyText.replace(/\s+/g, ' ').slice(0, 200)}`,
  })
  await expect(page.locator('main')).not.toContainText(/undefined|NaN|Exception/)
})

test('menu skladníka: co reálně vidí (podklad pro report)', async ({ page }, testInfo) => {
  await go(page, '/app/zasoby')
  const labels = await visibleNavLabels(page)
  testInfo.annotations.push({
    type: 'nález',
    description: `Menu Stockkeeper: ${labels.join(', ')}`,
  })
  expect(labels.join('|')).toContain('Stav skladu')
  // ZNÁMÝ NÁLEZ P2: FE roli Stockkeeper nezná → menu ukazuje i finance (Faktury apod.).
  const seesFinance = labels.join('|').includes('Faktury')
  testInfo.annotations.push({
    type: 'nález',
    description: `Menu skladníka obsahuje Faktury: ${seesFinance ? 'ANO (P2 — hiddenForRoles nezná Stockkeeper)' : 'ne'}`,
  })
})

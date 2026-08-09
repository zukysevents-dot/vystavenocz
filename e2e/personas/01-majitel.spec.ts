import { test, expect, go, visibleNavLabels } from './fixtures'
import { authFile } from './personas'

// PERSONA 1 — Majitel firmy (role Owner, demo účet, všechny moduly).
// Scénář: rychle zjistit, jak se firmě daří, vystavit doklad a zkontrolovat provoz.
// Testovací data: seed-demo firma „Vystaveno Demo Gastro" (3 pobočky, roční historie prodejů).
// Bezpečnostní omezení: vytváří jen DRAFT dokladů, nic neodesílá e-mailem, nemaže data.

test.use({ storageState: authFile('majitel') })

test('dashboard: přehled dne, srozumitelný přínos obrazovky', async ({ page }, testInfo) => {
  await go(page, '/app')
  await expect(page.getByRole('heading', { name: /Dnes ve firmě|Přehled/ }).first()).toBeVisible()
  // Majitel musí z dashboardu vyčíst tržby/čísla bez klikání dál.
  await expect(page.locator('main')).toContainText(/Kč/)
  // Přepnutí pobočky, pokud existuje (demo má 3 pobočky) — dokumentace stavu.
  const locationSwitch = await page
    .getByText(/Všechny pobočky|Centrum/)
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Přepínač pobočky na dashboardu: ${locationSwitch ? 'ano' : 'NE'}`,
  })
})

test('menu: majitel vidí všechny hlavní oblasti', async ({ page }) => {
  await go(page, '/app')
  const labels = await visibleNavLabels(page)
  for (const expected of [
    'Faktury',
    'Pokladna',
    'Stav skladu',
    'Klienti',
    'Rezervace',
    'Nastavení',
    'Historie změn',
    'Pobočky',
    'Schvalování',
  ]) {
    expect.soft(labels.join('|'), `menu obsahuje „${expected}"`).toContain(expected)
  }
})

test('finance: faktury, po splatnosti, cashflow, DPH', async ({ page }, testInfo) => {
  await go(page, '/app/faktury')
  await expect(page.getByRole('heading', { name: /Faktury/ }).first()).toBeVisible()
  await expect(page.locator('main')).toContainText(/Kč/)
  const overdue = await page
    .getByText(/po splatnosti/i)
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Štítek/filtr „po splatnosti" na Fakturách: ${overdue ? 'ano' : 'NE'}`,
  })

  await go(page, '/app/cashflow')
  await expect(page.getByRole('heading', { name: /Pohledávky a peníze/ }).first()).toBeVisible()

  await go(page, '/app/dph')
  await expect(page.getByRole('heading', { name: /DPH/ }).first()).toBeVisible()
})

test('reporty: výsledky provozu a porovnání poboček', async ({ page }) => {
  await go(page, '/app/provozni-prehled')
  await expect(
    page.getByRole('heading', { name: /Výsledky provozu|Provozní/ }).first(),
  ).toBeVisible()
  await go(page, '/app/konsolidace')
  await expect(page.getByRole('heading', { name: /Porovnání poboček/ }).first()).toBeVisible()
})

test('klienti a produkty', async ({ page }) => {
  await go(page, '/app/klienti')
  await expect(page.getByRole('heading', { name: /Klienti/ }).first()).toBeVisible()
  await go(page, '/app/sklad')
  await expect(page.getByRole('heading', { name: /Produkty|Sklad/ }).first()).toBeVisible()
})

test('vystavení dokladu: nová faktura (draft) přes editor', async ({ page }) => {
  test.skip(
    test.info().project.name === 'mobile',
    'Editor faktury ověřujeme na desktopu; mobil = manuální scénář.',
  )
  await go(page, '/app/faktury/editor')
  // Výběr klienta (demo klienti existují ze seedu).
  await page.getByText('Vyberte klienta…').first().click()
  await page.getByRole('option').first().click()
  // Editor startuje s jedním prázdným řádkem — vyplníme ho (prázdný popis backend odmítá 422).
  await page.getByPlaceholder('Popis položky').first().fill('E2E persona test — konzultace')
  await page.getByRole('button', { name: /Uložit koncept/ }).click()
  await expect(page.getByText('Koncept uložen.').first()).toBeVisible({ timeout: 15_000 })
})

test('nabídky a zakázky: vstupní body existují', async ({ page }) => {
  await go(page, '/app/nabidky')
  await expect(page.getByRole('heading', { name: /Nabídky/ }).first()).toBeVisible()
  expect
    .soft(
      await page
        .getByRole('button', { name: /Nová nabídka|Přidat/ })
        .first()
        .isVisible()
        .catch(() => false),
      'tlačítko pro novou nabídku',
    )
    .toBe(true)
  await go(page, '/app/zakazky')
  await expect(page.getByRole('heading', { name: /Zakázky/ }).first()).toBeVisible()
})

test('export pro účetní je dostupný', async ({ page }) => {
  await go(page, '/app/uctarna')
  await expect(page.getByRole('heading', { name: /účetní|Účtárna/i }).first()).toBeVisible()
  expect
    .soft(
      await page
        .getByRole('button', { name: /Stáhnout|Export/i })
        .first()
        .isVisible()
        .catch(() => false),
      'tlačítko stažení exportu',
    )
    .toBe(true)
})

test('tým, nastavení firmy, moduly a předplatné', async ({ page }, testInfo) => {
  await go(page, '/app/nastaveni')
  await expect(page.getByRole('heading', { name: /Nastavení/ }).first()).toBeVisible()
  // Členové firmy a moduly — dosažitelnost z Nastavení (dokumentace; na mobilu jsou sekce skládané).
  const clenove = await page
    .getByText(/Tým|Členové|Uživatelé|Oprávnění/)
    .first()
    .isVisible()
    .catch(() => false)
  const moduly = await page
    .getByText(/Moduly|moduly/)
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Nastavení (${test.info().project.name}): správa členů viditelná=${clenove}, sekce Moduly viditelná=${moduly}`,
  })
  await go(page, '/app/predplatne')
  await expect(page.getByRole('heading', { name: /Předplatné/ }).first()).toBeVisible()
  await expect(page.locator('main')).toContainText(/Kč|tarif/i)
})

test('citlivé stránky majitele: audit, pobočky, schvalování', async ({ page }) => {
  await go(page, '/app/audit')
  await expect(page).toHaveURL(/\/app\/audit/)
  await go(page, '/app/pobocky')
  await expect(page).toHaveURL(/\/app\/pobocky/)
  await go(page, '/app/schvalovani')
  await expect(page).toHaveURL(/\/app\/schvalovani/)
  await expect(page.getByRole('heading', { name: /Schvalování/ }).first()).toBeVisible()
})

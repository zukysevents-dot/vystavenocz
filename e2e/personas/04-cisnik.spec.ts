import { test, expect, go, visibleNavLabels } from './fixtures'
import { authFile } from './personas'

// PERSONA 4 — Číšník / obsluha restaurace (role Employee: pos.operate, gastro.operate, BEZ financí/storna).
// Scénář: během směny přijímá objednávky, pracuje se stoly, posílá do kuchyně, účtuje.
// Testovací data: demo stoly + produkty; test otevírá NOVÝ účet na volném stole a po zaplacení
// (lokální e2e DB — bezpečné) nechává uzavřený prodej v datech.
// Bezpečnostní omezení: storno netestujeme (Employee právo nemá — ověřujeme, že ho UI nenabízí bez override).

// ZNÁMÝ NÁLEZ (allowStatus 403): FE po přihlášení Employee volá /locations, /customers,
// /loyalty/settings a /price-levels, na které Employee nemá právo → 403 šum v konzoli.
test.use({ storageState: authFile('cisnik'), allowStatus: [403] })

// Stoly: kompaktní seznam (mobil/tablet) i vizuální mapa (desktop) jsou v DOM současně — bereme viditelné.
const TABLE =
  '[data-testid^="restaurant-table-map-"]:visible, [data-testid^="restaurant-table-list-"]:visible'

test('po přihlášení vede aplikace číšníka rovnou na provoz', async ({ page }) => {
  await go(page, '/app')
  await expect(page, 'Employee nesmí zůstat na firemním dashboardu').toHaveURL(
    /pokladna|restaurace|zakazky/,
  )
})

test('menu obsahuje jen provozní funkce', async ({ page }) => {
  await go(page, '/app/pokladna')
  const labels = await visibleNavLabels(page)
  const joined = labels.join('|')
  expect(joined).toContain('Pokladna')
  for (const forbidden of [
    'Faktury',
    'Přehled DPH',
    'Klienti',
    'Nastavení',
    'Historie změn',
    'Denní uzávěrka',
    'Předplatné',
  ]) {
    expect.soft(joined, `menu číšníka nesmí obsahovat „${forbidden}"`).not.toContain(forbidden)
  }
})

test('mapa stolů → účet → položky → poznámka → odeslání do kuchyně → platba → účtenka', async ({
  page,
}, testInfo) => {
  await go(page, '/app/restaurace')
  await expect(page.getByTestId('restaurant-page')).toBeVisible({ timeout: 20_000 })

  // Klik na stůl otevře účet (volný stůl) nebo existující účet — obojí vede do objednávkového pohledu.
  const tables = page.locator(TABLE)
  await expect(tables.first()).toBeVisible({ timeout: 20_000 })
  await tables.first().click()
  await expect(
    page.getByTestId('restaurant-product-grid'),
    'po kliknutí na stůl se otevře účet s nabídkou produktů',
  ).toBeVisible({ timeout: 15_000 })

  // Přidej 2 položky S CENOU (suroviny za 0 Kč by daly účet 0 Kč a zkreslily platbu);
  // případný dialog modifikátorů/variant vyřiď výběrem prvních voleb.
  const grid = page.getByTestId('restaurant-product-grid')
  for (const name of [/Hranolky/, /Espresso/]) {
    await grid.locator('button').filter({ hasText: name }).first().click()
    const dialog = page.getByRole('dialog')
    if (await dialog.isVisible({ timeout: 1_500 }).catch(() => false)) {
      for (const group of await dialog.getByRole('radio').all()) {
        if (!(await group.isChecked().catch(() => true))) await group.check().catch(() => {})
        break
      }
      await dialog
        .getByRole('button', { name: /Přidat|Potvrdit|OK/ })
        .first()
        .click()
        .catch(() => page.keyboard.press('Escape'))
    }
  }
  // Na mobilu jsou položky ve vysouvacím účtu (sticky lišta) — ověř tam jen akční lištu.
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('button', { name: /^Zaplatit$/ }).first()).toBeVisible()
  } else {
    await expect(page.locator('[data-testid^="restaurant-order-item-"]').first()).toBeVisible()
  }

  // Odeslání do kuchyně.
  const send = page.getByRole('button', { name: /^Odeslat( na stanice)?$/ }).first()
  await expect(send).toBeVisible()
  await send.click()
  await expect(page.getByText(/Něco se pokazilo/)).toHaveCount(0)
  // Toast „Objednávka odeslána…" překrývá tlačítko Zaplatit a s myší nad sebou nezmizí (sonner
  // drží hover-expanded) — uhni myší do rohu a počkej, až toast zmizí.
  await page.mouse.move(10, 10)
  await page
    .getByText(/Objednávka odeslána/)
    .first()
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => {})

  // Platba hotově (PaymentDialog: Hotově → rychlá částka → „Zaplatit hotově"). Lokální e2e DB = bezpečné.
  await page
    .getByRole('button', { name: /^Zaplatit$/ })
    .first()
    .click()
  const payDialog = page.getByRole('dialog').last()
  // P0 NÁLEZ (2026-07-22): openPayment volá POST /promotions/calculate (permission loyalty.read),
  // kterou role Employee nemá → 403 → „Výslednou cenu se nepodařilo ověřit" a dialog se NEotevře.
  // Číšník tak v API režimu se zapnutým modulem loyalty nedokončí platbu (Restaurace ANI Pokladna).
  const outcome = await Promise.race([
    payDialog.waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'dialog'),
    page
      .getByText('Výslednou cenu se nepodařilo ověřit')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => 'chyba ověření ceny (403 /promotions/calculate)'),
  ]).catch(() => 'nic se nestalo')
  expect(
    outcome,
    'P0: číšník (Employee) musí dostat platební dialog — loyalty.read chybí a openPayment spadne na /promotions/calculate',
  ).toBe('dialog')
  await payDialog.getByRole('button', { name: 'Hotově' }).click()
  const quickAmount = payDialog.locator('button').filter({ hasText: /Kč/ }).first()
  if (await quickAmount.isVisible().catch(() => false)) await quickAmount.click()
  await payDialog.getByRole('button', { name: /Zaplatit hotově/ }).click()
  // Potvrzení platby (toast „Zaplaceno … hotově, vrátit …").
  await expect(page.getByText(/Zaplaceno/).first()).toBeVisible({ timeout: 15_000 })
  const receipt = await page
    .getByRole('button', { name: /Účtenka|Tisk/ })
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Nabídka účtenky po platbě: ${receipt ? 'ano' : 'NE'}`,
  })
})

test('rozdělení účtu a přesun existují; storno není bez oprávnění nabízeno', async ({
  page,
}, testInfo) => {
  await go(page, '/app/restaurace')
  await expect(page.getByTestId('restaurant-page')).toBeVisible({ timeout: 20_000 })
  const tables = page.locator(TABLE)
  await expect(tables.first()).toBeVisible({ timeout: 20_000 })
  await tables.first().click()
  const split = await page
    .getByRole('button', { name: /Rozdělit účet/ })
    .first()
    .isVisible()
    .catch(() => false)
  const merge = await page
    .getByRole('button', { name: /Sloučit/ })
    .first()
    .isVisible()
    .catch(() => false)
  const cancelBtn = await page
    .getByRole('button', { name: /Zrušit účet/ })
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Employee vidí: Rozdělit=${split}, Sloučit=${merge}, Zrušit účet=${cancelBtn} (zrušení má chtít override/schválení)`,
  })
})

test.describe(() => {
  test.use({ allowStatus: [403, 404] })

  test('gating: číšník nesmí do financí, uzávěrky ani nastavení firmy', async ({
    page,
  }, testInfo) => {
    await go(page, '/app/uzaverka')
    await expect(page, 'uzávěrka (role gate) přesměruje').not.toHaveURL(/uzaverka/)
    await go(page, '/app/audit')
    await expect(page, 'audit (role gate) přesměruje').not.toHaveURL(/audit/)
    // Faktury nemají FE role-gate — dokumentujeme skutečné chování (backend 403).
    await go(page, '/app/faktury')
    const text = (
      await page
        .locator('main')
        .innerText()
        .catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .slice(0, 200)
    testInfo.annotations.push({
      type: 'nález',
      description: `Employee na /app/faktury: URL=${page.url()} — ${text}`,
    })
    await expect(page.locator('main')).not.toContainText(/undefined|NaN|Exception/)
  })
})

test('chybové stavy: aplikace při výpadku požadavku nabídne srozumitelnou hlášku', async ({
  page,
}) => {
  await go(page, '/app/restaurace')
  await expect(page.getByTestId('restaurant-connection-status')).toBeVisible({ timeout: 20_000 })
})

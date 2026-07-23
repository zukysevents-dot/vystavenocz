import { test, expect, go, visibleNavLabels } from './fixtures'
import { authFile } from './personas'

// PERSONA 7 — Účetní (role Accountant: faktury/DPH/exporty + catalog.cost_view; BEZ provozu a uzávěrky).
// Scénář: rychle zkontrolovat doklady, DPH, platby, pohledávky a exporty.
// Bezpečnostní omezení: nic nevystavujeme ani neodesíláme; exporty jen čteme/stahujeme (read-only).

test.use({ storageState: authFile('ucetni') })

test('faktury: seznam, filtry, po splatnosti', async ({ page }) => {
  await go(page, '/app/faktury')
  await expect(page.getByRole('heading', { name: /Faktury/ }).first()).toBeVisible()
  await expect(page.locator('main')).toContainText(/Kč/)
  const overdue = await page
    .getByText(/po splatnosti/i)
    .first()
    .isVisible()
    .catch(() => false)
  test
    .info()
    .annotations.push({
      type: 'nález',
      description: `Štítek/filtr „po splatnosti": ${overdue ? 'ano' : 'NE'}`,
    })
  // Prázdný výsledek filtru musí mít srozumitelný prázdný stav (ne prázdnou tabulku bez vysvětlení).
  const search = page.getByPlaceholder(/Hledat|Vyhledat/i).first()
  if (await search.isVisible().catch(() => false)) {
    await search.fill('xxx-neexistujici-doklad-xxx')
    await page.waitForTimeout(800)
    await expect(page.locator('main')).toContainText(/Žádné|Nenalezen|nenašli|Zatím/i)
  }
})

test('druhy dokladů: zálohové faktury a dobropisy (dokumentace stavu)', async ({
  page,
}, testInfo) => {
  await go(page, '/app/faktury')
  const text = await page.locator('main').innerText()
  const zaloha = /zálohov/i.test(text)
  const dobropis = /dobropis/i.test(text)
  testInfo.annotations.push({
    type: 'nález',
    description: `Na /app/faktury viditelné: zálohové faktury=${zaloha}, dobropisy=${dobropis}`,
  })
})

test('DPH a cashflow', async ({ page }) => {
  await go(page, '/app/dph')
  await expect(page.getByRole('heading', { name: /DPH/ }).first()).toBeVisible()
  await expect(page.locator('main')).toContainText(/Kč|%/)
  await go(page, '/app/cashflow')
  await expect(page.getByRole('heading', { name: /Pohledávky a peníze/ }).first()).toBeVisible()
  // Upomínky: release check 2026-07 říká, že automatické upomínky NEexistují — UI je nesmí slibovat.
  const upominky = await page
    .getByText(/automatick.*upomín/i)
    .first()
    .isVisible()
    .catch(() => false)
  expect.soft(upominky, 'UI neslibuje automatické upomínky (pravdivost)').toBe(false)
})

test('účetní exporty: cíle, formáty a reálné stažení', async ({ page }, testInfo) => {
  await go(page, '/app/uctarna')
  await expect(page.getByRole('heading', { name: /účetní|Účtárna/i }).first()).toBeVisible()
  const text = await page.locator('main').innerText()
  testInfo.annotations.push({
    type: 'nález',
    description: `Exportní cíle na stránce: Pohoda=${/Pohoda/i.test(text)}, ISDOC=${/ISDOC/i.test(text)}, CSV=${/CSV/i.test(text)}, Money=${/Money/i.test(text)}`,
  })
  const download = page.getByRole('button', { name: /Stáhnout|Export/i }).first()
  test.skip(
    !(await download.isVisible().catch(() => false)),
    'Tlačítko exportu nenalezeno — nález do reportu.',
  )
  const dl = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null)
  await download.click()
  const file = await dl
  testInfo.annotations.push({
    type: 'nález',
    description: file
      ? `Export stažen: ${file.suggestedFilename()}`
      : 'Kliknutí na export nespustilo stažení souboru',
  })
})

test.describe(() => {
  // Dashboard pro účetní volá /locations (403 — Accountant nemá company.read) → dokumentovaný nález.
  test.use({ allowStatus: [403] })
  test('menu účetní: finance ano, provoz/sklad ne', async ({ page }) => {
    await go(page, '/app')
    const labels = await visibleNavLabels(page)
    const joined = labels.join('|')
    expect(joined).toContain('Faktury')
    expect(joined).toContain('Přehled DPH')
    for (const forbidden of [
      'Stav skladu',
      'Příjemky',
      'Denní uzávěrka',
      'Směny',
      'Nastavení stolů',
      'Schvalování',
    ]) {
      expect.soft(joined, `menu účetní bez „${forbidden}"`).not.toContain(forbidden)
    }
  })
})

test.describe(() => {
  test.use({ allowStatus: [403, 404] })

  test('gating: uzávěrka a schvalování účetní přesměrují; pokladna = dokumentovat', async ({
    page,
  }, testInfo) => {
    await go(page, '/app/uzaverka')
    await expect(page, 'uzávěrka jen Owner/Admin/Manager').not.toHaveURL(/uzaverka/)
    await go(page, '/app/schvalovani')
    await expect(page, 'schvalování jen Owner/Admin/Manager').not.toHaveURL(/schvalovani/)
    await go(page, '/app/smeny')
    await expect(page, 'plán směn jen Owner/Admin/Manager').not.toHaveURL(/smeny/)
    // Pokladna nemá FE role-gate; účetní nemá pos.operate → dokumentujeme, jak se UI zachová.
    await go(page, '/app/pokladna')
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
      description: `Účetní na /app/pokladna: URL=${page.url()} — ${text}`,
    })
    await expect(page.locator('main')).not.toContainText(/undefined|NaN|Exception/)
  })
})

test('chybové a prázdné stavy: CRM/klienti bez pádu', async ({ page }) => {
  await go(page, '/app/klienti')
  await expect(page.getByRole('heading', { name: /Klienti/ }).first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/Něco se pokazilo|undefined/)
})

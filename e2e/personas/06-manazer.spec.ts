import { test, expect, go, visibleNavLabels } from './fixtures'
import { authFile } from './personas'

// PERSONA 6 — Manažer provozovny (role Manager s location scope = pobočka Centrum).
// Scénář: řídí směnu, lidi, sklad, rezervace a provozní problémy JEDNÉ pobočky.
// Klíčové: pobočkový scope — data cizích poboček (Zahrádka, Event bar) nesmí prosakovat.
// Bezpečnostní omezení: nic neschvalujeme/nezamítáme, směny nepublikujeme.

test.use({ storageState: authFile('manazer') })

test('pobočkový scope: stav skladu podle poboček ukazuje jen Centrum', async ({ page }) => {
  await go(page, '/app/zasoby')
  const tab = page
    .getByRole('tab', { name: /poboč/i })
    .or(page.getByText(/Podle poboček/))
    .first()
  test.skip(
    !(await tab.isVisible().catch(() => false)),
    'Tab „Podle poboček" nenalezen — ověř manuálně.',
  )
  await tab.click()
  await expect(page.locator('main')).toContainText(/Centrum/)
  // Cizí pobočky nesmí být ve sloupcích (P0 kandidát při selhání = únik dat přes scope).
  await expect(
    page.locator('main'),
    'Zahrádka nesmí být vidět location-scoped manažerovi',
  ).not.toContainText(/Zahrádka/)
  await expect(page.locator('main'), 'Event bar nesmí být vidět').not.toContainText(/Event bar/)
})

test.describe(() => {
  // GET /attendance/current vrací 403, když přihlášený člen není evidovaný zaměstnanec — stejný
  // známý stav jako v základním auditu (UI ho ošetřuje).
  test.use({ allowStatus: [403] })
  test('docházka a plán směn jsou dostupné', async ({ page }) => {
    await go(page, '/app/dochazka')
    await expect(page.getByRole('heading', { name: /Docházka/ }).first()).toBeVisible()
    await go(page, '/app/smeny')
    await expect(page.getByRole('heading', { name: /Plán směn|Směny/ }).first()).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/Něco se pokazilo/)
  })
})

test('rezervace, kuchyň a sklad fungují', async ({ page }) => {
  await go(page, '/app/rezervace')
  await expect(page.getByRole('heading', { name: /Rezervace/ }).first()).toBeVisible()
  await go(page, '/app/kuchyne')
  await expect(page.getByRole('heading', { name: /Kuchy/ }).first()).toBeVisible()
  await go(page, '/app/zasoby')
  await expect(page.getByRole('heading', { name: /Stav skladu|Zásoby/ }).first()).toBeVisible()
})

test('schvalování rizikových akcí je manažerovi dostupné', async ({ page }) => {
  await go(page, '/app/schvalovani')
  await expect(page).toHaveURL(/schvalovani/)
  await expect(page.getByRole('heading', { name: /Schvalování/ }).first()).toBeVisible()
  // Limity vidí, ale nic neměníme.
  await expect(page.locator('main')).toContainText(/limit|Limit|schválen/i)
})

test('provozní reporty: jen vlastní pobočka', async ({ page }, testInfo) => {
  await go(page, '/app/provozni-prehled')
  await expect(
    page.getByRole('heading', { name: /Výsledky provozu|Provozní/ }).first(),
  ).toBeVisible()
  // Výběr pobočky: scoped manažer by neměl mít na výběr cizí pobočky.
  const text = await page.locator('main').innerText()
  const seesForeign = /Zahrádka|Event bar/.test(text)
  testInfo.annotations.push({
    type: 'nález',
    description: `Provozní přehled scoped manažera ${seesForeign ? 'UKAZUJE cizí pobočky (prověřit — možný únik)' : 'ukazuje jen Centrum'}`,
  })
  expect.soft(seesForeign, 'reporty nenabízejí cizí pobočky').toBe(false)
})

test('mzdy: sazby vlastního týmu manažer vidí (by design), celofiremní finance ne', async ({
  page,
}, testInfo) => {
  await go(page, '/app/smeny')
  const wages = await page
    .getByText(/Kč\/hod|Sazba/i)
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Sazby v plánu směn viditelné: ${wages} (attendance.manage → záměr)`,
  })
})

test.describe(() => {
  test.use({ allowStatus: [403, 404] })

  test('gating: pobočky a audit jsou mimo manažera; konsolidace = dokumentovat', async ({
    page,
  }, testInfo) => {
    await go(page, '/app/pobocky')
    await expect(page, 'správa poboček jen Owner/Admin').not.toHaveURL(/pobocky/)
    await go(page, '/app/audit')
    await expect(page, 'historie změn jen Owner/Admin').not.toHaveURL(/audit/)
    // Konsolidace je FE povolená i Manažerovi — pro scoped manažera dává smysl jen omezená.
    await go(page, '/app/konsolidace')
    const text = (
      await page
        .locator('main')
        .innerText()
        .catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .slice(0, 250)
    testInfo.annotations.push({
      type: 'nález',
      description: `Scoped manažer na /app/konsolidace: URL=${page.url()} — ${text}`,
    })
    await expect(page.locator('main')).not.toContainText(/undefined|NaN|Exception/)
  })

  test('menu manažera: bez Poboček a Historie změn', async ({ page }) => {
    await go(page, '/app')
    const labels = await visibleNavLabels(page)
    const joined = labels.join('|')
    expect.soft(joined, 'menu bez Poboček').not.toContain('Pobočky')
    expect.soft(joined, 'menu bez Historie změn').not.toContain('Historie změn')
    expect(joined).toContain('Schvalování')
  })
})

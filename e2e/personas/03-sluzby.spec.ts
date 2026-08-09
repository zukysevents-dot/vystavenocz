import { test, expect, go } from './fixtures'
import { authFile } from './personas'

// PERSONA 3 — Kadeřnice/kosmetička/poskytovatel služeb (role Manager, moduly booking + jobs + invoicing).
// Scénář: klienti, rezervace, služby, termíny, doklad za službu, následná péče; použitelnost za provozu.
// Testovací data: demo booking (zdroje, služby, rezervace ze seedu) + vlastní klient/rezervace vytvořené testem.
// Bezpečnostní omezení: nic nemažeme, rezervaci jen vytvoříme; ARES nevoláme (IČO ručně).

test.use({ storageState: authFile('sluzby') })

const STAMP = `E2E-${Date.now().toString(36)}`

test('vytvoření a vyhledání klienta', async ({ page }) => {
  test.skip(
    test.info().project.name === 'mobile',
    'Založení klienta stačí desktop; mobil ověřuje rezervační flow.',
  )
  await go(page, '/app/klienti')
  await page
    .getByRole('button', { name: /Nový klient/ })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.locator('#c-name').fill(`Klientka ${STAMP}`) // ARES nevoláme — jen ruční jméno
  await dialog
    .getByRole('button', { name: /Uložit|Vytvořit|Přidat/ })
    .last()
    .click()
  await expect(page.getByText(`Klientka ${STAMP}`).first()).toBeVisible({ timeout: 15_000 })
  // Vyhledání.
  const search = page.getByPlaceholder(/Hledat|Vyhledat/i).first()
  if (await search.isVisible().catch(() => false)) {
    await search.fill(STAMP)
    await expect(page.getByText(`Klientka ${STAMP}`).first()).toBeVisible()
  }
})

test('katalog služeb a ceník', async ({ page }) => {
  await go(page, '/app/rezervace')
  const sluzbyTab = page
    .getByRole('tab', { name: /Služby/ })
    .or(page.getByText('Služby', { exact: true }))
    .first()
  if (await sluzbyTab.isVisible().catch(() => false)) {
    await sluzbyTab.click()
    await expect(page.getByRole('button', { name: /Nová služba/ })).toBeVisible()
  }
  await go(page, '/app/cenik-sluzeb')
  await expect(page.getByRole('heading', { name: /Ceník služeb/ }).first()).toBeVisible()
  await expect(page.locator('main')).toContainText(/Kč/)
})

test.describe(() => {
  // Kolize termínu s existující demo rezervací je platný stav (409 + česká hláška) — dokumentujeme.
  test.use({ allowStatus: [409] })
  test('rezervace: dostupnost, vytvoření, stav', async ({ page }) => {
    await go(page, '/app/rezervace')
    await expect(page.getByRole('heading', { name: /Rezervace/ }).first()).toBeVisible()
    const newBtn = page.getByRole('button', { name: /Nová rezervace/ }).first()
    await expect(newBtn).toBeVisible()
    const disabled = await newBtn.isDisabled()
    test.skip(disabled, 'Nová rezervace je disabled (chybí služby/zdroje?) — nález do reportu.')
    await newBtn.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('#r-name').fill(`Rezervace ${STAMP}`)
    // Služba a zdroj — vybereme první dostupné (demo seed je má).
    for (const trigger of await dialog.getByRole('combobox').all()) {
      const text = await trigger.innerText().catch(() => '')
      if (/Vyberte|—|^$/.test(text)) {
        await trigger.click()
        const opt = page.getByRole('option').first()
        if (await opt.isVisible({ timeout: 2_000 }).catch(() => false)) await opt.click()
        else await page.keyboard.press('Escape')
      }
    }
    const submit = dialog.getByRole('button', { name: /Vytvořit|Rezervovat|Uložit/ }).first()
    await submit.click({ timeout: 10_000 }).catch(() => {})
    // Vytvoření musí buď projít, nebo srozumitelně říct česky, co chybí — ne mlčet.
    const ok = await page
      .getByText(`Rezervace ${STAMP}`)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false)
    if (!ok) {
      const err = await page
        .locator('[data-sonner-toast], [role="alert"], .text-destructive')
        .last()
        .innerText()
        .catch(() => '')
      expect(
        err.trim().length,
        `rezervace neprošla a formulář nevysvětlil proč (text: „${err.trim()}")`,
      ).toBeGreaterThan(3)
    }
  })
})

test('historie klienta a CRM', async ({ page }) => {
  await go(page, '/app/crm')
  await expect(page.getByRole('heading', { name: /CRM/ }).first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/Něco se pokazilo/)
})

test('doklad za službu: editor faktury funguje i pro Manažerku', async ({ page }) => {
  test.skip(
    test.info().project.name === 'mobile',
    'Editor dokladu = desktop; mobil pokrývá rezervace.',
  )
  await go(page, '/app/faktury/editor')
  await page.getByText('Vyberte klienta…').first().click()
  await page.getByRole('option').first().click()
  await page.getByPlaceholder('Popis položky').first().fill(`Střih a foukaná ${STAMP}`)
  await page.getByRole('button', { name: /Uložit koncept/ }).click()
  await expect(page.getByText('Koncept uložen.').first()).toBeVisible({ timeout: 15_000 })
})

test('mobilní použitelnost: rezervace přes hamburger menu', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Jen mobilní viewport.')
  await go(page, '/app')
  await page.getByRole('button', { name: 'Otevřít menu' }).click()
  await page
    .getByRole('link', { name: /Rezervace/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: /Rezervace/ }).first()).toBeVisible()
  // Kalendář/seznam se vejde do viewportu bez horizontálního scrollu.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect.soft(overflow, 'stránka bez horizontálního přetečení na mobilu').toBeLessThanOrEqual(2)
})

test('další krok je vysvětlen (průvodce)', async ({ page }) => {
  await go(page, '/app/pruvodce')
  await expect(page.getByRole('heading', { name: /Průvodce/ }).first()).toBeVisible()
  await expect(page.locator('main')).toContainText(/krok|začn|nastav/i)
})

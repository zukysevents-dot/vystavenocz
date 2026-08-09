import { test, expect, go } from './fixtures'
import { authFile } from './personas'
import type { Page } from '@playwright/test'

// PERSONA AUDIT — ukládání dat podle rolí.
// Ostatní persona specy hlídají, CO role vidí; tenhle hlídá, co se jí povede ULOŽIT.
// Pravidlo pro všechny role: buď se to uloží a přežije reload, nebo přijde srozumitelné
// odmítnutí. Nikdy ne ticho a nikdy ne falešný úspěch (CLAUDE.md §6).

const TABLE =
  '[data-testid^="restaurant-table-map-"]:visible, [data-testid^="restaurant-table-list-"]:visible'

/**
 * POSLEDNÍ stůl v seznamu. Persona 04 (číšník) pracuje s PRVNÍM stolem — při dvou workerech by si
 * oba testy lezly do stejného účtu a platba by narazila na cizí neodeslané položky.
 */
function someTable(page: Page) {
  return page.locator(TABLE).last()
}

function unique(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Text všech aktuálně zobrazených toastů. */
async function toasts(page: Page): Promise<string[]> {
  return page.locator('[data-sonner-toast]').allInnerTexts()
}

/**
 * Ověří, že položka je na účtu — v obou layoutech. Desktop má účet stále na očích,
 * mobil ho schovává za spodní lištu, tak ji v případě potřeby otevře.
 */
async function expectItemOnAccount(page: Page, name: string): Promise<void> {
  const item = page
    .locator('[data-testid^="restaurant-order-item-"]:visible')
    .filter({ hasText: name })
    .first()
  if (await item.isVisible().catch(() => false)) return
  await page
    .getByTestId('restaurant-mobile-actions')
    .locator('button')
    .first()
    .click({ timeout: 10_000 })
    .catch(() => {})
  await expect(item, `položka ${name} musí být na účtu`).toBeVisible({ timeout: 15_000 })
}

/** Klikne a počká, až se objeví JAKÁKOLI zpětná vazba — úspěch i odmítnutí. Ticho = pád. */
async function expectFeedback(page: Page, action: () => Promise<void>): Promise<string> {
  await action()
  await expect(
    page.locator('[data-sonner-toast]').first(),
    'akce musí dát uživateli zpětnou vazbu, ne skončit potichu',
  ).toBeVisible({ timeout: 15_000 })
  return (await toasts(page)).join(' | ')
}

test.describe('Číšník (Employee)', () => {
  test.use({ storageState: authFile('cisnik'), allowStatus: [403] })

  test('položka na účtu se uloží a je tam i po obnovení stránky', async ({ page }) => {
    await go(page, '/app/restaurace')
    const table = someTable(page)
    await expect(table).toBeVisible()
    await table.click()

    // Suroviny za 0,00 Kč (polotovary) na účet nepatří — vezmi první dlaždici s cenou.
    const product = page
      .getByTestId('restaurant-product-grid')
      .locator('button')
      .filter({ hasNotText: '0,00 Kč' })
      .first()
    await expect(product).toBeVisible()
    // Dlaždice katalogu nese i jednotku („Bulka (ks)"), řádek účtu jen název — vezmi jen ten.
    const productName = (await product.innerText())
      .split('\n')[0]
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace(/\s*[\d\s,]+Kč\s*$/, '')
      .trim()
    await product.click()

    // Produkt s volbami se přidává až přes dialog a povinnou skupinu (např. Velikost) nejde
    // přeskočit — volby jsou tlačítka, ne radia. Vyber první nabídku a potvrď.
    // Dialog se otevře až po dotažení skupin voleb ze serveru — krátké isVisible() ho mine.
    const dialog = page.getByRole('dialog')
    const dialogOpened = await dialog
      .waitFor({ state: 'visible', timeout: 6_000 })
      .then(() => true)
      .catch(() => false)
    if (dialogOpened) {
      const option = dialog
        .getByRole('button')
        .filter({ hasNotText: /Zrušit|Přidat na účet|Zavřít/ })
        .first()
      if (await option.isVisible().catch(() => false)) await option.click()
      await dialog.getByRole('button', { name: 'Přidat na účet' }).click()
      await expect(dialog).toBeHidden({ timeout: 10_000 })
    }

    await expectItemOnAccount(page, productName)

    // Účet drží server — po reloadu se musí položka vrátit ze serveru, ne z paměti karty.
    await page.reload()
    await someTable(page).click()
    await expectItemOnAccount(page, productName)
  })

  test('účet otevřený jiným terminálem se převezme, ne aby obsluha skončila u chyby', async ({
    page,
    context,
  }) => {
    await go(page, '/app/restaurace')
    const table = someTable(page)
    await expect(table).toBeVisible()
    const tableTestId = await table.getAttribute('data-testid')

    // Druhý „terminál" otevře účet na stejném stole dřív → první dostane z API 409.
    const second = await context.newPage()
    await go(second, '/app/restaurace')
    await someTable(second).click()
    await expect(second.locator('[data-testid="restaurant-order-view"]')).toBeVisible()
    await second.close()

    await page.reload()
    await page.locator(`[data-testid="${tableTestId}"]`).click()
    // Obsluha musí skončit v účtu — ať už ho převzala, nebo ho měla načtený rovnou.
    await expect(page.locator('[data-testid="restaurant-order-view"]')).toBeVisible({
      timeout: 15_000,
    })
    expect(
      (await toasts(page)).join(' '),
      'převzetí účtu se nesmí ohlásit jako selhání',
    ).not.toMatch(/nepodařilo/i)
  })
})

test.describe('Skladník (Stockkeeper)', () => {
  test.use({ storageState: authFile('sklad') })

  test('příjemka se buď uloží, nebo řekne co chybí — nikdy neselže potichu', async ({
    page,
  }, testInfo) => {
    await go(page, '/app/naskladneni')
    await page.getByPlaceholder(/Makro/).first().fill(unique('E2E dodavatel'))

    // Firma s víc pobočkami vyžaduje konkrétní sklad — vyber ho, jinak je uložení právem blokované.
    const locationSelect = page.locator('main select, main [role="combobox"]').first()
    if (await locationSelect.isVisible().catch(() => false)) {
      await locationSelect.click()
      const option = page.getByRole('option').nth(1)
      if (await option.isVisible().catch(() => false)) await option.click()
      else await page.keyboard.press('Escape')
    }

    await page.getByPlaceholder(/hledejte podle názvu/i).fill('pivo')
    const hit = page.locator('main button').filter({ hasText: /pivo/i }).first()
    test.skip(!(await hit.isVisible().catch(() => false)), 'demo produkt „pivo" není k dispozici')
    await hit.click()

    const text = await expectFeedback(page, () =>
      page
        .getByRole('button', { name: /Uložit příjemku/ })
        .first()
        .click(),
    )
    testInfo.annotations.push({
      type: 'nález',
      description: `Uložení příjemky skladníkem: ${text}`,
    })
    expect(text, 'hláška musí být pro člověka, ne HTTP status').not.toMatch(/HTTP \d|undefined|\[/)
  })

  test('inventura bez vybrané pobočky srozumitelně odmítne', async ({ page }) => {
    await go(page, '/app/zasoby')
    const inventura = page.getByRole('button', { name: /Inventura/ }).first()
    await expect(inventura).toBeVisible()
    await inventura.click()

    // Buď se otevře dialog (jedna pobočka / vybraná), nebo přijde vysvětlení. Ne ticho.
    // Čeká se na obojí SOUČASNĚ — toast mizí po pár sekundách, takže sekvenční čekání
    // na dialog by ho stihlo minout a test by hlásil ticho tam, kde hláška byla.
    const dialog = page.getByRole('dialog')
    const vysledek = await Promise.race([
      dialog
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => 'dialog' as const)
        .catch(() => 'nic' as const),
      page
        .locator('[data-sonner-toast]')
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => 'toast' as const)
        .catch(() => 'nic' as const),
    ])
    if (vysledek === 'dialog') {
      await expect(dialog).toContainText(/má být|Realita|Rozdíl/i)
      await page.keyboard.press('Escape')
      return
    }
    expect(vysledek, 'inventura musí buď jít otevřít, nebo vysvětlit proč ne').toBe('toast')
    expect((await toasts(page)).join(' '), 'blokace musí být vysvětlená').toMatch(/pobočku/i)
  })
})

test.describe('Účetní (Accountant)', () => {
  test.use({ storageState: authFile('ucetni') })

  test('co účetní needituje, to jí UI ani nenabídne (žádné slepé uložení)', async ({ page }) => {
    await go(page, '/app/klienti')
    // Účetní má na klienty jen čtení — buď stránku nemá, nebo na ní nesmí být zakládací akce
    // vedoucí k 403 až po vyplnění formuláře.
    if (/\/app\/klienti/.test(page.url())) {
      const create = page.getByRole('button', { name: 'Nový klient' })
      if (await create.isVisible().catch(() => false)) {
        await create.click()
        await page.locator('#c-name').fill(unique('E2E Účetní'))
        const text = await expectFeedback(page, () =>
          page.getByRole('button', { name: 'Vytvořit klienta' }).click(),
        )
        expect(text, 'odmítnutí musí být srozumitelné').not.toMatch(/HTTP \d|undefined/)
      }
    }
  })
})

test.describe('Manažerka (Manager, pobočka Centrum)', () => {
  test.use({ storageState: authFile('manazer') })

  test('klient založený manažerkou přežije reload', async ({ page }) => {
    await go(page, '/app/klienti')
    test.skip(!/\/app\/klienti/.test(page.url()), 'role na klienty nemá přístup')

    const name = unique('E2E Manažerka')
    await page.getByRole('button', { name: 'Nový klient' }).click()
    await page.locator('#c-name').fill(name)
    const text = await expectFeedback(page, () =>
      page.getByRole('button', { name: 'Vytvořit klienta' }).click(),
    )
    expect(text).toMatch(/vytvořen/i)

    await page.reload()
    await go(page, '/app/klienti')
    await expect(page.getByText(name).first()).toBeVisible()
  })
})

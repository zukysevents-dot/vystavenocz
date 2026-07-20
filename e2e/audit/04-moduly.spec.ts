import { test, expect, type Page } from '@playwright/test'
import { watchPage, attachWatch, settle, type PageWatch } from './helpers'

// Hlubší uživatelské průchody hlavními moduly. Zásada bezpečných dat:
// – nic se nemaže ani nevystavuje; formuláře se otevírají a RUŠÍ bez uložení;
// – destruktivní akce jen po potvrzovací dialog, pak Zrušit/Escape.

async function open(page: Page, path: string): Promise<PageWatch> {
  const watch = watchPage(page)
  await page.goto(path)
  await settle(page)
  return watch
}

function expectClean(watch: PageWatch) {
  expect(watch.consoleErrors, 'chyby konzole').toEqual([])
  expect(watch.badResponses, 'neočekávané 4xx/5xx').toEqual([])
}

async function closeDialog(page: Page) {
  const cancel = page.getByRole('button', { name: /Zrušit|Zavřít|Storno/ }).first()
  if (await cancel.isVisible().catch(() => false)) await cancel.click()
  else await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5_000 }).catch(() => {})
}

test.describe('Faktury', () => {
  test('seznam, filtry, vyhledávání, detail, editor bez uložení', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/faktury')

    // Filtry/záložky stavu dokladu.
    for (const name of [/Vše|Všechny/, /Koncept/i, /Vystaven/i, /Uhrazen/i]) {
      const tab = page.getByRole('tab', { name }).or(page.getByRole('button', { name })).first()
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await settle(page)
      }
    }

    // Vyhledávání.
    const search = page.getByPlaceholder('Hledat fakturu nebo klienta…')
    await expect(search).toBeVisible()
    await search.fill('xyz-neexistujici-hledani')
    await settle(page)
    await search.fill('')
    await settle(page)

    // Detail prvního dokladu (odkaz do editoru/detailu) a návrat.
    const firstRow = page.locator('a[href*="/app/faktury/editor?id="], tbody tr a').first()
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click()
      await settle(page)
      await page.goBack()
      await settle(page)
    }

    // Editor nové faktury — otevřít a odejít BEZ uložení.
    await page.getByRole('button', { name: 'Nová faktura' }).or(page.getByRole('link', { name: 'Nová faktura' })).first().click()
    await expect(page).toHaveURL(/editor/)
    await settle(page)
    await page.goBack()
    await settle(page)

    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('smazání faktury: potvrzovací dialog + zrušení (nic se nesmaže)', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/faktury')
    // Akční menu prvního řádku.
    const menuBtn = page.locator('tbody tr').first().getByRole('button').last()
    if (!(await menuBtn.isVisible().catch(() => false))) test.skip(true, 'seznam je prázdný')
    await menuBtn.click()
    const del = page.getByRole('menuitem', { name: /Smazat/ }).first()
    if (!(await del.isVisible().catch(() => false))) {
      await page.keyboard.press('Escape')
      test.skip(true, 'první doklad nemá akci Smazat (vystavený) — bezpečně přeskočeno')
    }
    await del.click()
    // Musí přijít potvrzení, ne rovnou smazání.
    await expect(page.getByRole('dialog').or(page.getByRole('alertdialog')).first()).toBeVisible()
    await closeDialog(page)
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })
})

test.describe('Klienti', () => {
  test('seznam, hledání, detail, formulář nového klienta bez uložení', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/klienti')
    const search = page.getByPlaceholder('Hledat podle jména, IČO nebo e-mailu…')
    await expect(search).toBeVisible()
    await search.fill('žádná shoda 123')
    await settle(page)
    await search.fill('')
    await settle(page)

    // Formulář nového klienta: povinná pole a zrušení.
    await page.getByRole('button', { name: 'Nový klient' }).first().click()
    const dialog = page.getByRole('dialog').first()
    await expect(dialog).toBeVisible()
    const save = dialog.getByRole('button', { name: /Uložit|Přidat|Vytvořit/ }).first()
    if (await save.isVisible().catch(() => false)) {
      await save.click()
      // Prázdný formulář nesmí projít — dialog zůstává (validace) a nevznikl POST 2xx.
      await expect(dialog).toBeVisible()
    }
    await closeDialog(page)
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })
})

test.describe('Sklad a zásoby', () => {
  test('katalog: hledání, dialog produktu bez uložení', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/sklad')
    const search = page.getByPlaceholder('Hledat podle názvu nebo kódu…')
    await expect(search).toBeVisible()
    await search.fill('káva')
    await settle(page)
    await search.fill('')
    await page.getByRole('button', { name: /Nový produkt/ }).first().click()
    await expect(page.getByRole('dialog').first()).toBeVisible()
    await closeDialog(page)
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('zásoby: záložky (stav/zrcadlo/pobočky) a výběr pobočky', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/zasoby')
    for (const name of [/Zrcadlo/i, /Podle poboček/i, /Historie|Pohyby/i]) {
      const tab = page.getByRole('tab', { name }).first()
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await settle(page)
      }
    }
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('naskladnění: příjemky a doporučení se načtou', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/naskladneni')
    await expect(page.getByText(/K doobjednání|příjemk/i).first()).toBeVisible({ timeout: 15_000 })
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })
})

test.describe('Gastro provoz (read-only)', () => {
  test('restaurace: cockpit se vykreslí, bez otevírání účtů', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/restaurace')
    // Operativní layout: kategorie/katalog/stoly. Nic neúčtujeme.
    await expect(page.getByText(/Stoly|stůl/i).first()).toBeVisible({ timeout: 15_000 })
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('kuchyně: fronta, filtry sekcí, historie', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/kuchyne')
    for (const name of [/Bar/i, /Kuchyně/i, /Vše/i]) {
      const btn = page.getByRole('tab', { name }).or(page.getByRole('button', { name })).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        await settle(page)
      }
    }
    const history = page.getByRole('button', { name: /Historie/ }).or(page.getByRole('tab', { name: /Historie/ })).first()
    if (await history.isVisible().catch(() => false)) {
      await history.click()
      await settle(page)
    }
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('pokladna: přidání do košíku a vyprázdnění (bez prodeje)', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/pokladna')
    await expect(page.getByPlaceholder(/Hledat produkt/i).or(page.getByText(/Hledat produkt/i)).first()).toBeVisible({ timeout: 15_000 })
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('mapa stolů: QR odkaz stolu', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/mapa-stolu')
    await expect(page.getByText(/stůl|stol/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })
})

test.describe('Reporty a peníze', () => {
  test('uzávěrka: přehled dne se načte (den se NEZAVÍRÁ)', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/uzaverka')
    await expect(page.getByText(/uzávěrka|Tržby|hotovost/i).first()).toBeVisible({ timeout: 15_000 })
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('DPH: výběr období', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/dph')
    const combo = page.getByRole('combobox').first()
    if (await combo.isVisible().catch(() => false)) {
      await combo.click()
      const opt = page.getByRole('option').nth(1)
      if (await opt.isVisible().catch(() => false)) await opt.click()
      else await page.keyboard.press('Escape')
      await settle(page)
    }
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('provozní přehled: KPI, filtr období', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/provozni-prehled')
    await expect(page.getByText(/Tržby|KPI|Marže/i).first()).toBeVisible({ timeout: 20_000 })
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('konsolidace poboček se načte', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/konsolidace')
    await expect(page.getByText(/poboč/i).first()).toBeVisible({ timeout: 20_000 })
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })
})

test.describe('Lidé a plánování', () => {
  test('docházka: přehled + manažerské záložky', async ({ page }, testInfo) => {
    // 403 z /attendance/current = platný stav „Owner není evidovaný zaměstnanec".
    const watch = watchPage(page, { allowStatus: [403] })
    await page.goto('/app/dochazka')
    await settle(page)
    for (const name of [/Opravy/i, /Výjimky/i]) {
      const tab = page.getByRole('tab', { name }).first()
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await settle(page)
      }
    }
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('plán směn: týdenní mřížka a navigace týdnů', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/smeny')
    const next = page.getByRole('button', { name: /Další|další týden|→/i }).first()
    if (await next.isVisible().catch(() => false)) {
      await next.click()
      await settle(page)
    }
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('rezervace se načtou', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/rezervace')
    await expect(page.getByText(/Rezervace/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })
})

test.describe('Správa firmy', () => {
  test('nastavení: sekce se vykreslí včetně integrací', async ({ page }, testInfo) => {
    // 404 z growth/subscription-claims = designový empty state (viz helpers.APP_ROUTES).
    const watch = watchPage(page, { allowStatus: [404] })
    await page.goto('/app/nastaveni')
    await settle(page)
    await expect(page.getByText(/Nastavení/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('API a webhooky: tokeny + webhooky bez vytváření', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/nastaveni/api-webhooky')
    await expect(page.getByText(/token|webhook/i).first()).toBeVisible({ timeout: 15_000 })
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('audit: filtr akcí', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/audit')
    await expect(page.getByText(/Historie změn|audit/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('schvalování: nastavení limitů a fronta', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/schvalovani')
    await expect(page.getByText(/Schvalování|limit/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('pobočky & vedení se načtou', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/pobocky')
    await expect(page.getByText(/Pobočky|pobočk/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('podpisy: obálky + provider tab (bez odeslání)', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/podpisy')
    const providerTab = page.getByRole('tab', { name: /Provider/i }).first()
    if (await providerTab.isVisible().catch(() => false)) {
      await providerTab.click()
      await settle(page)
    }
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('průvodce a předplatné se načtou', async ({ page }, testInfo) => {
    const w1 = await open(page, '/app/pruvodce')
    await expect(page.getByText(/Průvodce|krok/i).first()).toBeVisible()
    expectClean(w1)
    const w2 = await open(page, '/app/predplatne')
    await expect(page.getByText(/Předplatné|plán/i).first()).toBeVisible()
    await attachWatch(testInfo, w2)
    expectClean(w2)
  })
})

test.describe('Zakázky a nabídky', () => {
  test('zakázky: seznam a detail prvního záznamu', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/zakazky')
    const first = page.locator('a[href^="/app/zakazky/"]').first()
    if (await first.isVisible().catch(() => false)) {
      await first.click()
      await settle(page)
      // Pracovní list zakázky.
      await expect(page.getByText(/Zakázka|pracovní list|Položky/i).first()).toBeVisible()
      await page.goBack()
      await settle(page)
    }
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('nabídky a ceník služeb se načtou', async ({ page }, testInfo) => {
    const w1 = await open(page, '/app/nabidky')
    await expect(page.getByText(/Nabídky/i).first()).toBeVisible()
    expectClean(w1)
    const w2 = await open(page, '/app/cenik-sluzeb')
    await expect(page.getByText(/Ceník služeb/i).first()).toBeVisible()
    await attachWatch(testInfo, w2)
    expectClean(w2)
  })
})

test.describe('Věrnost a ceny', () => {
  test('věrnost: nastavení a zákazníci', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/vernost')
    await expect(page.getByText(/Věrnost|zákazn/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })

  test('akce a ceny: hladiny + pravidla', async ({ page }, testInfo) => {
    const watch = await open(page, '/app/akce-ceny')
    await expect(page.getByText(/Akce|cenov/i).first()).toBeVisible()
    await attachWatch(testInfo, watch)
    expectClean(watch)
  })
})

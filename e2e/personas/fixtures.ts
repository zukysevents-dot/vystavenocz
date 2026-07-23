import { test as base, expect, type Page } from '@playwright/test'
import { watchPage, attachWatch, settle, dismissCookies, type PageWatch } from '../audit/helpers'

export { expect, settle }

/**
 * Persona fixture: každý test automaticky sbírá chyby konzole, spadlé requesty a 4xx/5xx
 * (povinný výstup auditu) a na konci je přiloží do reportu + soft-assertne, že žádné nejsou.
 * Očekávané statusy (např. testovaný 403 na zakázané routě) povol přes test.use({ allowStatus: [403] }).
 */
interface PersonaFixtures {
  allowStatus: number[]
  watch: PageWatch
}

export const test = base.extend<PersonaFixtures>({
  allowStatus: [[], { option: true }],
  watch: [
    async ({ page, allowStatus }, use, testInfo) => {
      await dismissCookies(page)
      const watch = watchPage(page, { allowStatus })
      await use(watch)
      await attachWatch(testInfo, watch)
      // Povolený status (např. dokumentovaný 403/409) filtruje i aplikační console.error z http.ts
      // („ApiError: …"), jinak by povolený a v UI ošetřený stav stejně shodil test.
      const consoleErrors = allowStatus.length
        ? watch.consoleErrors.filter((e) => !/^(pageerror: )?ApiError:/.test(e))
        : watch.consoleErrors
      expect.soft(consoleErrors, `chyby konzole (${testInfo.title})`).toEqual([])
      expect
        .soft(watch.badResponses, `nečekané 4xx/5xx API odpovědi (${testInfo.title})`)
        .toEqual([])
    },
    { auto: true },
  ],
})

/** Navigace + ustálení sítě (spinnery, první fetch). */
export async function go(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await settle(page)
}

/** Na mobilu otevře off-canvas menu; na desktopu no-op (sidebar je vidět). */
export async function openNav(page: Page): Promise<void> {
  const burger = page.getByRole('button', { name: 'Otevřít menu' })
  if (await burger.isVisible().catch(() => false)) await burger.click()
}

/** Texty položek menu viditelné aktuální personě (desktop sidebar i mobilní drawer). */
export async function visibleNavLabels(page: Page): Promise<string[]> {
  await openNav(page)
  const links = page.locator('aside a[href^="/app"]:visible')
  const labels = (await links.allInnerTexts()).map((t) => t.trim()).filter(Boolean)
  // Mobilní drawer zase zavřít, ať nepřekáží dalším krokům.
  const close = page.getByRole('button', { name: 'Zavřít menu' })
  if (await close.isVisible().catch(() => false)) await close.click()
  return [...new Set(labels)]
}

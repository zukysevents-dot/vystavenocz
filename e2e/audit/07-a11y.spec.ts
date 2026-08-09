import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { APP_ROUTES, settle } from './helpers'

// Axe audit s reálnými daty (API režim) — serious/critical porušení WCAG A/AA.
const BLOCKING = ['serious', 'critical']

async function blockingViolations(page: Page) {
  // Sonner toaster je přechodné knihovní UI (ol s animovanými dětmi) — mimo náš markup, z gate ven.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('[data-sonner-toaster]')
    .exclude('.toaster')
    .analyze()
  return results.violations
    .filter((v) => BLOCKING.includes(v.impact ?? ''))
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }))
}

// Reprezentativní výběr — plný sweep všech rout by běžel dlouho; pokrývá každý typ obrazovky.
const A11Y_ROUTES = APP_ROUTES.filter((r) =>
  [
    '/app',
    '/app/faktury',
    '/app/klienti',
    '/app/pokladna',
    '/app/sklad',
    '/app/zasoby',
    '/app/uzaverka',
    '/app/dochazka',
    '/app/rezervace',
    '/app/nastaveni',
    '/app/pruvodce',
  ].includes(r.path),
)

for (const route of A11Y_ROUTES) {
  test(`axe ${route.path} — bez serious/critical`, async ({ page }) => {
    await page.goto(route.path)
    await settle(page)
    expect(await blockingViolations(page)).toEqual([])
  })
}

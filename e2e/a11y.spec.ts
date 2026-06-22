import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { seedApp } from './helpers/seed'

const BLOCKING = ['serious', 'critical']

// Vrátí jen závažná (serious/critical) porušení WCAG A/AA — to je hlavní váha Lighthouse a11y.
async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  return results.violations
    .filter((v) => BLOCKING.includes(v.impact ?? ''))
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }))
}

// Pozn.: scope na stabilní produktové obrazovky (app + auth). Landing má animovaný AiDemo
// (nedeterministický obsah) → do automatického a11y gate nepatří, řeší se samostatně.
test.describe('a11y (axe) — bez serious/critical porušení', () => {
  test('přihlášení', async ({ page }) => {
    await page.goto('/prihlaseni')
    expect(await blockingViolations(page)).toEqual([])
  })

  test('dashboard', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app')
    expect(await blockingViolations(page)).toEqual([])
  })

  test('seznam faktur', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/faktury')
    expect(await blockingViolations(page)).toEqual([])
  })

  test('editor faktury', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/faktury/editor')
    expect(await blockingViolations(page)).toEqual([])
  })

  test('nastavení', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/nastaveni')
    expect(await blockingViolations(page)).toEqual([])
  })

  test('předplatné', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/predplatne')
    expect(await blockingViolations(page)).toEqual([])
  })
})

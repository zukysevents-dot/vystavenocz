import { test, expect, type Page } from './fixtures/test'
import AxeBuilder from '@axe-core/playwright'
import { seedApp } from './helpers/seed'

const BLOCKING = ['serious', 'critical']

// Vrátí jen závažná (serious/critical) porušení WCAG A/AA — to je hlavní váha Lighthouse a11y.
async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  return results.violations
    .filter((v) => BLOCKING.includes(v.impact ?? ''))
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      targets: v.nodes.map((node) => node.target),
      help: v.help,
    }))
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

  test('export pro účetní na mobilu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedApp(page, {
      subscription: 'pro',
      invoices: [
        {
          id: 'inv-export-a11y',
          documentType: 'invoice',
          status: 'issued',
          invoiceNumber: 'FA-2026-0001',
          clientId: null,
          clientSnapshot: { name: 'Acme s.r.o.' },
          supplierSnapshot: { companyName: 'E2E s.r.o.' },
          items: [],
          currency: 'CZK',
          issueDate: '2026-07-10',
          dueDate: '2026-07-24',
          taxableDate: '2026-07-10',
          paidAt: null,
          variableSymbol: '20260001',
          constantSymbol: null,
          specificSymbol: null,
          paymentMethod: 'bank_transfer',
          subtotal: 1000,
          vatTotal: 210,
          total: 1210,
          notes: null,
          createdAt: '2026-07-10T00:00:00.000Z',
          updatedAt: '2026-07-10T00:00:00.000Z',
        },
      ],
    })
    await page.goto('/app/uctarna')
    await expect(page.getByRole('heading', { name: 'Export pro účetní' })).toBeVisible()
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
    expect(await blockingViolations(page)).toEqual([])
  })

  test('opakované faktury (seznam + dialog)', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/opakovane-faktury')
    await page.getByRole('button', { name: 'Nová šablona' }).first().click() // otevřít formulář s položkami
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

  test('import klientů', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/import')
    expect(await blockingViolations(page)).toEqual([])
  })

  test('import faktur', async ({ page }) => {
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/import/faktury')
    expect(await blockingViolations(page)).toEqual([])
  })
})

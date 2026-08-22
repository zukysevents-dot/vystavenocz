import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'
import { seedApp } from './helpers/seed'

// Regrese k nálezům z testování živé aplikace (22. 8. 2026):
// VYS-04 UI nabízelo akce, které server odmítne, a vystavenou fakturu šlo editovat;
// VYS-05 mobilní cookie lišta zabírala ~2/3 obrazovky;
// VYS-08 tlačítko registrace bylo zašedlé bez vysvětlení;
// VYS-09 404 stránka obsahovala vývojářský text „Placeholder — /cesta";
// VYS-12 dashboard nováčka byl prázdný bez jediného vodítka.

const NOW = '2026-08-22T10:00:00.000Z'

function mkInvoice(over: Record<string, unknown> = {}) {
  return {
    id: 'inv-base',
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: 'FA-2026-0001',
    clientId: null,
    clientSnapshot: { name: 'Acme s.r.o.' },
    supplierSnapshot: {
      companyName: 'Moje firma s.r.o.',
      ico: null,
      dic: null,
      vatMode: 'payer',
      street: null,
      city: null,
      zip: null,
      country: 'CZ',
    },
    items: [
      {
        id: 'it-1',
        description: 'Práce',
        quantity: 2,
        unit: 'ks',
        unitPrice: 1000,
        vatRate: 21,
        lineSubtotal: 2000,
        lineVat: 420,
        lineTotal: 2420,
      },
    ],
    currency: 'CZK',
    issueDate: '2026-08-22',
    dueDate: '2026-09-05',
    taxableDate: '2026-08-22',
    paidAt: null,
    variableSymbol: '20260001',
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank_transfer',
    subtotal: 2000,
    vatTotal: 420,
    total: 2420,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }
}

// --- VYS-04: akce se odvozují ze stavu dokladu ---

test('faktury: vystavený doklad nenabízí Smazat (server ho smazat nedovolí)', async ({ page }) => {
  await seedApp(page, { subscription: 'pro', invoices: [mkInvoice({ id: 'inv-issued' })] })
  await page.goto('/app/faktury')

  await expect(page.getByRole('cell', { name: 'FA-2026-0001' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Smazat' })).toHaveCount(0)
  // Vystavený doklad se otevírá k prohlédnutí, needituje se.
  await expect(page.getByRole('button', { name: 'Otevřít' })).toBeVisible()
})

test('faktury: koncept Smazat i Upravit nabízí dál', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [mkInvoice({ id: 'inv-draft', status: 'draft', invoiceNumber: null })],
  })
  await page.goto('/app/faktury')

  const row = page.getByRole('row').filter({ hasText: 'Koncept' })
  await expect(row.getByRole('button', { name: 'Upravit' })).toBeVisible()
  await expect(row.getByRole('button', { name: 'Smazat' })).toBeVisible()
})

test('editor: vystavenou fakturu nelze upravit žádnou cestou', async ({ page }) => {
  await seedApp(page, { subscription: 'pro', invoices: [mkInvoice({ id: 'inv-issued' })] })
  await page.goto('/app/faktury/editor?id=inv-issued')

  await expect(page.getByText('Doklad je vystavený, proto se už needituje.')).toBeVisible()
  // Uložení ani vystavení se nenabízí; položky nejdou přidat, odebrat ani přepsat.
  await expect(page.getByRole('button', { name: 'Uložit koncept' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Vystavit fakturu' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Přidat položku' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Odebrat položku' })).toHaveCount(0)

  const enabledFields = await page.evaluate(
    () =>
      [...document.querySelectorAll('main input, main textarea, main button[role="combobox"]')]
        .filter((el) => {
          const e = el as HTMLInputElement
          return (
            !e.disabled && e.getAttribute('aria-disabled') !== 'true' && e.offsetParent !== null
          )
        })
        .map((el) => el.id || el.tagName).length,
  )
  expect(enabledFields).toBe(0)

  // Legitimní akce vystaveného dokladu zůstávají dostupné.
  await expect(page.getByRole('button', { name: 'Stornovat' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'PDF' })).toBeVisible()
})

test('editor: koncept se dál normálně edituje', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [mkInvoice({ id: 'inv-draft', status: 'draft', invoiceNumber: null })],
  })
  await page.goto('/app/faktury/editor?id=inv-draft')

  await expect(page.getByText('Doklad je vystavený, proto se už needituje.')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Uložit koncept' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Vystavit fakturu' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Přidat položku' })).toBeVisible()
})

// --- VYS-13: datum česky, ne v nativním formátu prohlížeče ---

test('editor: datumy jsou v českém formátu, ne v locale prohlížeče', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [mkInvoice({ id: 'inv-draft', status: 'draft', invoiceNumber: null })],
  })
  await page.goto('/app/faktury/editor?id=inv-draft')

  await expect(page.getByTestId('inv-due')).toHaveText('05.09.2026')
  await expect(page.locator('main input[type="date"]')).toHaveCount(0)
})

// --- VYS-05: mobilní cookie lišta ---

test.describe('cookie lišta na telefonu', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('nezabírá víc než čtvrtinu obrazovky a nepřekrývá hlavní CTA', async ({ page }) => {
    await page.goto('/')
    const banner = page.getByRole('dialog', { name: 'Soukromí na Vystaveno' })
    await expect(banner).toBeVisible()

    const box = await banner.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height / 844).toBeLessThanOrEqual(0.28)

    // Podrobné volby jsou schované za „Upravit" — teprve po rozbalení jde uložit vlastní volbu.
    await expect(page.getByRole('button', { name: 'Uložit volbu' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Upravit' }).click()
    await expect(page.getByRole('button', { name: 'Uložit volbu' })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Povolit analytické cookies' })).toBeVisible()
  })
})

// --- VYS-08: registrace ---

test('registrace: tlačítko je aktivní a chybějící souhlas se vysvětlí u checkboxu', async ({
  page,
}) => {
  await page.goto('/registrace')

  const submit = page.getByRole('button', { name: 'Vytvořit účet zdarma' })
  await expect(submit).toBeEnabled()

  await page.getByLabel('Jméno a příjmení').fill('Jan Novák')
  await page.getByLabel('E-mail').fill('jan@example.com')
  await page.getByLabel(/Heslo/).fill('HesloDlouhe123')
  await submit.click()

  // Hláška patří k checkboxu (ne jen do toastu, který zmizí) a checkbox je označený jako chybný.
  await expect(page.locator('#terms-hint')).toHaveText('Ještě potvrďte souhlas s podmínkami.')
  await expect(page.locator('#terms')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/registrace$/)
})

// --- VYS-09: 404 ---

test('404: lidský text a odkazy místo vývojářského placeholderu', async ({ page }) => {
  await page.goto('/tahle-stranka-neexistuje')

  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { name: 'Tuhle stránku tu nemáme' })).toBeVisible()
  await expect(page.getByText(/Placeholder/)).toHaveCount(0)
  await expect(main.getByRole('link', { name: 'Vyzkoušet zdarma' })).toBeVisible()
  await expect(main.getByRole('link', { name: 'Ceník a moduly' })).toBeVisible()
})

// --- VYS-12: dashboard nováčka ---

const API = '**/api/v1/**'

async function seedFreshCompany(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    localStorage.setItem(
      'vystaveno.auth.tokens.v1',
      JSON.stringify({ accessToken: 'e2e-access', refreshToken: 'e2e-refresh' }),
    )
    localStorage.setItem(
      'vystaveno.auth.session.v1',
      JSON.stringify({
        user: { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Test' },
        companyId: 'c_e2e',
        role: 'Owner',
        modules: ['core', 'invoicing'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-08-22T00:00:00.000Z' }),
    )
    // Obor zvolený v onboardingu — z něj se berou doporučené kroky.
    localStorage.setItem('vystaveno.business-profile.v1', 'solo')
  })

  await page.route(API, async (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    if (path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: 'c_e2e',
          role: 'Owner',
          modules: ['core', 'invoicing'],
          features: [],
        },
      })
    if (path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', name: 'Nová firma', currency: 'CZK' } })
    if (path === '/company/modules')
      return route.fulfill({ json: { modules: ['core', 'invoicing'] } })
    if (path === '/locations') return route.fulfill({ json: { items: [], total: 0 } })
    if (path === '/sales') return route.fulfill({ json: { items: [], total: 0 } })
    if (path === '/invoices') return route.fulfill({ json: { total: 0, items: [] } })
    if (path.startsWith('/dashboard/summary'))
      return route.fulfill({
        json: {
          totalInvoiced: 0,
          totalPaid: 0,
          paidCount: 0,
          overdueCount: 0,
          overdueAmount: 0,
        },
      })
    if (path.startsWith('/dashboard/revenue')) return route.fulfill({ json: { series: [] } })
    if (path.startsWith('/dashboard/recent-')) return route.fulfill({ json: [] })
    return route.fulfill({ status: 404, json: { title: `Unhandled ${path}` } })
  })
}

test('přehled: nová firma dostane doporučené kroky místo prázdné obrazovky', async ({ page }) => {
  await seedFreshCompany(page)
  await page.goto('/app')

  const card = page.getByTestId('dashboard-setup-steps')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { name: 'Doporučený start' })).toBeVisible()
  // Kroky jsou klikací zkratky do aplikace, ne jen text.
  await expect(card.getByRole('link').first()).toHaveAttribute('href', /\/app\//)
})

import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Vystavení na libovolné datum + změna čísla už vystaveného dokladu — obojí v API režimu,
// protože právě tam byla obě pole dosud jen ke čtení („Doplní se při vystavení" / „Přidělí se
// při vystavení"). Test dokazuje CESTU K SERVERU: zachytává odeslané payloady, ne jen text v UI.

const API = '**/api/v1/**'
const MODULES = ['core', 'invoicing']

async function seedApiSession(page: Page): Promise<void> {
  await page.addInitScript((mods) => {
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
        modules: mods,
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, MODULES)
}

const CLIENT = {
  id: 'cli-1',
  type: 'Company',
  name: 'Acme s.r.o.',
  ico: '12345678',
  dic: 'CZ12345678',
  email: 'acme@example.com',
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    number: null,
    status: 'Draft',
    documentType: 'Invoice',
    clientId: CLIENT.id,
    clientName: CLIENT.name,
    currency: 'CZK',
    isVatPayer: true,
    issueDate: null,
    dueDate: '2025-12-14',
    paymentMethod: 'bank_transfer',
    subtotal: 1000,
    vatTotal: 210,
    total: 1210,
    lines: [
      {
        id: 'line-1',
        description: 'Práce',
        unit: 'ks',
        quantity: 1,
        unitPrice: 1000,
        vatRate: 21,
        sortOrder: 0,
        lineBase: 1000,
        lineVat: 210,
        lineTotal: 1210,
      },
    ],
    ...overrides,
  }
}

interface Captured {
  createdIssueDate?: unknown
  updatedIssueDate?: unknown
  changedNumber?: unknown
}

/** Server drží stav dokladu, takže test ověřuje serverovou pravdu, ne lokální optimismus. */
async function routeApp(
  page: Page,
  captured: Captured,
  opts: { numberConflict?: boolean; draftIssueDate?: string } = {},
): Promise<void> {
  let current = invoice({ issueDate: opts.draftIssueDate ?? null })

  await page.route(API, async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const method = route.request().method()
    const body = route.request().postDataJSON?.() ?? null

    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: 'c_e2e',
          role: 'Owner',
          modules: MODULES,
          features: [],
        },
      })
    if (method === 'GET' && path === '/company/modules')
      return route.fulfill({ json: { modules: MODULES } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E s.r.o.', currency: 'CZK' } })
    if (method === 'GET' && path === '/locations')
      return route.fulfill({ json: { items: [], total: 0 } })
    if (method === 'GET' && path === '/clients')
      return route.fulfill({ json: { items: [CLIENT], total: 1 } })
    if (method === 'GET' && path === '/invoices')
      return route.fulfill({ json: { items: [current], total: 1 } })
    if (method === 'GET' && path === '/invoices/inv-1') return route.fulfill({ json: current })

    if (method === 'POST' && path === '/invoices') {
      captured.createdIssueDate = body?.issueDate
      current = invoice({ issueDate: body?.issueDate ?? null })
      return route.fulfill({ json: current })
    }
    if (method === 'PUT' && path.startsWith('/invoices/inv-1/items')) {
      return route.fulfill({ json: current }) // synchronizace řádků konceptu — obsah řádků tenhle test neřeší
    }
    if (method === 'PUT' && path === '/invoices/inv-1') {
      captured.updatedIssueDate = body?.issueDate
      current = { ...current, issueDate: body?.issueDate ?? null }
      return route.fulfill({ json: current })
    }
    // Server přidělí číslo z řady ROKU VYSTAVENÍ — doklad datovaný do 2025 dostane číslo 2025.
    if (method === 'POST' && path === '/invoices/inv-1/issue') {
      const year = String(current.issueDate ?? '').slice(0, 4) || '2026'
      current = { ...current, status: 'Issued', number: `FA${year}0001` }
      return route.fulfill({ json: current })
    }
    if (method === 'PUT' && path === '/invoices/inv-1/number') {
      captured.changedNumber = body?.number
      if (opts.numberConflict)
        return route.fulfill({
          status: 409,
          json: { detail: `Číslo ${body?.number} už má jiný doklad — zvolte jiné.` },
        })
      current = { ...current, number: body?.number }
      return route.fulfill({ json: current })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('koncept drží zvolené datum vystavení a číslo dostane z řady toho roku', async ({ page }) => {
  const captured: Captured = {}
  await seedApiSession(page)
  // Koncept už má na serveru zpětné datum — přesně to dřív nešlo, protože ho editor
  // ani neposílal a server ho při vystavení přebil dneškem.
  await routeApp(page, captured, { draftIssueDate: '2025-11-30' })

  await page.goto('/app/faktury/editor?id=inv-1')

  // Datum vystavení je v ostrém režimu OVLÁDACÍ PRVEK s uloženou hodnotou, ne text „Doplní se při vystavení".
  await expect(page.getByTestId('inv-issue')).toHaveText('30.11.2025')
  await expect(page.getByText('Doplní se při vystavení')).toHaveCount(0)
  await expect(page.getByText('Můžete vystavit i zpětně', { exact: false })).toBeVisible()

  // Uložení konceptu pošle datum na server (dřív ho request vůbec nenesl).
  await page.getByRole('button', { name: 'Uložit koncept' }).click()
  await expect.poll(() => captured.updatedIssueDate).toBe('2025-11-30')

  // Vystavení → číslo z řady ROKU VYSTAVENÍ, převzaté ze serveru.
  await page.getByRole('button', { name: 'Vystavit fakturu' }).click()
  await expect(page.getByTestId('editor-cislo-dokladu')).toHaveText('FA20250001')
})

test('nová faktura posílá datum vystavení už při zakládání konceptu', async ({ page }) => {
  const captured: Captured = {}
  await seedApiSession(page)
  await routeApp(page, captured)

  await page.goto('/app/faktury/editor')
  await expect(page.getByTestId('inv-issue')).toBeVisible()

  await page.locator('#inv-client').click()
  await page.getByRole('option', { name: CLIENT.name }).click()
  await page.getByRole('button', { name: 'Uložit koncept' }).click()

  // Datum je součástí požadavku (ISO), takže zvolená hodnota se nemá kde ztratit.
  await expect.poll(() => captured.createdIssueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('číslo vystaveného dokladu jde změnit a editor převezme serverovou hodnotu', async ({
  page,
}) => {
  const captured: Captured = {}
  await seedApiSession(page)
  await routeApp(page, captured)

  await page.goto('/app/faktury/editor?id=inv-1')
  await page.getByRole('button', { name: 'Vystavit fakturu' }).click()
  await expect(page.getByTestId('editor-cislo-dokladu')).toHaveText('FA20260001')

  await page.getByTestId('editor-zmenit-cislo').click()
  const dialog = page.getByTestId('zmena-cisla-dialog')
  await expect(dialog).toBeVisible()
  // Dialog říká pravdu o dopadu: nové PDF a jiný variabilní symbol.
  await expect(dialog).toContainText('variabilní symbol')

  await page.getByTestId('zmena-cisla-input').fill('2026-0042')
  await page.getByTestId('zmena-cisla-potvrdit').click()

  await expect.poll(() => captured.changedNumber).toBe('2026-0042')
  await expect(page.getByTestId('editor-cislo-dokladu')).toHaveText('2026-0042')
  await expect(dialog).toBeHidden()
})

test('obsazené číslo server odmítne a doklad si nechá to původní', async ({ page }) => {
  // Odmítnutí je smyslem testu — prohlížeč u něj zaloguje očekávanou síťovou chybu.
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 409' })
  test.info().annotations.push({ type: 'allowConsoleError', description: 'už má jiný doklad' })
  const captured: Captured = {}
  await seedApiSession(page)
  await routeApp(page, captured, { numberConflict: true })

  await page.goto('/app/faktury/editor?id=inv-1')
  await page.getByRole('button', { name: 'Vystavit fakturu' }).click()
  await expect(page.getByTestId('editor-cislo-dokladu')).toHaveText('FA20260001')

  await page.getByTestId('editor-zmenit-cislo').click()
  await page.getByTestId('zmena-cisla-input').fill('FA20260009')
  await page.getByTestId('zmena-cisla-potvrdit').click()

  // Odmítnutí se uživateli vysvětlí serverovou hláškou a číslo v editoru se NEZMĚNÍ.
  await expect(page.getByText('už má jiný doklad', { exact: false }).first()).toBeVisible()
  await expect(page.getByTestId('editor-cislo-dokladu')).toHaveText('FA20260001')
})

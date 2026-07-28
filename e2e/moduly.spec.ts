import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Stránka „Přidat moduly" — jediné místo, kde vedení firmy vidí, co firma používá, co si může
// přidat, co obsahuje vyšší tarif a co se teprve připravuje. Nárok i změnu vynucuje server;
// tady kontrolujeme, že UI nikde neslibuje víc, než co server dovolí.

const API = '**/api/v1/**'

interface Session {
  role: string
  modules: string[]
  locked: string[]
  companyId?: string
  companies?: { id: string; name: string; modules: string[] }[]
}

function snapshot(s: Session, modules = s.modules) {
  return {
    companyId: s.companyId ?? 'c_e2e',
    plan: {
      id: 'growth',
      name: 'Růst',
      status: 'active',
      renewsAt: null,
      graceEndsAt: null,
      canManageSubscription: s.role === 'Owner' || s.role === 'Admin',
    },
    modules,
    features: [],
    limits: {},
    accessMode: 'full',
    lockedModules: s.locked,
  }
}

async function seedSession(page: Page, s: Session): Promise<void> {
  await page.addInitScript(
    ({ role, modules, companyId, snap }) => {
      window.__VYSTAVENO_API_URL__ = '/api/v1'
      localStorage.setItem(
        'vystaveno.auth.tokens.v1',
        JSON.stringify({ accessToken: 'e2e-access', refreshToken: 'e2e-refresh' }),
      )
      localStorage.setItem(
        'vystaveno.auth.session.v1',
        JSON.stringify({
          user: { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Test' },
          companyId,
          role,
          modules,
          features: [],
          entitlement: snap,
        }),
      )
      localStorage.setItem(
        'vystaveno.cookieConsent.v1',
        JSON.stringify({
          necessary: true,
          analytics: false,
          decidedAt: '2026-07-09T00:00:00.000Z',
        }),
      )
    },
    {
      role: s.role,
      modules: s.modules,
      companyId: s.companyId ?? 'c_e2e',
      snap: snapshot(s),
    },
  )
}

/** Server drží volbu modulů; PUT ji přepíše a další GET /me vrátí nový stav (jako v produkci). */
async function routeApi(page: Page, s: Session): Promise<string[][]> {
  const puts: string[][] = []
  const state = new Map<string, string[]>(
    (s.companies ?? [{ id: s.companyId ?? 'c_e2e', name: 'E2E Firma', modules: s.modules }]).map(
      (c) => [c.id, [...c.modules]],
    ),
  )
  let current = s.companyId ?? 'c_e2e'

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()
    const modules = state.get(current) ?? []

    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: current,
          role: s.role,
          modules,
          features: [],
          companies: (s.companies ?? [{ id: current, name: 'E2E Firma', modules }]).map((c) => ({
            id: c.id,
            name: c.name,
            role: s.role,
            locationId: null,
          })),
          entitlement: snapshot({ ...s, companyId: current }, modules),
        },
      })
    if (method === 'GET' && path === '/company/modules') return route.fulfill({ json: { modules } })
    if (method === 'PUT' && path === '/company/modules') {
      const body = request.postDataJSON() as { modules: string[] }
      // Server nikdy nepustí modul mimo nárok — i kdyby ho UI poslalo.
      const rejected = body.modules.find((m) => s.locked.includes(m))
      if (rejected)
        return route.fulfill({
          status: 403,
          json: { status: 403, detail: 'Není ve vašem tarifu.', reason: 'module_not_in_plan' },
        })
      puts.push(body.modules)
      state.set(current, body.modules)
      return route.fulfill({ json: { modules: body.modules } })
    }
    if (method === 'POST' && path.endsWith('/switch')) {
      current = path.split('/')[2] ?? current
      return route.fulfill({ json: { accessToken: 'e2e-access-2', refreshToken: 'e2e-refresh-2' } })
    }
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: current, name: 'E2E Firma', currency: 'CZK' } })
    return route.fulfill({ json: { items: [], total: 0 } })
  })

  return puts
}

const owner: Session = {
  role: 'Owner',
  modules: ['core', 'invoicing', 'ai'],
  locked: ['gastro', 'verified_signing'],
}

test('majitel má moduly jako vlastní položku menu a stránka ukazuje jen moduly', async ({
  page,
}) => {
  await seedSession(page, owner)
  await routeApi(page, owner)

  await page.goto('/app/faktury')
  await page.getByRole('link', { name: 'Přidat moduly' }).first().click()

  await expect(page).toHaveURL(/\/app\/moduly$/)
  await expect(page.getByRole('heading', { name: 'Moduly', level: 1 })).toBeVisible()
  // Žádné obecné firemní nastavení — jen moduly.
  await expect(page.getByText('Bankovní spojení')).toHaveCount(0)
  await expect(page.getByText('Číslování faktur')).toHaveCount(0)
})

test('stavy modulů odpovídají nároku firmy a nic neslibují navíc', async ({ page }) => {
  await seedSession(page, owner)
  await routeApi(page, owner)
  await page.goto('/app/moduly')

  // Aktivní
  await expect(page.getByTestId('module-status-invoicing')).toHaveText('Aktivní')
  // Dostupný k přidání
  await expect(page.getByTestId('module-status-stock')).toHaveText('Není zapnutý')
  await expect(page.getByRole('button', { name: 'Přidat modul Sklad' })).toBeVisible()
  // Vyžaduje vyšší tarif — zámek, přínos, CTA; žádné tlačítko na aktivaci
  await expect(page.getByTestId('module-status-gastro')).toHaveText('Vyžaduje vyšší tarif')
  await expect(page.getByText('Objednávky, stoly i kuchyň')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zobrazit možnosti pro Gastro' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Přidat modul Gastro' })).toHaveCount(0)
  // Připravujeme — i když ho server v modulech pošle, nesmí vypadat zapnutě ani zapnutelně
  await expect(page.getByTestId('module-status-ai')).toHaveText('Připravujeme')
  await expect(page.getByRole('button', { name: 'Přidat modul AI asistent' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Vypnout modul AI asistent' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Chci vědět mezi prvními' })).toBeVisible()
  // Jádro se nedá vypnout.
  await expect(page.getByRole('button', { name: 'Vypnout modul Jádro' })).toHaveCount(0)
})

test('přidání modulu se potvrzuje a hned se projeví v menu', async ({ page }) => {
  await seedSession(page, owner)
  const puts = await routeApi(page, owner)
  await page.goto('/app/moduly')

  await expect(page.getByRole('link', { name: 'Stav skladu' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Přidat modul Sklad' }).click()
  await expect(page.getByRole('heading', { name: 'Přidat Sklad?' })).toBeVisible()
  await page.getByTestId('confirm-module-change').click()

  await expect(page.getByTestId('module-status-stock')).toHaveText('Aktivní')
  await expect(page.getByRole('link', { name: 'Stav skladu' }).first()).toBeVisible()
  expect(puts.at(-1)).toContain('stock')
})

test('vypnutí modulu žádá potvrzení a bez něj se nic nestane', async ({ page }) => {
  await seedSession(page, owner)
  const puts = await routeApi(page, owner)
  await page.goto('/app/moduly')

  await page.getByRole('button', { name: 'Vypnout modul Fakturace' }).click()
  await page.getByRole('button', { name: 'Zpět' }).click()

  await expect(page.getByTestId('module-status-invoicing')).toHaveText('Aktivní')
  expect(puts).toHaveLength(0)
})

test('modul z vyššího tarifu vede na možnosti předplatného', async ({ page }) => {
  await seedSession(page, owner)
  await routeApi(page, owner)
  await page.goto('/app/moduly')

  await page.getByRole('button', { name: 'Zobrazit možnosti pro Gastro' }).click()

  await expect(page).toHaveURL(/\/app\/predplatne$/)
})

test('manažer moduly nemění — v menu je nemá a přímá URL ho bezpečně odkloní', async ({ page }) => {
  const manager: Session = { role: 'Manager', modules: ['core', 'invoicing'], locked: ['gastro'] }
  await seedSession(page, manager)
  await routeApi(page, manager)

  await page.goto('/app/moduly')

  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('link', { name: 'Přidat moduly' })).toHaveCount(0)
})

test('stránka ukazuje moduly aktivní firmy ze serveru, ne zapamatovaný stav', async ({ page }) => {
  // Přepnutí firmy dělá tvrdý přechod na /app s cache zahozenou (auth.switchCompany), takže po něm
  // stránka startuje přesně takhle: lokální stav ještě patří předchozí firmě, server nové.
  const b: Session = { role: 'Owner', modules: ['core', 'invoicing'], locked: [] }
  await seedSession(page, b)
  await routeApi(page, { ...b, modules: ['core', 'pos', 'stock'] })
  await page.goto('/app/moduly')

  await expect(page.getByTestId('module-status-pos')).toHaveText('Aktivní')
  await expect(page.getByTestId('module-status-stock')).toHaveText('Aktivní')
  await expect(page.getByTestId('module-status-invoicing')).toHaveText('Není zapnutý')
})

test.describe('mobil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('moduly jsou dostupné z mobilního menu a karty jsou v jednom sloupci', async ({ page }) => {
    await seedSession(page, owner)
    await routeApi(page, owner)
    await page.goto('/app/faktury')

    await page.getByRole('button', { name: 'Otevřít menu' }).click()
    await page.getByRole('link', { name: 'Přidat moduly' }).click()

    await expect(page).toHaveURL(/\/app\/moduly$/)
    const first = await page.getByTestId('module-core').boundingBox()
    const second = await page.getByTestId('module-invoicing').boundingBox()
    expect(first?.x).toBe(second?.x) // jeden sloupec — karty pod sebou
    expect(second!.y).toBeGreaterThan(first!.y)
  })
})

test.describe('tmavý režim', () => {
  test('stránka respektuje tmavé téma', async ({ page }) => {
    await seedSession(page, owner)
    await routeApi(page, owner)
    await page.addInitScript(() => localStorage.setItem('vystaveno:theme', 'dark'))
    await page.goto('/app/moduly')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByTestId('module-status-invoicing')).toBeVisible()
  })
})

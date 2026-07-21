import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// CRM je „Růst" add-on — backend /crm gatuje modulem crm (Permissions.Crm.* → ProductModules.Crm).
// Bez modulu se nesmí zobrazit nav ani stránka (přímý přechod přesměruje na Přehled, žádné zavádějící
// „Server je momentálně nedostupný"); s modulem funguje seznam → detail → poznámka → úkol → dokončení.

const API = '**/api/v1/**'
const BASE_MODULES = ['core', 'pos', 'gastro', 'stock', 'reporting', 'loyalty', 'integrations']
const CRM_MODULES = [...BASE_MODULES, 'invoicing', 'crm']

async function seedApiSession(page: Page, modules: string[]): Promise<void> {
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
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, modules)
}

interface CrmTask {
  id: string
  clientId: string
  title: string
  description: string | null
  dueAt: string | null
  priority: 'low' | 'normal' | 'high'
  status: 'open' | 'completed' | 'cancelled'
  completedAt: string | null
  createdAt: string
}

async function routeApp(page: Page, modules: string[]): Promise<void> {
  const hasCrm = modules.includes('crm')
  // Serverový stav CRM drží mock v closure, ať zápisy (poznámka/úkol) vidí následné čtení.
  const tasks: CrmTask[] = []
  const timeline: Array<Record<string, unknown>> = []
  let taskSeq = 0

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: 'c_e2e',
          role: 'Owner',
          modules,
          features: [],
        },
      })
    if (method === 'GET' && path === '/company/modules') return route.fulfill({ json: { modules } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E Gastro', currency: 'CZK' } })
    if (method === 'GET' && path === '/locations')
      return route.fulfill({ json: { items: [{ id: 'loc1', name: 'Praha' }], total: 1 } })
    if (method === 'GET' && path === '/sales')
      return route.fulfill({ json: { items: [], total: 0 } })

    if (path.startsWith('/crm')) {
      if (!hasCrm) return route.fulfill({ status: 403, json: { title: 'Forbidden' } })
      const openTasks = tasks.filter((t) => t.status === 'open')

      if (method === 'GET' && path.startsWith('/crm/clients') && path.split('/').length === 3)
        return route.fulfill({
          json: {
            items: [
              {
                id: 'c1',
                name: 'Acme s.r.o.',
                ico: '12345678',
                email: 'acme@example.cz',
                openTaskCount: openTasks.length,
                nextTaskDueAt: openTasks[0]?.dueAt ?? null,
                lastActivityAt: null,
                outstandingAmount: 1500,
                currency: 'CZK',
              },
            ],
            total: 1,
            page: 1,
            pageSize: 50,
          },
        })
      if (method === 'GET' && path === '/crm/clients/c1')
        return route.fulfill({
          json: {
            id: 'c1',
            name: 'Acme s.r.o.',
            ico: '12345678',
            dic: 'CZ12345678',
            email: 'acme@example.cz',
            phone: null,
            openTasks,
            outstanding: [{ currency: 'CZK', amount: 1500, invoiceCount: 2 }],
            links: [],
          },
        })
      if (method === 'GET' && path === '/crm/clients/c1/timeline')
        return route.fulfill({ json: { items: timeline, nextCursor: null } })
      if (method === 'POST' && path === '/crm/clients/c1/activities') {
        const body = request.postDataJSON() as { body?: string }
        timeline.unshift({
          stableId: `act${timeline.length + 1}`,
          occurredAt: '2026-07-21T08:00:00.000Z',
          kind: 'note',
          sourceType: 'note',
          sourceId: null,
          label: 'Poznámka',
          body: body.body ?? '',
          deepLink: null,
          taskId: null,
        })
        return route.fulfill({ status: 201, json: {} })
      }
      if (method === 'POST' && path === '/crm/tasks') {
        const body = request.postDataJSON() as { title?: string; dueAt?: string | null }
        taskSeq += 1
        const created: CrmTask = {
          id: `t${taskSeq}`,
          clientId: 'c1',
          title: body.title ?? '',
          description: null,
          dueAt: body.dueAt ?? null,
          priority: 'normal',
          status: 'open',
          completedAt: null,
          createdAt: '2026-07-21T08:00:00.000Z',
        }
        tasks.push(created)
        return route.fulfill({ status: 201, json: created })
      }
      const completeMatch = path.match(/^\/crm\/tasks\/(t\d+)\/complete$/)
      if (method === 'POST' && completeMatch) {
        const task = tasks.find((t) => t.id === completeMatch[1])
        if (task) {
          task.status = 'completed'
          task.completedAt = '2026-07-21T09:00:00.000Z'
        }
        return route.fulfill({ status: 200, json: {} })
      }
      return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('crm: tenant bez modulu nevidí nav a /app/crm přesměruje bez „server nedostupný"', async ({
  page,
}) => {
  await seedApiSession(page, BASE_MODULES)
  await routeApp(page, BASE_MODULES)

  await page.goto('/app/crm')

  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: 'Dnes ve firmě' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CRM' })).toHaveCount(0)
  await expect(page.getByText('Server je momentálně nedostupný')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'CRM' })).toHaveCount(0)
})

test('crm: seznam → detail → poznámka → úkol → dokončení', async ({ page }) => {
  await seedApiSession(page, CRM_MODULES)
  await routeApp(page, CRM_MODULES)

  await page.goto('/app/crm')

  // Seznam + auto-vybraný detail.
  await expect(page.getByRole('heading', { name: 'CRM' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Acme s.r.o.', level: 2 })).toBeVisible()
  await expect(page.getByText('Žádný otevřený úkol', { exact: false })).toBeVisible()

  // Poznámka → objeví se v časové ose.
  await page.getByLabel('Nová poznámka / záznam hovoru').fill('Domluveno na příští týden')
  await page.getByRole('button', { name: 'Uložit' }).click()
  await expect(page.getByText('Domluveno na příští týden')).toBeVisible()

  // Úkol s termínem → objeví se mezi otevřenými úkoly.
  await page.getByLabel('Nový úkol').fill('Zavolat ohledně nabídky')
  await page.getByLabel('Termín').fill('2026-08-01')
  await page.getByRole('button', { name: 'Přidat' }).click()
  await expect(page.getByText('Zavolat ohledně nabídky')).toBeVisible()

  // Dokončení → úkol zmizí z otevřených.
  await page.getByRole('button', { name: 'Dokončit' }).click()
  await expect(page.getByText('Zavolat ohledně nabídky')).toHaveCount(0)
  await expect(page.getByText('Žádný otevřený úkol', { exact: false })).toBeVisible()
})

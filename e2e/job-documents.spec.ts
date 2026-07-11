import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

const API = '**/api/v1/**'
const JOB_ID = 'job-files-1'
const modules = ['core', 'jobs', 'invoicing']
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const job = {
  id: JOB_ID,
  number: 'ZAK-2026-0042',
  name: 'Montáž tepelného čerpadla',
  clientId: 'client-1',
  clientName: 'Jan Novák',
  siteAddress: 'Praha 2',
  status: 'in_progress',
  priority: 'normal',
  scheduledAt: '2026-07-11T08:00:00Z',
  assignedEmployeeId: null,
  locationId: null,
  sourceQuoteId: null,
  invoiceId: null,
  note: null,
  createdAt: '2026-07-10T10:00:00Z',
  updatedAt: '2026-07-11T10:00:00Z',
  workItems: [],
  materialItems: [],
  checklist: [{ id: 'check-1', label: 'Kontrola zapojení', isDone: true, sortOrder: 0 }],
  events: [],
  handover: null,
  totals: { workNet: 0, materialNet: 0, net: 0, vat: 0, total: 0 },
}

type FileDto = {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  createdAt: string
  uploadedByName: string
}

type Role = 'Owner' | 'Accountant'

interface MockOptions {
  role: Role
  rejectUploads?: Set<string>
}

interface MockState {
  files: FileDto[]
  multipartUploads: string[]
  listPageSizes: string[]
  forbiddenMutations: number
}

async function seedApiSession(page: Page, role: Role): Promise<void> {
  await page.addInitScript(
    ({ role, modules }) => {
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
          role,
          modules,
          features: [],
        }),
      )
      localStorage.setItem(
        'vystaveno.company.v1',
        JSON.stringify({ id: 'c_e2e', companyName: 'E2E s.r.o.', vatMode: 'non_payer' }),
      )
      localStorage.setItem(
        'vystaveno.subscription.v1',
        JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
      )
      localStorage.setItem(
        'vystaveno.cookieConsent.v1',
        JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-11T00:00:00Z' }),
      )
    },
    { role, modules },
  )
}

async function mockJobApi(
  page: Page,
  initialFiles: FileDto[],
  options: MockOptions,
): Promise<MockState> {
  const state: MockState = {
    files: [...initialFiles],
    multipartUploads: [],
    listPageSizes: [],
    forbiddenMutations: 0,
  }
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === `/jobs/${JOB_ID}`) return route.fulfill({ json: job })
    if (method === 'GET' && path === '/company/modules') return route.fulfill({ json: { modules } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({
        json: {
          id: 'c_e2e',
          name: 'E2E s.r.o.',
          ico: null,
          dic: null,
          email: 'e2e@vystaveno.cz',
          phone: null,
          logoUrl: null,
          defaultDueDays: 14,
          currency: 'CZK',
          address: null,
          bankAccount: null,
          publicSlug: null,
        },
      })
    if (method === 'GET' && path === `/jobs/${JOB_ID}/files`) {
      state.listPageSizes.push(url.searchParams.get('pageSize') ?? '')
      return route.fulfill({
        json: {
          items: state.files,
          total: state.files.length,
          page: 1,
          pageSize: 100,
        },
      })
    }
    if (method === 'POST' && path === `/jobs/${JOB_ID}/files`) {
      if (options.role === 'Accountant') {
        state.forbiddenMutations += 1
        return route.fulfill({ status: 403, json: { title: 'Forbidden' } })
      }
      const contentType = request.headers()['content-type'] ?? ''
      const body = request.postDataBuffer()
      const bodyText = body?.toString('latin1') ?? ''
      const fileName = bodyText.match(/filename="([^"]+)"/)?.[1] ?? ''
      expect(contentType).toMatch(/^multipart\/form-data; boundary=/)
      expect(bodyText).toContain('name="file"')
      expect(body?.indexOf(PNG_SIGNATURE) ?? -1).toBeGreaterThanOrEqual(0)
      state.multipartUploads.push(fileName)
      if (options.rejectUploads?.has(fileName)) {
        return route.fulfill({
          status: 422,
          json: { detail: 'Obsah souboru neodpovídá povolenému obrázku.' },
        })
      }
      const uploaded: FileDto = {
        id: `file-${state.multipartUploads.length}`,
        fileName,
        contentType: 'image/png',
        sizeBytes: PNG_BYTES.length,
        createdAt: '2026-07-11T12:00:00Z',
        uploadedByName: 'E2E Test',
      }
      state.files.unshift(uploaded)
      return route.fulfill({ status: 201, json: uploaded })
    }
    const contentMatch = path.match(new RegExp(`^/jobs/${JOB_ID}/files/([^/]+)/content$`))
    if (method === 'GET' && contentMatch) {
      const file = state.files.find((item) => item.id === contentMatch[1])
      return route.fulfill({
        status: 200,
        contentType: file?.contentType ?? 'application/octet-stream',
        headers: { 'Content-Disposition': `attachment; filename="${file?.fileName ?? 'soubor'}"` },
        body: 'download-content',
      })
    }
    const deleteMatch = path.match(new RegExp(`^/jobs/${JOB_ID}/files/([^/]+)$`))
    if (method === 'DELETE' && deleteMatch) {
      if (options.role === 'Accountant') {
        state.forbiddenMutations += 1
        return route.fulfill({ status: 403, json: { title: 'Forbidden' } })
      }
      const index = state.files.findIndex((item) => item.id === deleteMatch[1])
      if (index >= 0) state.files.splice(index, 1)
      return route.fulfill({ status: 204 })
    }
    if (
      method === 'GET' &&
      ['/service-items', '/employees', '/products', '/locations'].includes(path)
    )
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 100 } })
    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: 'c_e2e',
          role: options.role,
          modules,
          features: [],
        },
      })

    return route.fulfill({ status: 404, json: { title: `Unexpected ${method} ${path}` } })
  })
  return state
}

const originalFile: FileDto = {
  id: 'file-original',
  fileName: 'predavaci-protokol.pdf',
  contentType: 'application/pdf',
  sizeBytes: 2048,
  createdAt: '2026-07-11T10:30:00Z',
  uploadedByName: 'Petr Technik',
}

test('přílohy zakázky: list, upload, download a potvrzené smazání', async ({ page }) => {
  await seedApiSession(page, 'Owner')
  const state = await mockJobApi(page, [originalFile], { role: 'Owner' })
  await page.goto(`/app/zakazky/${JOB_ID}`)

  const panel = page.getByRole('region', { name: 'Dokumenty a soubory' })
  await expect(panel.getByText('predavaci-protokol.pdf')).toBeVisible()
  await expect(panel.getByText(/2 kB.*Petr Technik/)).toBeVisible()

  await panel.getByLabel('Vybrat soubory k nahrání').setInputFiles({
    name: 'fotka.png',
    mimeType: 'image/png',
    buffer: PNG_BYTES,
  })
  await expect(page.getByText('Soubor byl nahrán.')).toBeVisible()
  await expect(panel.getByText('fotka.png')).toBeVisible()
  expect(state.multipartUploads).toEqual(['fotka.png'])
  expect(state.listPageSizes).toEqual(['100'])

  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Stáhnout predavaci-protokol.pdf' }).click()
  const downloaded = await downloadPromise
  expect(downloaded.suggestedFilename()).toBe('predavaci-protokol.pdf')

  await panel.getByRole('button', { name: 'Smazat fotka.png' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('fotka.png')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Smazat' }).click()
  await expect(page.getByText('Soubor byl smazán.')).toBeVisible()
  await expect(panel.getByText('fotka.png')).toHaveCount(0)
})

test('role jen pro čtení může soubory vypsat a stáhnout, ne měnit', async ({ page }) => {
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 403' })
  await seedApiSession(page, 'Accountant')
  const state = await mockJobApi(page, [originalFile], { role: 'Accountant' })
  await page.goto(`/app/zakazky/${JOB_ID}`)

  const panel = page.getByRole('region', { name: 'Dokumenty a soubory' })
  await expect(panel.getByText('predavaci-protokol.pdf')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Stáhnout predavaci-protokol.pdf' })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Přidat soubory' })).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Smazat predavaci-protokol.pdf' })).toHaveCount(0)
  const forbiddenStatus = await page.evaluate(
    async (jobId) =>
      (
        await fetch(`/api/v1/jobs/${jobId}/files/file-original`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer e2e-access' },
        })
      ).status,
    JOB_ID,
  )
  expect(forbiddenStatus).toBe(403)
  expect(state.forbiddenMutations).toBe(1)
})

test('multiple upload pokračuje po 422 a zachová úspěšný soubor', async ({ page }) => {
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 422' })
  await seedApiSession(page, 'Owner')
  const state = await mockJobApi(page, [], {
    role: 'Owner',
    rejectUploads: new Set(['vadny.png']),
  })
  await page.goto(`/app/zakazky/${JOB_ID}`)

  const panel = page.getByRole('region', { name: 'Dokumenty a soubory' })
  await panel.getByLabel('Vybrat soubory k nahrání').setInputFiles([
    {
      name: 'vadny.png',
      mimeType: 'application/octet-stream',
      buffer: PNG_BYTES,
    },
    { name: 'fotka.png', mimeType: 'image/png', buffer: PNG_BYTES },
  ])

  await expect(
    page.getByText(
      'Nahráno 1 z 2 souborů. Selhalo 1: vadny.png: Obsah souboru neodpovídá povolenému obrázku.',
    ),
  ).toBeVisible()
  await expect(panel.getByText('fotka.png')).toBeVisible()
  await expect(panel.getByText('vadny.png')).toHaveCount(0)
  expect(state.multipartUploads).toEqual(['vadny.png', 'fotka.png'])
})

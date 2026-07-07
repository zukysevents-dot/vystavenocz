import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

test('nastavení firmy se promítne do nové faktury (číslo + splatnost)', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    company: { invoiceNumberPrefix: 'TEST', nextInvoiceSeq: 7, defaultPaymentDays: 30 },
  })
  await page.goto('/app/faktury/editor')

  const year = new Date().getFullYear()
  await expect(page.locator('#inv-number')).toHaveValue(`TEST-${year}-0007`)

  const due = new Date()
  due.setDate(due.getDate() + 30)
  await expect(page.locator('#inv-due')).toHaveValue(due.toISOString().slice(0, 10))
})

test('výchozí splatnost 0 dní → splatnost = datum vystavení', async ({ page }) => {
  await seedApp(page, { subscription: 'pro', company: { defaultPaymentDays: 0 } })
  await page.goto('/app/faktury/editor')

  const issue = await page.locator('#inv-issue').inputValue()
  await expect(page.locator('#inv-due')).toHaveValue(issue)
})

test('nastavení ukáže pravdivý stav integrací a exportů', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/nastaveni')

  await expect(page.getByRole('heading', { name: 'Nastavení firmy' })).toBeVisible()
  await expect(page.getByText('Integrace a exporty')).toBeVisible()

  await expect(page.getByText('Faktury do účetnictví')).toBeVisible()
  await expect(page.getByText('Účtárna umí exportovat faktury jako ISDOC XML')).toBeVisible()
  await expect(page.getByText('Gastro Z-reporty')).toBeVisible()
  await expect(page.getByText('denní i měsíční účetní CSV')).toBeVisible()

  await expect(page.getByText('Platební terminál')).toBeVisible()
  await expect(page.getByText('Účtenky a kuchyňské bony')).toBeVisible()
  await expect(page.getByText('Manuální krok')).toHaveCount(2)
  await expect(page.getByText('Čeká na konektor')).toBeVisible()
  await expect(page.getByText('POHODA / Flexi')).toBeVisible()
  await expect(page.getByText('Exportní režim')).toBeVisible()
  await expect(page.getByText('přímá synchronizace zatím neběží')).toBeVisible()
  await expect(page.getByText('Partnerské API')).toBeVisible()
  await expect(page.getByText('Plánováno')).toBeVisible()
})

test('veřejný slug se normalizuje pro online objednávky a QR stoly', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/nastaveni')

  await page.locator('#public_slug').fill('  Žluťoučký Bistro 2026!!  ')
  await page.locator('#public_slug').blur()

  await expect(page.locator('#public_slug')).toHaveValue('zlutoucky-bistro-2026')
  await expect(page.getByText(/\/objednavka\/zlutoucky-bistro-2026/)).toBeVisible()

  await page.getByRole('button', { name: 'Uložit nastavení' }).click()
  await expect(page.getByText('Nastavení uloženo')).toBeVisible()

  const storedSlug = await page.evaluate(() => {
    const raw = localStorage.getItem('vystaveno.company.v1')
    return raw ? JSON.parse(raw).publicSlug : null
  })
  expect(storedSlug).toBe('zlutoucky-bistro-2026')
})

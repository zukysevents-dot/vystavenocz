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
  await expect(page.getByText('Manuální krok')).toBeVisible()
  await expect(page.getByText('POHODA / Flexi')).toBeVisible()
  await expect(page.getByText('Exportní režim')).toBeVisible()
  await expect(page.getByText('přímá synchronizace zatím neběží')).toBeVisible()
})

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

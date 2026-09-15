import { test, expect } from './fixtures/test'
import type { Page } from '@playwright/test'

// Registrace dřív každou serverovou chybu zahodila za „Registrace selhala. Zkuste to znovu."
// Uživatel opakoval tentýž překlep dokola, protože se nedozvěděl, co je špatně ani kde.
// Server přitom hlásí chyby po polích („Heslo musí obsahovat číslici.").

async function apiMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  })
}

async function fillForm(page: Page): Promise<void> {
  await page.locator('#fullName').fill('Jan Novák')
  await page.locator('#email').fill('jan@firma.cz')
  await page.locator('#password').fill('heslobezcislic')
  await page.getByRole('checkbox').click()
}

test('chyba od serveru se ukáže u pole, kterého se týká', async ({ page }) => {
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 422' })
  await apiMode(page)
  await page.route('**/api/v1/auth/register', (route) =>
    route.fulfill({
      status: 422,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        status: 422,
        errors: { Password: ['Heslo musí obsahovat číslici.'], Email: ['Neplatný e-mail.'] },
      }),
    }),
  )
  await page.goto('/registrace')
  await fillForm(page)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page.locator('#password-error')).toHaveText('Heslo musí obsahovat číslici.')
  await expect(page.locator('#email-error')).toHaveText('Neplatný e-mail.')
  await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true')
})

test('obsazený e-mail se ukáže u e-mailu, ne jako obecné selhání', async ({ page }) => {
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 409' })
  await apiMode(page)
  await page.route('**/api/v1/auth/register', (route) =>
    route.fulfill({ status: 409, contentType: 'application/problem+json', body: '{"status":409}' }),
  )
  await page.goto('/registrace')
  await fillForm(page)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page.locator('#email-error')).toContainText('už existuje')
})

test('chyba bez vazby na pole zůstane jako obecná hláška', async ({ page }) => {
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 500' })
  await apiMode(page)
  await page.route('**/api/v1/auth/register', (route) =>
    route.fulfill({ status: 500, contentType: 'application/problem+json', body: '{"status":500}' }),
  )
  await page.goto('/registrace')
  await fillForm(page)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page.locator('#password-error')).toBeHidden()
  // Hláška patří do formuláře, ne jen do toastu, který za pár vteřin zmizí.
  await expect(page.locator('form').getByText('Registrace selhala', { exact: false })).toBeVisible()
})

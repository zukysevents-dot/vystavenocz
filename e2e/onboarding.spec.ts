import { test, expect } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'
import { seedApp } from './helpers/seed'

test('gastro onboarding ukáže doporučený start a pokračuje na pobočky', async ({ page }) => {
  await dismissCookies(page)
  await seedApp(page, {
    subscription: 'pro',
    company: {
      companyName: '',
      ico: '',
    },
  })
  await page.goto('/app/onboarding')

  await expect(page.getByRole('heading', { name: 'Doplňte údaje o firmě' })).toBeVisible()

  // Výběr profilu je explicitní — výchozí je nově 'warehouse' (Samostatný sklad), takže gastro
  // se musí zvolit. Radio input je sr-only → kliká se na kartu profilu.
  await page.getByText('Gastro', { exact: true }).click()

  await expect(page.getByText('Doporučený start')).toBeVisible()
  await expect(page.getByText('Založit provozovny')).toBeVisible()
  await expect(page.getByText('Připravit stoly a QR')).toBeVisible()
  await expect(page.getByText('Nahrát menu a sklad')).toBeVisible()
  await expect(page.getByText('Nastavit volby k produktům')).toBeVisible()
  await expect(page.getByText('Ověřit denní provoz')).toBeVisible()

  await page.locator('#company_name').fill('E2E Bistro')
  await page.locator('#ico').fill('12345678')
  await page.getByRole('button', { name: 'Uložit a pokračovat' }).click()

  await expect(page).toHaveURL(/\/app\/pobocky$/)
  await expect(page.getByRole('heading', { name: 'Pobočky & vedení' })).toBeVisible()
})

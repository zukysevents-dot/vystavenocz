import { test, expect } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'
import { seedApp } from './helpers/seed'

test('gastro onboarding ukáže doporučený start a skončí na Přehledu', async ({ page }) => {
  await dismissCookies(page)
  await seedApp(page, {
    subscription: 'pro',
    company: {
      companyName: '',
      ico: '',
    },
  })
  await page.goto('/app/onboarding')

  await expect(page.getByRole('heading', { name: 'Co budete používat?' })).toBeVisible()

  // Výběr oboru je explicitní (výchozí je 'solo' — Živnostník), takže gastro se musí zvolit.
  // Radio input je sr-only → kliká se na kartu profilu.
  await page.getByText('Restaurace, kavárna, bar', { exact: true }).click()

  await expect(page.getByText('Doporučený start')).toBeVisible()
  await expect(page.getByText('Založit provozovny')).toBeVisible()
  await expect(page.getByText('Připravit stoly a QR')).toBeVisible()
  await expect(page.getByText('Nahrát menu a sklad')).toBeVisible()
  await expect(page.getByText('Nastavit volby k produktům')).toBeVisible()
  await expect(page.getByText('Ověřit denní provoz')).toBeVisible()

  await page.locator('#company_name').fill('E2E Bistro')
  // IČO musí projít kontrolní číslicí a ARES — onboarding firmu bez ověřeného IČO neuloží
  // (server ji stejně odmítne). 12345678 má špatnou kontrolní číslici, proto reálné veřejné IČO.
  await page.locator('#ico').fill('27082440')
  await page.getByRole('button', { name: 'Uložit a pokračovat' }).click()

  // Onboarding vždy končí na Přehledu; doporučené kroky má uživatel v menu i v Průvodci.
  await expect(page).toHaveURL(/\/app$/)
})

// Brána na IČO sedí u zakládání firmy — vymyšlené číslo („1234567", „0000000") firmu nezaloží
// a uživatel musí vidět u pole, co je špatně.
test('onboarding: vymyšlené IČO firmu nezaloží a chyba se ukáže u pole', async ({ page }) => {
  await dismissCookies(page)
  await seedApp(page, { subscription: 'pro', company: { companyName: '', ico: '' } })
  await page.goto('/app/onboarding')

  await page.locator('#company_name').fill('Salon Nováček')
  await page.locator('#ico').fill('1234567')
  await page.getByRole('button', { name: /Uložit a pokračovat/ }).click()

  await expect(page.locator('#ico-hint')).toContainText('platné IČO')
  await expect(page.locator('#ico')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/onboarding/)
})

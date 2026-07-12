import { test, expect } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'
import { seedApp } from './helpers/seed'

test('průvodce nabízí krátké postupy a vede do pracovního modulu', async ({ page }) => {
  await dismissCookies(page)
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/pruvodce')

  await expect(page.getByRole('heading', { name: 'Co chcete udělat?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Proveďte směnu v restauraci' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Dokončete zakázku od nabídky po fakturu' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Otevřít pokladnu' }).click()
  await expect(page).toHaveURL(/\/app\/pokladna$/)
})

import { test, expect } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'
import { seedApp } from './helpers/seed'

test('průvodce nabízí krátké postupy a vede do pracovního modulu', async ({ page }) => {
  await dismissCookies(page)
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/pruvodce')

  await expect(page.getByRole('heading', { name: 'Jak vám dnes Vystaveno pomůže?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Obsloužte stůl v restauraci' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Dokončete zakázku od nabídky po fakturu' }),
  ).toBeVisible()

  const restaurantGuide = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Obsloužte stůl v restauraci' }),
  })
  await restaurantGuide.locator('summary').click()
  await expect(restaurantGuide.getByText('Co to znamená')).toBeVisible()
  await expect(restaurantGuide.getByText('Tip:', { exact: false })).toBeVisible()

  await page.getByRole('button', { name: 'Otevřít pokladnu' }).click()
  await expect(page).toHaveURL(/\/app\/pokladna$/)
})

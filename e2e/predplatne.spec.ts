import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

test('fiktivní upgrade na Pro → děkujeme → aktivní tarif', async ({ page }) => {
  await seedApp(page, { subscription: 'trial' })
  await page.goto('/app/predplatne')

  await page.getByRole('button', { name: 'Aktivovat Pro' }).click()
  await expect(page).toHaveURL(/\/app\/predplatne\/dekujeme/)
  await expect(page.getByRole('heading', { name: 'Děkujeme!' })).toBeVisible()

  await page.goto('/app/predplatne')
  await expect(page.getByText('Aktivní tarif: Vystaveno Pro')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aktivovat Pro' })).toHaveCount(0)
})

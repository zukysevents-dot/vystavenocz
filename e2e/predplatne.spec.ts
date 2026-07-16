import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

test('neaktivní tarif vede na ceník a sám se lokálně neaktivuje', async ({ page }) => {
  await seedApp(page, { subscription: 'trial' })
  await page.goto('/app/predplatne')

  await page.getByRole('link', { name: 'Prohlédnout možnosti tarifu' }).click()
  await expect(page).toHaveURL(/\/cenik/)
  await page.goto('/app/predplatne')
  await expect(page.getByText('Aktivní tarif: Vystaveno Pro')).toHaveCount(0)
})

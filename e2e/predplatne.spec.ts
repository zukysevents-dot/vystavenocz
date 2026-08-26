import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Předplatné se z prohlížeče nedá aktivovat — dřív tady bylo tlačítko „Aktivovat Pro", které si
// tarif zapnulo lokálně v localStorage. Stránka teď jen pravdivě ukazuje serverový stav a nabízí
// cestu, jak o změnu požádat.

test('zkušební doba: stránka ukazuje stav, obsah tarifu a cestu ke změně', async ({ page }) => {
  await seedApp(page, { subscription: 'trial' })
  await page.goto('/app/predplatne')

  await expect(page.getByRole('heading', { name: 'Předplatné' })).toBeVisible()
  await expect(page.getByText(/Zkušební doba tarifu Růst/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'V tarifu Růst' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Přidat moduly' })).toBeVisible()

  // Žádná lokální aktivace tarifu.
  await expect(page.getByRole('button', { name: /Aktivovat/ })).toHaveCount(0)
})

// Náhled běží bez serveru, takže nabídku modulů nemá odkud vzít. Nesmí to ale číst jako
// „máte všechno" ani nabízet nákup, který nikam nevede — to by byl falešný slib.
test('bez běžící platební brány stránka nákup nepředstírá', async ({ page }) => {
  await seedApp(page, { subscription: 'trial' })
  await page.goto('/app/predplatne')

  await expect(page.getByRole('heading', { name: 'Přidat moduly' })).toBeVisible()
  await expect(page.getByText(/Platby online zatím spouštíme/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Pokračovat k platbě/ })).toHaveCount(0)
  await expect(page.getByText(/Máte k dispozici všechno/)).toHaveCount(0)
})

test('zaplacený tarif: stránka ho ukáže jako aktivní', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/predplatne')

  await expect(page.getByText('Aktivní tarif: Růst')).toBeVisible()
  await expect(page.getByRole('button', { name: /Aktivovat/ })).toHaveCount(0)
})

test('po skončení předplatného stránka pravdivě řekne, co dál', async ({ page }) => {
  await seedApp(page, { subscription: 'expired' })
  await page.goto('/app/predplatne')

  await expect(page.getByText('Předplatné skončilo').first()).toBeVisible()
  await expect(page.getByText(/prohlížet i vyexportovat/)).toBeVisible()
  // Nikdy technický důvod.
  await expect(page.getByText('module_not_in_plan')).toHaveCount(0)
  await expect(page.getByText('403')).toHaveCount(0)
})

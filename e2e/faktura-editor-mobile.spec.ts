import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

test.use({ viewport: { width: 390, height: 844 } })

test('mobilní editor: vytvoření, fit náhledu a obnova rozepsaného konceptu', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/faktury/editor')

  await expect(page.locator('#invoice-preview')).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )

  await page.locator('#inv-client').click()
  await page.getByRole('option', { name: 'E2E Klient' }).click()
  await page.getByLabel('Popis položky').fill('Mobilní konzultace')
  await page.getByLabel('Množství').fill('2')
  await page.getByLabel('Cena/MJ').fill('750')
  await page.locator('#inv-due').fill('2026-08-31')
  await page.getByLabel('Poznámka na dokladu').fill('Děkujeme za spolupráci.')

  const stickySave = page.getByRole('button', { name: 'Uložit koncept' }).last()
  await page.getByLabel('Poznámka na dokladu').scrollIntoViewIfNeeded()
  await expect(stickySave).toBeVisible()
  await expect(page.getByText('1 500,00 Kč').last()).toBeVisible()

  await page.getByRole('button', { name: 'Zobrazit náhled' }).click()
  const preview = page.locator('#invoice-preview')
  await expect(preview).toBeVisible()
  const previewFits = await preview.evaluate((element) => {
    const frame = element.firstElementChild?.getBoundingClientRect()
    const viewport = element.getBoundingClientRect()
    return !!frame && frame.width <= viewport.width
  })
  expect(previewFits).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )

  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage).some((key) =>
          key.startsWith('vystaveno.invoice-editor.recovery.v1:'),
        ),
      ),
    )
    .toBe(true)

  await page.reload()
  await expect(page.getByText('Rozepsaný koncept byl obnoven')).toBeVisible()
  await expect(page.getByLabel('Popis položky')).toHaveValue('Mobilní konzultace')
  await expect(page.getByLabel('Cena/MJ')).toHaveValue('750')
  await expect(page.locator('#inv-due')).toHaveValue('2026-08-31')
  await expect(page.getByLabel('Poznámka na dokladu')).toHaveValue('Děkujeme za spolupráci.')

  await page.getByRole('button', { name: 'Uložit koncept' }).last().click()
  await expect(page).toHaveURL(/\/app\/faktury\/editor\?id=/)
  await expect(page.getByText('Koncept uložen.')).toBeVisible()
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) =>
        key.startsWith('vystaveno.invoice-editor.recovery.v1:'),
      ),
    ),
  ).toBe(false)
})

test('mobilní editor: dlouhý náhled se neořízne pod první A4', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/faktury/editor')

  for (let index = 0; index < 24; index += 1) {
    await page.getByRole('button', { name: 'Přidat položku' }).click()
  }
  await page.getByRole('button', { name: 'Zobrazit náhled' }).click()

  const preview = page.locator('#invoice-preview')
  await expect(preview).toBeVisible()
  await expect
    .poll(() =>
      preview.evaluate((element) => {
        const frame = element.firstElementChild?.getBoundingClientRect()
        const document = element.querySelector('.invoice-doc')?.getBoundingClientRect()
        if (!frame || !document) return false
        return document.height > 500 && frame.height + 1 >= document.height
      }),
    )
    .toBe(true)
})

test('mobilní editor: recovery zachová i dočasně prázdné číselné pole', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/faktury/editor')

  await page.locator('#inv-client').click()
  await page.getByRole('option', { name: 'E2E Klient' }).click()
  await page.getByLabel('Popis položky').fill('Rozpracovaný řádek')
  await page.getByLabel('Množství').fill('')
  await page.getByLabel('Cena/MJ').fill('')
  await page.getByLabel('Poznámka na dokladu').fill('Nesmí se ztratit')
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage).some((key) =>
          key.startsWith('vystaveno.invoice-editor.recovery.v1:'),
        ),
      ),
    )
    .toBe(true)

  await page.reload()

  await expect(page.getByText('Rozepsaný koncept byl obnoven')).toBeVisible()
  await expect(page.getByLabel('Popis položky')).toHaveValue('Rozpracovaný řádek')
  await expect(page.getByLabel('Množství')).toHaveValue('')
  await expect(page.getByLabel('Cena/MJ')).toHaveValue('')
  await expect(page.getByLabel('Poznámka na dokladu')).toHaveValue('Nesmí se ztratit')
})

for (const viewport of [
  { width: 360, height: 640 },
  { width: 768, height: 1024 },
]) {
  test(`mobilní editor: geometrie a fit náhledu na ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await seedApp(page, { subscription: 'pro' })
    await page.goto('/app/faktury/editor')

    const preview = page.locator('#invoice-preview')
    if (viewport.width < 640) {
      await page.getByRole('button', { name: 'Zobrazit náhled' }).click()
    }
    await expect(preview).toBeVisible()
    await expect
      .poll(() =>
        preview.evaluate((element) => {
          const frame = element.firstElementChild?.getBoundingClientRect()
          const bounds = element.getBoundingClientRect()
          return !!frame && frame.width <= bounds.width
        }),
      )
      .toBe(true)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await expect(page.getByRole('button', { name: 'Uložit koncept' }).last()).toBeVisible()
  })
}

test('mobilní editor: validační chyby zůstanou u polí a primární akce je dostupná', async ({
  page,
}) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/faktury/editor')

  await page.getByRole('button', { name: 'Uložit koncept' }).last().click()

  await expect(page.locator('#inv-client')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Vyberte nebo založte odběratele.')).toBeVisible()
  await expect(page.getByText('Doplňte popis položky.')).toBeVisible()
  await expect(page.locator('#inv-client')).toBeFocused()
})

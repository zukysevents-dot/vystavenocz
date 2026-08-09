import { test, expect, go } from './fixtures'

// PERSONA 8 — Nový uživatel (bez účtu; nezná účetní ani provozní software).
// Scénář: registrace → onboarding → první doporučený krok, pochopení hodnoty do 5 minut.
// Testovací data: unikátní e-mail per běh (lokální e2e DB — vzniká nová firma, to je záměr).
// Bezpečnostní omezení: heslo generované jen pro tento běh, nikam se neukládá; ARES nevoláme (IČO ručně).

const RUN = Date.now().toString(36)
const EMAIL = `e2e.novy.${RUN}@vystaveno-demo.cz`
const PASSWORD = `Novy.${RUN}.Aa1`

test.describe.configure({ mode: 'serial' }) // registrace → onboarding na sebe navazují

test('registrace: validace formuláře mluví česky', async ({ page }) => {
  await go(page, '/registrace')
  await page.locator('#fullName').fill('Nováček Nový')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill('kratke') // příliš krátké heslo
  const terms = page.locator('#terms')
  await terms.check().catch(() =>
    page
      .getByText(/souhlasím/i)
      .first()
      .click(),
  )
  await page.getByRole('button', { name: /Vytvořit účet/ }).click()
  await expect(
    page.getByText(/heslo|znak/i).first(),
    'srozumitelná chyba u krátkého hesla',
  ).toBeVisible()
  await expect(page).toHaveURL(/registrace/)
})

test('registrace → onboarding → výběr oboru → založení firmy → doporučený krok', async ({
  page,
}) => {
  test.skip(
    test.info().project.name === 'mobile',
    'Registrační flow běží v desktop projektu; mobil ověřuje landing níže.',
  )
  await go(page, '/registrace')
  await page.locator('#fullName').fill('Nováček Nový')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page
    .locator('#terms')
    .check()
    .catch(() =>
      page
        .getByText(/souhlasím/i)
        .first()
        .click(),
    )
  await page.getByRole('button', { name: /Vytvořit účet/ }).click()

  // Nový účet bez firmy musí skončit v onboardingu.
  await expect(page).toHaveURL(/onboarding/, { timeout: 20_000 })

  // Výběr oboru (typ podnikání) — služby.
  const profil = page.locator('input[type="radio"][name="business_profile"]')
  await expect(profil.first()).toBeAttached()
  const count = await profil.count()
  expect(count, 'nabídka oborů podnikání').toBeGreaterThanOrEqual(3)
  await page
    .getByText(/Služby|služby|Kadeřnictví|Salon/)
    .first()
    .click()

  // Firma: název + IČO ručně (ARES v onboardingu není — dokumentováno v reportu).
  // IČO musí projít kontrolním součtem (12345679 je validní; 12345678 backend odmítá 422 „Neplatné IČO"
  // a onboarding ukáže jen generický toast — samostatný nález).
  await page.locator('#company_name').fill(`Salon Nováček ${RUN}`)
  await page.locator('#ico').fill('12345679')
  await page.getByRole('button', { name: /Uložit a pokračovat/ }).click()

  // Musí následovat doporučený první krok (setup step), ne prázdný dashboard bez vedení.
  await expect(page).not.toHaveURL(/onboarding/, { timeout: 20_000 })
  await expect(page.locator('main')).not.toContainText(/Něco se pokazilo|undefined/)
})

test.describe(() => {
  test.use({ allowStatus: [403] }) // dokumentovaný 403 GET /sales na dashboardu nové firmy (viz annotation)
  test('po onboardingu: průvodce a vysvětlení modulů dávají první kroky', async ({
    page,
  }, testInfo) => {
    test.skip(test.info().project.name === 'mobile', 'Navazuje na serial registraci (desktop).')
    // NÁLEZ: dashboard nové firmy (profil služby, bez modulu pos) volá GET /sales → 403 šum.
    testInfo.annotations.push({
      type: 'nález',
      description:
        'Dashboard nové firmy bez modulu pos volá GET /api/v1/sales → 403 (P2 — chybí gating jako u invoicing).',
    })
    // Session ze serial testu se nepřenáší (nový context) → přihlásíme se čerstvým účtem.
    await go(page, '/prihlaseni')
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Přihlásit se' }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 20_000 })

    await go(page, '/app/pruvodce')
    await expect(page.getByRole('heading', { name: /Průvodce/ }).first()).toBeVisible()
    await expect(page.locator('main')).toContainText(/krok|začn|nastav/i)

    await go(page, '/app/predplatne')
    await expect(page.locator('main')).toContainText(/Kč|tarif|zdarma/i)
  })
})

test('login stránka: Google/Apple přihlášení (dokumentace stavu)', async ({ page }, testInfo) => {
  await go(page, '/prihlaseni')
  const google = await page
    .getByText(/Google/i)
    .first()
    .isVisible()
    .catch(() => false)
  const apple = await page
    .getByText(/Apple/i)
    .first()
    .isVisible()
    .catch(() => false)
  testInfo.annotations.push({
    type: 'nález',
    description: `Web login nabízí: Google=${google}, Apple=${apple} (backend OAuth hotový; mobil ano — web dokumentujeme)`,
  })
})

test('veřejný ceník vysvětluje hodnotu a trial', async ({ page }) => {
  await go(page, '/cenik')
  await expect(page.locator('body')).toContainText(/Kč/)
  expect
    .soft(
      (await page.locator('body').innerText()).match(/zdarma|trial|14 dn/i) !== null,
      'ceník zmiňuje trial/zdarma vstup',
    )
    .toBe(true)
})

test('mobilní landing: registrace použitelná na telefonu', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Jen mobilní viewport.')
  await go(page, '/registrace')
  await expect(page.locator('#email')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'registrace bez horizontálního přetečení').toBeLessThanOrEqual(2)
})

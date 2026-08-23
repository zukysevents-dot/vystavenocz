import { test, expect } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'

// Provozovatel služby a správce osobních údajů je Backstreet Holding s.r.o. Údaje jsou ověřené
// v ARESu (IČO 21024863, aktivní plátce DPH, OR: Městský soud v Praze, C 394621).
// Tenhle test existuje proto, že jde o PRÁVNĚ ZÁVAZNÉ dokumenty: kdyby se sem vrátila stará
// identita fyzické osoby nebo tvrzení „neplátce DPH", podmínky i zásady GDPR by lhaly
// o tom, kdo data zpracovává a jak se účtuje daň.
const OPERATOR = 'Backstreet Holding s.r.o.'
const ICO = '21024863'
const STARA_ICO = '24991686'

test.beforeEach(async ({ page }) => {
  await dismissCookies(page)
})

test('obchodní podmínky uvádějí správného provozovatele včetně zápisu v rejstříku', async ({
  page,
}) => {
  await page.goto('/podminky')

  await expect(page.getByText(OPERATOR).first()).toBeVisible()
  await expect(page.getByText(ICO).first()).toBeVisible()
  await expect(page.getByText(/Městským soudem v Praze/).first()).toBeVisible()
  // Provozovatel je plátce DPH — opačné tvrzení by u ceníku „bez DPH" bylo zavádějící.
  await expect(page.getByText(/Provozovatel je plátcem DPH/).first()).toBeVisible()
  await expect(page.getByText(/není plátcem DPH/)).toHaveCount(0)
  await expect(page.getByText(STARA_ICO)).toHaveCount(0)
})

test('zásady GDPR uvádějí jako správce firmu, ne fyzickou osobu', async ({ page }) => {
  await page.goto('/gdpr')

  await expect(page.getByText(OPERATOR).first()).toBeVisible()
  await expect(page.getByText(ICO).first()).toBeVisible()
  await expect(page.getByText(STARA_ICO)).toHaveCount(0)
  // Práva subjektu údajů se musí uplatňovat u správce, ne na osobní adrese vývojáře.
  // Scope na text dokumentu — patička je společná pro celý web a nese obchodní kontakt.
  await expect(page.locator('article').getByText(/patrik@vystaveno\.cz/)).toHaveCount(0)
})

test('stránka smazání účtu vede na správce a jeho kontakt', async ({ page }) => {
  await page.goto('/smazani-uctu')

  await expect(page.getByText(OPERATOR).first()).toBeVisible()
  await expect(page.getByText(ICO).first()).toBeVisible()
  await expect(page.locator('article').getByText(/patrik@vystaveno\.cz/)).toHaveCount(0)
})

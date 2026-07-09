import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Ověřené podpisy (verified signing) — frontend foundation běží v mock režimu na lokálních demo datech.
// Provider-neutral: BankID je jen jeden kanál; UI netvrdí právní účinek ani hotové živé podepisování.

test('podpisy: demo obálky, filtr stavu, detail s evidencí a odeslání k podpisu', async ({
  page,
}) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/podpisy')

  await expect(page.getByRole('heading', { name: 'Ověřené podpisy' })).toBeVisible()
  // Provider-neutral disclaimer (žádné tvrzení o hotovém živém BankID / právním účinku).
  await expect(page.getByText('připojeného poskytovatele').first()).toBeVisible()

  // Čtyři realistické demo obálky.
  await expect(page.getByText('Smlouva o cateringu — Letní firemní akce')).toBeVisible()
  await expect(page.getByText('Předávací protokol — Vybavení kuchyně')).toBeVisible()
  await expect(page.getByText('Pracovní dohoda (DPP) — Brigádník výpomoc')).toBeVisible()
  await expect(page.getByText('Objednávka služby — Pravidelný úklid')).toBeVisible()

  // Filtr na Podepsáno → zůstane jen catering.
  await page.locator('#signing-status-filter').click()
  await page.getByRole('option', { name: 'Podepsáno' }).click()
  await expect(page.getByText('Smlouva o cateringu — Letní firemní akce')).toBeVisible()
  await expect(page.getByText('Předávací protokol — Vybavení kuchyně')).toBeHidden()

  // Reset filtru.
  await page.locator('#signing-status-filter').click()
  await page.getByRole('option', { name: 'Všechny stavy' }).click()
  await expect(page.getByText('Předávací protokol — Vybavení kuchyně')).toBeVisible()

  // Detail se stavem Připraveno → evidence hash + odeslání k podpisu.
  await page.getByTestId('envelope-env-agreement').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.getByTestId('evidence-hash')).toBeVisible()
  await expect(dialog.getByText('Obálka vytvořena')).toBeVisible()

  await dialog.getByRole('button', { name: 'Odeslat k podpisu' }).click()
  await expect(page.getByText('Obálka odeslána k ověřenému podpisu.')).toBeVisible()
  await expect(page.getByTestId('detail-status')).toHaveText('Odesláno')
})

test('podpisy: nová obálka vznikne ve stavu Rozpracováno', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/podpisy')

  await page.getByRole('button', { name: 'Nová obálka' }).first().click()
  await expect(page.getByRole('heading', { name: 'Nová podpisová obálka' })).toBeVisible()

  await page.locator('#sig-doc-name').fill('Testovací smlouva E2E')
  await page.locator('#sig-signer-name').fill('Karel Tester')
  await page.getByRole('button', { name: 'Vytvořit obálku' }).click()

  await expect(page.getByText('Podpisová obálka vytvořena.')).toBeVisible()
  await expect(page.getByText('Testovací smlouva E2E')).toBeVisible()
})

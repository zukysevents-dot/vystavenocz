import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Services & Jobs V2 (modul jobs) — end-to-end vertikála v mock režimu (localStorage):
// nabídka → převod na zakázku → pracovní list (práce + materiál ze skladu) → dokončení → Vytvořit fakturu.
// Staví proti kontraktu docs/services-jobs-v2-design.md (§E frontend, §C endpointy).

test('nabídka → zakázka → pracovní list → faktura', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })

  // Materiálový výběr potřebuje produkt ve skladu (mock katalog je jinak prázdný).
  await page.addInitScript(() => {
    localStorage.setItem(
      'vystaveno:products',
      JSON.stringify([
        {
          id: 'prod-paska',
          name: 'Těsnící páska',
          sku: 'TP-001',
          ean: '8590001',
          salePrice: 121,
          vatRate: 21,
          purchasePrice: 60,
          minQuantity: 0,
          categoryId: null,
        },
      ]),
    )
  })

  // --- 1) Nová nabídka jen s volným jménem (bez vazby na klienta) a položkou ---
  // Záměrně bez výběru klienta ze seznamu → zakázka vznikne bez clientId a fakturace musí vyzvat k doplnění.
  await page.goto('/app/nabidky')
  await page.getByRole('button', { name: 'Nová nabídka' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByPlaceholder('Jméno / firma (volný text)').fill('Novák a syn')
  await page.getByPlaceholder('Popis položky').first().fill('Instalace vodovodu')
  await page.getByTitle('Cena/j. (bez DPH)').first().fill('1000')
  await page.getByRole('button', { name: 'Vytvořit' }).click()
  await expect(page.getByText('Nabídka vytvořena.')).toBeVisible()

  // --- 2) Převod nabídky na zakázku → detail zakázky ---
  await page.getByRole('button', { name: 'Na zakázku' }).click()
  await expect(page).toHaveURL(/\/app\/zakazky\/[^/]+$/)
  await expect(page.getByRole('heading', { name: /Zakázka z nabídky/ })).toBeVisible()
  // Položka nabídky se převedla na práci v pracovním listu.
  await expect(page.getByText('Instalace vodovodu').first()).toBeVisible()

  // --- 3) Přidat práci (volný text) ---
  await page.getByRole('button', { name: 'Přidat práci' }).click()
  const workDialog = page.getByRole('dialog')
  await expect(workDialog).toBeVisible()
  await workDialog.locator('#wk-desc').fill('Montáž kotle')
  await workDialog.locator('#wk-qty').fill('2')
  await workDialog.locator('#wk-price').fill('550')
  await workDialog.getByRole('button', { name: 'Přidat' }).click()
  await expect(page.getByText('Práce přidána.')).toBeVisible()
  await expect(page.getByText('Montáž kotle').first()).toBeVisible()

  // --- 4) Přidat materiál (výběr produktu ze skladu) ---
  await page.getByRole('button', { name: 'Přidat materiál' }).click()
  const matDialog = page.getByRole('dialog')
  await expect(matDialog).toBeVisible()
  await matDialog.getByPlaceholder('Hledat podle názvu, kódu nebo čárového kódu').fill('Těsnící')
  await matDialog.getByRole('button', { name: /Těsnící páska/ }).click()
  await matDialog.locator('#mt-qty').fill('3')
  await matDialog.getByRole('button', { name: 'Přidat' }).click()
  await expect(page.getByText('Materiál přidán.')).toBeVisible()

  // --- 5) Dokončit zakázku (scheduled → in_progress → done) ---
  await page.getByRole('button', { name: 'Zahájit' }).click()
  await expect(page.getByText('Stav: Probíhá.')).toBeVisible()
  await page.getByRole('button', { name: 'Dokončit' }).click()
  await expect(page.getByText('Stav: Hotovo.')).toBeVisible()

  // --- 6) Předávací protokol je neměnný snapshot dvou prací a jednoho materiálu ---
  await page.getByRole('button', { name: 'Vytvořit protokol' }).click()
  await expect(page.getByText('Předávací protokol vytvořen.')).toBeVisible()
  await expect(page.getByText('3 položek')).toBeVisible()

  // --- 7) Vytvořit fakturu → nejdřív vyzve k přiřazení klienta (slepá ulička je průchozí) ---
  await page.getByRole('button', { name: 'Vytvořit fakturu' }).first().click()
  await expect(page.getByRole('heading', { name: 'Nový odběratel' })).toBeVisible()
  await page.locator('#qc-name').fill('Novák a syn s.r.o.')
  await page.getByRole('button', { name: 'Použít odběratele' }).click()

  // Po přiřazení klienta faktura pokračuje sama → koncept + editor faktury.
  await expect(page.getByText('Koncept faktury vytvořen.')).toBeVisible()
  await expect(page).toHaveURL(/\/app\/faktury\/editor\?id=/)
  await expect(page.getByRole('heading', { name: 'Faktura', exact: true })).toBeVisible()
})

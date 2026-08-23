import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Invoicing V2 — typy dokladu: zálohová (proforma) faktura + dobropis.
// Mock režim (localStorage) staví proti kontraktu docs/backend/invoicing-v2.md.
// Klíčové pravidlo: FE dobropis nefabrikuje — v ostrém režimu ho dělá backend; množství zůstává KLADNÉ,
// zápornost je jen v částkách. Mock je stand-in, který jen otočí znaménko už spočítaných součtů.

const NOW = '2026-07-09T10:00:00.000Z'

function mkInvoice(over: Record<string, unknown> = {}) {
  return {
    id: 'inv-base',
    documentType: 'invoice',
    status: 'paid',
    invoiceNumber: 'FA-2026-0001',
    clientId: null,
    clientSnapshot: { name: 'Acme s.r.o.' },
    supplierSnapshot: {
      companyName: 'Moje firma s.r.o.',
      ico: null,
      dic: null,
      vatMode: 'payer',
      street: null,
      city: null,
      zip: null,
      country: 'CZ',
    },
    items: [
      {
        id: 'it-1',
        description: 'Práce',
        quantity: 2,
        unit: 'ks',
        unitPrice: 1000,
        vatRate: 21,
        lineSubtotal: 2000,
        lineVat: 420,
        lineTotal: 2420,
      },
    ],
    currency: 'CZK',
    issueDate: '2026-07-09',
    dueDate: '2026-07-23',
    taxableDate: '2026-07-09',
    paidAt: '2026-07-09',
    variableSymbol: '20260001',
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank_transfer',
    subtotal: 2000,
    vatTotal: 420,
    total: 2420,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }
}

function storedInvoices(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('vystaveno:invoices') || '[]') as Array<{
        id: string
        documentType: string
        parentInvoiceId?: string | null
        status: string
        invoiceNumber: string | null
        total: number
        items: Array<{ quantity: number }>
        cancelReason?: string | null
      }>,
  )
}

test('faktura → Vystavit dobropis: backend/mock vytvoří ZÁPORNÝ dobropis s KLADNÝM množstvím', async ({
  page,
}) => {
  await seedApp(page, { subscription: 'pro', invoices: [mkInvoice({ id: 'inv-1' })] })
  await page.goto('/app/faktury')
  // Akce dobropisu se nabízí jen u vystavené/uhrazené faktury (distinktivní desktop title).
  const creditBtn = page.getByRole('button', { name: 'Vystavit dobropis' })
  await expect(creditBtn).toBeVisible()

  await creditBtn.click()
  await expect(page.getByText(/Dobropis vytvořen/)).toBeVisible()

  // Tvrdá kontrola kontraktu: total < 0, ale quantity > 0, a je navázaný na původní fakturu.
  const note = (await storedInvoices(page)).find((i) => i.documentType === 'credit_note')
  expect(note).toBeTruthy()
  expect(note!.total).toBeLessThan(0)
  expect(note!.parentInvoiceId).toBe('inv-1')
  expect(note!.items.every((it) => it.quantity > 0)).toBe(true)
  // Dobropis vzniká rovnou jako vystavený očíslovaný doklad (vstoupí do Účtárny i DPH).
  expect(note!.status).toBe('issued')
  expect(note!.invoiceNumber).toBeTruthy()
})

test('editor: dobropis nelze otevřít v editoru — guard proti přímé URL', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [
      mkInvoice({
        id: 'cn-1',
        documentType: 'credit_note',
        invoiceNumber: 'FA-2026-0001-D',
        status: 'issued',
        parentInvoiceId: 'inv-x',
        subtotal: -2000,
        vatTotal: -420,
        total: -2420,
      }),
    ],
  })
  await page.goto('/app/faktury/editor?id=cn-1')
  // Guard v onMounted přesměruje na seznam — dobropis se needituje (nesmí se přepočítat na kladný).
  await expect(page).toHaveURL(/\/app\/faktury$/)
  await expect(page.getByText('Dobropis je odvozený doklad a needituje se.')).toBeVisible()
})

test('zálohová (proforma) → Převést na fakturu vytvoří navázaný daňový doklad', async ({
  page,
}) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [
      mkInvoice({
        id: 'pf-1',
        documentType: 'proforma',
        invoiceNumber: 'ZAL-2026-0001',
        status: 'issued',
        paidAt: null,
      }),
    ],
  })
  await page.goto('/app/faktury')

  await page.getByRole('button', { name: 'Zálohové' }).click()
  const convertBtn = page.getByRole('button', { name: 'Převést na fakturu' })
  await expect(convertBtn).toBeVisible()

  await convertBtn.click()
  await expect(page.getByText(/převedena na daňový doklad/)).toBeVisible()
  await expect(page).toHaveURL(/\/app\/faktury\/editor\?id=/)
  await expect(page.getByRole('heading', { name: 'Faktura', exact: true })).toBeVisible()

  const inv = (await storedInvoices(page)).find(
    (i) => i.documentType === 'invoice' && i.parentInvoiceId === 'pf-1',
  )
  expect(inv).toBeTruthy()
})

test('editor: výběr typu Zálohová faktura vytvoří proforma doklad', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/faktury/editor')

  await page.locator('#inv-doctype').click()
  await page.getByRole('option', { name: 'Zálohová faktura' }).click()
  await expect(page.getByRole('heading', { name: 'Zálohová faktura' })).toBeVisible()

  await page.getByRole('button', { name: 'Uložit koncept' }).click()
  await expect(page.getByText('Koncept uložen.')).toBeVisible()

  const pf = (await storedInvoices(page)).find((i) => i.documentType === 'proforma')
  expect(pf).toBeTruthy()
})

test('editor: stornování vystavené faktury vyžaduje důvod (backend 415 bez těla)', async ({
  page,
}) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [
      mkInvoice({
        id: 'inv-cancel',
        status: 'issued',
        invoiceNumber: 'FA-2026-0002',
        paidAt: null,
      }),
    ],
  })
  await page.goto('/app/faktury/editor?id=inv-cancel')

  await page.getByRole('button', { name: 'Stornovat' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Bez důvodu se storno neodešle.
  await page.getByRole('button', { name: 'Stornovat' }).last().click()
  await expect(page.getByText('Zadejte důvod stornování.')).toBeVisible()
  const beforeConfirm = (await storedInvoices(page)).find((i) => i.id === 'inv-cancel')
  expect(beforeConfirm!.status).toBe('issued')

  await page.getByLabel('Důvod stornování').fill('Duplicitní faktura')
  await page.getByRole('button', { name: 'Stornovat' }).last().click()
  await expect(page.getByText('Faktura stornována.')).toBeVisible()

  const after = (await storedInvoices(page)).find((i) => i.id === 'inv-cancel')
  expect(after!.status).toBe('cancelled')
  expect(after!.cancelReason).toBe('Duplicitní faktura')
})

// Dobropis vzniká rovnou VYSTAVENÝ, takže ho účetní retence nedovolí smazat a editor ho odmítá
// otevřít. Bez storna v seznamu neměl jedinou akci a omylem vystavený dobropis byl slepá ulička.
function mkCreditNote(id = 'cn-1') {
  return mkInvoice({
    id,
    documentType: 'credit_note',
    invoiceNumber: 'FA-2026-0001-D',
    status: 'issued',
    parentInvoiceId: 'inv-x',
    subtotal: -2000,
    vatTotal: -420,
    total: -2420,
  })
}

test('dobropis jde stornovat ze seznamu — doklad zůstane, jen dostane stav a důvod', async ({
  page,
}) => {
  await seedApp(page, { subscription: 'pro', invoices: [mkCreditNote()] })
  await page.goto('/app/faktury')

  await page.getByTestId('faktury-storno-dobropis-desktop').click()
  await expect(page.getByRole('heading', { name: 'Stornovat dobropis?' })).toBeVisible()

  await page.getByTestId('faktury-storno-duvod').fill('Vystaveno omylem k jiné faktuře')
  await page.getByTestId('faktury-storno-potvrdit').click()

  await expect(page.getByText('Dobropis stornován.')).toBeVisible()

  // Smazání by bylo účetně špatně: doklad musí zůstat i s číslem, jen označený jako stornovaný.
  const notes = await storedInvoices(page)
  expect(notes).toHaveLength(1)
  expect(notes[0].status).toBe('cancelled')
  expect(notes[0].invoiceNumber).toBe('FA-2026-0001-D')
  expect(notes[0].cancelReason).toBe('Vystaveno omylem k jiné faktuře')
})

test('storno dobropisu neprojde bez důvodu — server ho vyžaduje', async ({ page }) => {
  await seedApp(page, { subscription: 'pro', invoices: [mkCreditNote()] })
  await page.goto('/app/faktury')

  await page.getByTestId('faktury-storno-dobropis-desktop').click()
  await expect(page.getByTestId('faktury-storno-potvrdit')).toBeDisabled()

  // Pár znaků nestačí — jinak by v evidenci zůstalo storno s důvodem „a".
  await page.getByTestId('faktury-storno-duvod').fill('ee')
  await expect(page.getByTestId('faktury-storno-potvrdit')).toBeDisabled()

  await page.getByTestId('faktury-storno-duvod').fill('Duplicitní dobropis')
  await expect(page.getByTestId('faktury-storno-potvrdit')).toBeEnabled()
})

test('stornovaný dobropis už znovu stornovat nejde a nejde ani smazat', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    invoices: [{ ...mkCreditNote(), status: 'cancelled' }],
  })
  await page.goto('/app/faktury')

  await expect(page.getByTestId('faktury-storno-dobropis-desktop')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Smazat' })).toHaveCount(0)
})

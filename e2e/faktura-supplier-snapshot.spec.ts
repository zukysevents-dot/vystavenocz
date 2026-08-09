import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Bug fix: editor dřív pro VYSTAVENOU fakturu vždy počítal dodavatele živě z aktuálního profilu
// firmy (companyStore.company), i když backend u vystaveného dokladu vrací zmražený
// `supplierSnapshot` k okamžiku vystavení. Když firma po vystavení změnila účet/adresu/DPH režim,
// znovuotevření staré faktury omylem ukázalo NOVÉ údaje na historickém dokladu.

function mkIssuedInvoice(over: Record<string, unknown> = {}) {
  return {
    id: 'inv-old',
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: 'FA-2026-0001',
    clientId: null,
    clientSnapshot: { name: 'Acme s.r.o.' },
    supplierSnapshot: {
      companyName: 'Stará firma s.r.o.',
      ico: '11112222',
      dic: 'CZ11112222',
      vatMode: 'payer',
      street: 'Stará 1',
      city: 'Brno',
      zip: '60200',
      country: 'CZ',
      bankAccount: '999999999/9999',
    },
    items: [
      {
        id: 'it-1',
        description: 'Práce',
        quantity: 1,
        unit: 'ks',
        unitPrice: 1000,
        vatRate: 21,
        lineSubtotal: 1000,
        lineVat: 210,
        lineTotal: 1210,
      },
    ],
    currency: 'CZK',
    issueDate: '2026-01-01',
    dueDate: '2026-01-15',
    taxableDate: '2026-01-01',
    paidAt: null,
    variableSymbol: '20260001',
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank_transfer',
    subtotal: 1000,
    vatTotal: 210,
    total: 1210,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

test('vystavená faktura ukazuje dodavatele zmraženého k vystavení, ne aktuální profil firmy', async ({
  page,
}) => {
  await seedApp(page, {
    subscription: 'pro',
    // Firma si po vystavení faktury změnila účet i DPH režim.
    company: { bankAccount: '123456789/0100', vatMode: 'non_payer' },
    invoices: [mkIssuedInvoice()],
  })
  await page.goto('/app/faktury/editor?id=inv-old')

  const doc = page.locator('.invoice-doc').first()
  await expect(doc).toContainText('Stará firma s.r.o.')
  await expect(doc).toContainText('999999999/9999')
  await expect(doc).not.toContainText('123456789/0100')
  // Snapshot má vatMode 'payer' (aktuální firma je teď 'non_payer') → rozpad DPH musí zůstat vidět.
  await expect(doc).toContainText('DPH celkem')
})

test('koncept dál ukazuje živý (aktuální) profil firmy, protože ještě nic nezmrazil', async ({
  page,
}) => {
  await seedApp(page, {
    subscription: 'pro',
    company: { bankAccount: '123456789/0100', companyName: 'Aktuální firma s.r.o.' },
  })
  await page.goto('/app/faktury/editor')

  const doc = page.locator('.invoice-doc').first()
  await expect(doc).toContainText('Aktuální firma s.r.o.')
  await expect(doc).toContainText('123456789/0100')
})

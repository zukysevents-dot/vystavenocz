import { test, expect, type Page } from './fixtures/test'
import { seedApp } from './helpers/seed'

// Reprodukce pre-existující díry z F6: číslo nové faktury se generuje z company.nextInvoiceSeq
// při otevření editoru, ale seq se posune až po uložení. Dva taby otevřené nad stejným seq
// proto vygenerují stejné číslo. Guard v useInvoices.create() druhé uložení zablokuje.
test.describe('Faktury — unikátní číslo', () => {
  const numberInput = (p: Page) => p.locator('#inv-number')

  test('dva taby se stejným číslem: druhý koncept se neuloží (žádná duplicita)', async ({
    browser,
  }) => {
    const context = await browser.newContext()

    const tabA = await context.newPage()
    await seedApp(tabA, { subscription: 'pro' })
    await tabA.goto('/app/faktury/editor')
    await expect(numberInput(tabA)).not.toHaveValue('')

    const tabB = await context.newPage()
    await seedApp(tabB, { subscription: 'pro' })
    await tabB.goto('/app/faktury/editor')
    await expect(numberInput(tabB)).not.toHaveValue('')

    // Oba taby vygenerovaly stejné číslo (reprodukce příčiny).
    const number = await numberInput(tabA).inputValue()
    expect(await numberInput(tabB).inputValue()).toBe(number)

    // Tab A uloží jako první — projde.
    await tabA.getByRole('button', { name: 'Uložit koncept' }).click()
    await expect(tabA.getByText('Koncept uložen.')).toBeVisible()

    // Tab B uloží stejné číslo — musí být zablokováno chybovou hláškou.
    await tabB.getByRole('button', { name: 'Uložit koncept' }).click()
    await expect(tabB.getByText(/už existuje/i)).toBeVisible()

    // V úložišti je dané číslo právě jednou.
    const count = await tabA.evaluate((num) => {
      const all = JSON.parse(localStorage.getItem('vystaveno:invoices') || '[]') as Array<{
        invoiceNumber: string
      }>
      return all.filter((i) => i.invoiceNumber === num).length
    }, number)
    expect(count).toBe(1)

    await context.close()
  })
})

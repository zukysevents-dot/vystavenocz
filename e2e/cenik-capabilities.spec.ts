import { test, expect } from './fixtures/test'

test('ceník ukazuje nasazené nástavby bez nepravdivých integračních slibů', async ({ page }) => {
  await page.goto('/cenik')

  await expect(
    page.getByRole('heading', { name: 'Až porostete, Vystaveno poroste s vámi.' }),
  ).toBeVisible()
  await expect(page.getByText('Níže jsou workflow, která už v aplikaci běží;')).toBeVisible()

  await expect(
    page.getByText(
      'Ceník služeb, nabídka, výjezd, pracovní list, předání a faktura v jednom toku.',
    ),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Veřejné menu, QR objednávka ke stolu, výdej i rozvoz rovnou do kuchyňské fronty.',
    ),
  ).toBeVisible()
  await expect(
    page.getByText('Týdenní plán, publikace směn, docházka, opravy s auditem a export pro mzdy.'),
  ).toBeVisible()

  await expect(page.getByText('zaplatí online', { exact: false })).toHaveCount(0)
  await expect(page.getByText('automaticky', { exact: false })).toHaveCount(0)
})

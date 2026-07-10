import { test, expect } from '@playwright/test'
import { seedApp } from './helpers/seed'

// Pondělí aktuálního týdne (lokálně) — ať pre-seed směna padne do zobrazeného týdne plánovače.
function currentMondayYmd(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

test.describe('Plán směn (Workforce V2)', () => {
  test('zobrazí rotu, publikuje týden, přidá směnu a spravuje šablony', async ({ page }) => {
    await seedApp(page)
    const monday = currentMondayYmd()

    // Pobočka + zaměstnanci + jedna rozpracovaná směna Anny (pondělí 8–16 aktuálního týdne).
    await page.addInitScript((mondayYmd: string) => {
      if (localStorage.getItem('__wf_seeded__')) return
      const ts = '2026-01-01T00:00:00.000Z'
      localStorage.setItem(
        'vystaveno:locations',
        JSON.stringify([
          {
            id: 'loc-1',
            name: 'Praha',
            address: null,
            isActive: true,
            createdAt: ts,
            updatedAt: ts,
          },
        ]),
      )
      localStorage.setItem(
        'vystaveno:employees',
        JSON.stringify([
          {
            id: 'e-anna',
            fullName: 'Anna Nováková',
            userId: null,
            locationId: 'loc-1',
            isActive: true,
            position: 'Servírka',
            hourlyRate: 170,
          },
          {
            id: 'e-petr',
            fullName: 'Petr Dvořák',
            userId: null,
            locationId: 'loc-1',
            isActive: true,
            position: 'Kuchař',
            hourlyRate: 210,
          },
        ]),
      )
      localStorage.setItem(
        'vystaveno:shifts',
        JSON.stringify([
          {
            id: 's-1',
            employeeId: 'e-anna',
            locationId: 'loc-1',
            startsAt: new Date(`${mondayYmd}T08:00:00`).toISOString(),
            endsAt: new Date(`${mondayYmd}T16:00:00`).toISOString(),
            status: 'Draft',
            position: 'Servírka',
            hourlyRateOverride: null,
            note: null,
          },
        ]),
      )
      localStorage.setItem('__wf_seeded__', '1')
    }, monday)

    await page.goto('/app/smeny')
    await expect(page.getByRole('heading', { name: 'Plán směn' })).toBeVisible()

    // Zaměstnanci v mřížce + pre-seed směna.
    await expect(page.getByText('Anna Nováková').first()).toBeVisible()
    await expect(page.getByText('08:00–16:00').first()).toBeVisible()

    // Publikace týdne: jedna Draft směna → Published.
    const publishBtn = page.getByRole('button', { name: /Publikovat týden/ })
    await expect(publishBtn).toBeEnabled()
    await publishBtn.click()
    await expect(page.getByText(/Publikováno/)).toBeVisible()

    // Nová směna přes dialog.
    await page.getByRole('button', { name: 'Nová směna' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Petr Dvořák' }).click()
    await page.locator('#sh-date').fill(monday)
    await page.locator('#sh-start').fill('10:00')
    await page.locator('#sh-end').fill('18:00')
    await page.getByRole('button', { name: 'Přidat' }).click()
    await expect(page.getByText('Směna přidána.')).toBeVisible()

    // Overnight směna (bar 18:00–02:00) musí projít — konec patří na následující den, ne 0 h.
    await page.getByRole('button', { name: 'Nová směna' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Anna Nováková' }).click()
    await page.locator('#sh-date').fill(monday)
    await page.locator('#sh-start').fill('18:00')
    await page.locator('#sh-end').fill('02:00')
    await page.getByRole('button', { name: 'Přidat' }).click()
    await expect(page.getByText(/18:00.02:00/).first()).toBeVisible()

    // Šablony: založení nové šablony.
    await page.getByRole('button', { name: 'Šablony' }).click()
    await expect(page.getByRole('heading', { name: 'Šablony směn' })).toBeVisible()
    await page.getByRole('button', { name: 'Nová šablona' }).click()
    await page.locator('#tpl-name').fill('Ranní bar')
    await page.getByRole('button', { name: 'Uložit' }).click()
    await expect(page.getByText('Ranní bar')).toBeVisible()
  })
})

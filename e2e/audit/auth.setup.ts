import { test as setup, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { demoCreds, dismissCookies } from './helpers'

const STATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth', 'state.json')

// Jedno UI přihlášení demo účtem; session (tokeny v localStorage) sdílí všechny audit testy.
setup('přihlášení demo účtem', async ({ page }) => {
  const { email, password } = demoCreds()
  fs.mkdirSync(path.dirname(STATE), { recursive: true })

  // Cookie souhlas do localStorage — přenáší se přes storageState do všech testů (banner nepřekáží klikům).
  await dismissCookies(page)
  await page.goto('/prihlaseni')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Přihlásit se' }).click()

  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 })
  await page.context().storageState({ path: STATE })
})

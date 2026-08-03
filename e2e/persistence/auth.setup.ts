import { test as setup, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { CLEAN_STATE, STATE, demoCreds, dismissCookies } from './helpers'

// Jedno UI přihlášení demo účtem; session (tokeny v localStorage) sdílí všechny testy suity.
// Backend má na /auth/login rate limit, takže se přihlašujeme jednou za běh, ne v každém testu.
setup('přihlášení demo účtem', async ({ page }) => {
  const { email, password } = demoCreds()
  fs.mkdirSync(path.dirname(STATE), { recursive: true })

  await dismissCookies(page)
  await page.goto('/prihlaseni')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Přihlásit se' }).click()

  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 })
  const state = await page.context().storageState({ path: STATE })

  // „Čistý prohlížeč": tytéž přihlašovací tokeny, ale BEZ lokální cache dat (profil firmy,
  // klienti, faktury, entitlements…). Co se v něm zobrazí, drží prokazatelně server.
  // Identita uživatele zůstává — bez ní route guard appky pošle rovnou na přihlášení,
  // a testujeme přetrvání DAT, ne přihlašovací obrazovku.
  const KEEP = [
    'vystaveno.auth.tokens.v1',
    'vystaveno.auth.session.v1',
    'vystaveno.cookieConsent.v1',
  ]
  const clean = {
    cookies: [],
    origins: state.origins.map((o) => ({
      ...o,
      localStorage: o.localStorage.filter((entry) => KEEP.includes(entry.name)),
    })),
  }
  fs.writeFileSync(CLEAN_STATE, JSON.stringify(clean, null, 2))
})

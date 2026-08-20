import { expect, type Browser, type Page, type APIRequestContext, request } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dismissCookies } from '../audit/helpers'

export { dismissCookies }

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:5176/api/v1'

const AUTH_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth')
/** Session sdílená testy (tokeny + cache aplikace). */
export const STATE = path.join(AUTH_DIR, 'state.json')
/** Tytéž tokeny, ale bez jakékoli lokální cache dat — „čistý prohlížeč". */
export const CLEAN_STATE = path.join(AUTH_DIR, 'clean.json')

/** Přihlašovací údaje demo účtu — POUZE z env (nikdy do kódu/reportů). */
export function demoCreds(): { email: string; password: string } {
  const email = process.env.E2E_DEMO_EMAIL
  const password = process.env.E2E_DEMO_PASSWORD
  if (!email || !password) {
    throw new Error('Chybí E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD v prostředí (viz .env.example).')
  }
  return { email, password }
}

/** Unikátní název záznamu — testy se nesmí ovlivňovat ani při opakovaném běhu. */
export function unique(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Prohlížeč přihlášeného uživatele BEZ jakékoli lokální cache dat — simuluje nové přihlášení
 * na jiném zařízení. Co se v něm zobrazí, musí prokazatelně držet server.
 * Přihlášení proběhlo jednou v setupu (backend má na /auth/login rate limit, takže se
 * v každém testu znovu nepřihlašujeme).
 */
export async function loginFresh(
  browser: Browser,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: CLEAN_STATE })
  const page = await context.newPage()
  await page.goto('/app')
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 })
  return { page, close: () => context.close() }
}

// Token se v rámci workeru přihlašuje JEDNOU. Každý test volal /auth/login znovu a backend má
// na přihlašování rate limit (ochrana proti hádání hesla), takže delší běh spadl na 429 —
// vypadalo to jako „neběží backend", i když backend dělal přesně to, co má.
let cachedToken: Promise<string> | null = null

async function demoAccessToken(): Promise<string> {
  cachedToken ??= (async () => {
    const { email, password } = demoCreds()
    const api = await request.newContext()
    const res = await api.post(`${API_URL}/auth/login`, { data: { email, password } })
    expect(res.status(), 'login demo účtu (běží backend?)').toBe(200)
    return (await res.json()).accessToken as string
  })()
  return cachedToken
}

/** Autorizovaný API kontext demo účtu — pro přípravu/úklid dat mimo UI. */
export async function apiContext(): Promise<APIRequestContext> {
  const accessToken = await demoAccessToken()
  // baseURL musí končit lomítkem, jinak by se relativní cesta zapsala přes /api/v1.
  return request.newContext({
    baseURL: `${API_URL.replace(/\/$/, '')}/`,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  })
}

/** Počká, až se stránka ustálí (síť v klidu). */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
}

/** Sonner toast s daným textem (úspěch i chyba jedou přes stejný komponent). */
export function toast(page: Page, text: string | RegExp) {
  return page.locator('[data-sonner-toast]').filter({ hasText: text })
}

/** Očekává úspěšnou odpověď API na daný zápis (metoda + cesta) během akce. */
export async function expectWrite(
  page: Page,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  pathRe: RegExp,
  action: () => Promise<void>,
): Promise<number> {
  const waiter = page.waitForResponse(
    (r) => r.request().method() === method && pathRe.test(new URL(r.url()).pathname),
    { timeout: 20_000 },
  )
  await action()
  const res = await waiter
  return res.status()
}

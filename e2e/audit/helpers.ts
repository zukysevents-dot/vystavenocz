import type { Page, TestInfo } from '@playwright/test'

/**
 * Přihlašovací údaje demo účtu — POUZE z env (nikdy je nezapisovat do kódu/reportů).
 * Lokálně: export E2E_DEMO_EMAIL=… E2E_DEMO_PASSWORD=… (viz .env.example).
 */
export function demoCreds(): { email: string; password: string } {
  const email = process.env.E2E_DEMO_EMAIL
  const password = process.env.E2E_DEMO_PASSWORD
  if (!email || !password) {
    throw new Error('Chybí E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD v prostředí (viz .env.example).')
  }
  return { email, password }
}

/** Šum, který není chybou aplikace (HMR, devtools, favicon, mapy zdrojů…). */
const CONSOLE_IGNORE = [/\[vite\]/, /Download the Vue Devtools/, /favicon/, /sourcemap/i]

/** Requesty, jejichž selhání nehodnotíme (telemetrie, HMR websocket, zrušené navigací). */
const REQUEST_IGNORE = [/sentry/i, /\/@vite\//, /\/node_modules\//, /favicon/]

export interface PageWatch {
  consoleErrors: string[]
  failedRequests: string[]
  /** 4xx/5xx odpovědi API — status + metoda + cesta (bez tokenů a query). */
  badResponses: string[]
}

/**
 * Zapne sběr chyb konzole, selhaných requestů a 4xx/5xx odpovědí.
 * Volat PŘED page.goto(). Očekávané stavy (např. testovaný 401) filtruje volající.
 */
export function watchPage(page: Page, opts: { allowStatus?: number[] } = {}): PageWatch {
  const watch: PageWatch = { consoleErrors: [], failedRequests: [], badResponses: [] }
  const allow = new Set(opts.allowStatus ?? [])

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (CONSOLE_IGNORE.some((re) => re.test(text))) return
    // Browserový log „Failed to load resource … status of NNN" pro očekávaný (povolený) status není chyba.
    if ([...allow].some((s) => text.includes(`status of ${s}`))) return
    watch.consoleErrors.push(text.slice(0, 500))
  })
  page.on('pageerror', (err) => {
    watch.consoleErrors.push(`pageerror: ${String(err).slice(0, 500)}`)
  })
  page.on('requestfailed', (req) => {
    const url = req.url()
    if (REQUEST_IGNORE.some((re) => re.test(url))) return
    // Zrušené requesty při odchodu ze stránky nejsou chyba.
    if (req.failure()?.errorText.includes('ERR_ABORTED')) return
    watch.failedRequests.push(`${req.method()} ${new URL(url).pathname} — ${req.failure()?.errorText}`)
  })
  page.on('response', (res) => {
    const url = res.url()
    if (!url.includes('/api/')) return
    if (res.status() < 400 || allow.has(res.status())) return
    watch.badResponses.push(`${res.status()} ${res.request().method()} ${new URL(url).pathname}`)
  })
  return watch
}

/** Přiloží nasbírané chyby do reportu (bez citlivých údajů — jen status/cesta/hláška). */
export async function attachWatch(testInfo: TestInfo, watch: PageWatch): Promise<void> {
  const body = JSON.stringify(watch, null, 2)
  if (watch.consoleErrors.length || watch.failedRequests.length || watch.badResponses.length) {
    await testInfo.attach('page-errors.json', { body, contentType: 'application/json' })
  }
}

export interface AppRoute {
  path: string
  /** Očekávaný text v hlavičce/na stránce (router meta.title nebo skutečný nadpis). */
  heading: RegExp
  /** Stránky s operativním layoutem (bez sidebaru) nebo jinými zvláštnostmi. */
  operational?: boolean
  /** Očekávané HTTP statusy (např. 403 z /attendance/current pro Ownera bez záznamu zaměstnance). */
  allowStatus?: number[]
}

/**
 * Všechny přihlášené routy dostupné demo účtu (Owner + všechny moduly)
 * — zdroj: src/router/index.ts. Detailové routy s :id řeší modulové testy.
 */
export const APP_ROUTES: AppRoute[] = [
  { path: '/app', heading: /Dnes ve firmě|Přehled/ },
  { path: '/app/faktury', heading: /Faktury/ },
  { path: '/app/faktury/editor', heading: /faktur|Editor/i },
  { path: '/app/opakovane-faktury', heading: /Opakované faktury/ },
  { path: '/app/konsolidace', heading: /Porovnání poboček/ },
  { path: '/app/provozni-prehled', heading: /Výsledky provozu|Provozní/ },
  { path: '/app/uzaverka', heading: /uzávěrka/i },
  { path: '/app/cashflow', heading: /Pohledávky a peníze/ },
  { path: '/app/uctarna', heading: /účetní|Účtárna/i },
  { path: '/app/dph', heading: /DPH/ },
  { path: '/app/vernost', heading: /Věrnost/ },
  { path: '/app/akce-ceny', heading: /Akce a ceny/ },
  { path: '/app/zakazky', heading: /Zakázky/ },
  { path: '/app/cenik-sluzeb', heading: /Ceník služeb/ },
  { path: '/app/podpisy', heading: /podpisy/i },
  { path: '/app/nabidky', heading: /Nabídky/ },
  { path: '/app/klienti', heading: /Klienti/ },
  { path: '/app/import', heading: /Nahrát data|Import/ },
  { path: '/app/import/faktury', heading: /Import faktur/ },
  { path: '/app/pokladna', heading: /Pokladna/ },
  { path: '/app/sklad', heading: /Produkty a menu|Sklad/ },
  { path: '/app/kategorie', heading: /Kategorie/ },
  { path: '/app/modifikatory', heading: /Volby k produktům|Modifikátory/ },
  { path: '/app/zasoby', heading: /Stav skladu|Zásoby/ },
  { path: '/app/naskladneni', heading: /Příjem zboží|Naskladnění/ },
  { path: '/app/skladove-doklady', heading: /Skladové doklady/ },
  { path: '/app/dodavatele', heading: /Dodavatelé/ },
  { path: '/app/nakupni-objednavky', heading: /Nákupní objednávky/ },
  // 403 z GET /attendance/current je platný stav „Owner není evidovaný zaměstnanec" — UI ho ošetřuje.
  { path: '/app/dochazka', heading: /Docházka/, allowStatus: [403] },
  { path: '/app/smeny', heading: /Plán směn|Směny/ },
  { path: '/app/pobocky', heading: /Pobočky/ },
  { path: '/app/audit', heading: /Historie změn|Audit/ },
  { path: '/app/schvalovani', heading: /Schvalování/ },
  { path: '/app/rezervace', heading: /Rezervace/ },
  { path: '/app/restaurace', heading: /Stoly a objednávky|Restaurace/, operational: true },
  { path: '/app/kuchyne', heading: /Kuchy/ },
  { path: '/app/mapa-stolu', heading: /stolů|Mapa/i },
  // 404 z /growth/partner-profile a /subscription-claims/me je designový empty state (firma nemá
  // partnerský profil ani akviziční nárok) — FE ho polyká a ukáže prázdný stav.
  { path: '/app/nastaveni', heading: /Nastavení/, allowStatus: [404] },
  { path: '/app/nastaveni/api-webhooky', heading: /Propojení pro vývojáře|API/ },
  { path: '/app/pruvodce', heading: /Průvodce/ },
  { path: '/app/predplatne', heading: /Předplatné/ },
]

/** Počká, až se stránka ustálí (síť v klidu, žádný globální spinner). */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
}

/** Odbaví cookie banner ještě před načtením appky (stejný klíč jako e2e/helpers/cookies.ts). */
export async function dismissCookies(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'vystaveno.cookieConsent.v1',
        JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-01-01T00:00:00.000Z' }),
      )
    } catch {
      /* banner zůstane — testy ho zachytí */
    }
  })
}

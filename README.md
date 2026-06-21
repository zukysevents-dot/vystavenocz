# Vystaveno.cz — frontend (Vue 3)

Fakturační SaaS pro OSVČ a živnostníky. Tohle je **frontend-only MVP** ve Vue 3 — migrace ze staré
React aplikace. Data zatím žijí v `localStorage` přes mock datovou vrstvu, která je připravená na
napojení na budoucí API (`vystaveno-api`).

> Větev `main` v repu = **stará React appka** (jen reference). Vývoj probíhá na samostatných větvích
> (např. `dev/01-init-vue3`).

## Stack

- **Vue 3** (`<script setup>` SFC) + **TypeScript**
- **Vite** (build, dev server) · package manager **npm**
- **Pinia** (state) · **Vue Router** (routing)
- **Tailwind CSS v4** + design tokeny · **reka-ui** (UI primitiva, ARIA-ready)
- **vee-validate + zod** (formuláře a validace)
- **vitest** (unit) · **Playwright** + **axe-core** (e2e a a11y)

## Rychlý start

```bash
npm ci
npm run dev        # vývojový server (http://localhost:5173)
```

Další příkazy:

```bash
npm run build      # produkční build včetně typecheck (vue-tsc)
npm run lint       # ESLint
npm run format     # Prettier
npm run test       # vitest – unit testy
npm run test:e2e   # Playwright – e2e + a11y (sám si spustí dev server)
```

### Konfigurace

Zkopíruj `.env.example` do `.env`. Jediná proměnná je `VITE_API_URL`:

- **prázdná** = mock datová vrstva přes `localStorage` (výchozí pro MVP)
- **vyplněná** = (do budoucna) reálné API `vystaveno-api`

## Struktura projektu

```
src/
├── assets/          # styly (main.css s design tokeny), fonty, obrázky
├── components/
│   ├── ui/          # UI primitiva (Button, Input, Dialog… – reka-ui + cva)
│   ├── app/         # komponenty aplikace (InvoiceDocument, AppSidebar, PaywallDialog…)
│   └── landing/     # sekce veřejného webu (Hero, PricingSection, FAQ…)
├── composables/     # znovupoužitelná logika (useApi, useInvoices, useClients, useSubscription…)
├── layouts/         # AppLayout / PublicLayout / AuthLayout
├── lib/             # čistá doménová logika a utility (invoice.ts, pricing.ts, types.ts, seed.ts…)
├── pages/           # stránky napojené na routy
├── router/          # definice rout + route guardy
└── stores/          # Pinia stores (auth, company, clients, invoices, subscription, ui)
```

## Datová vrstva (mock → API)

Všechna data jdou přes **jediný swap-point**: [`src/composables/useApi.ts`](src/composables/useApi.ts).

- Dnes čte a zapisuje do `localStorage` (klíče s prefixem `vystaveno:`).
- Metody jsou `async` (`list/get/create/update/remove`), aby přechod na `fetch()` nevyžadoval změnu
  volajících (`useInvoices`, `useClients`, stores).
- **Plán napojení na `vystaveno-api`:** až bude `VITE_API_URL` nastavené, v `useApi` se vrátí
  implementace nad `fetch()` proti `API_URL/<collection>`. Rozhraní zůstane stejné, zbytek appky
  se nemění.
- Stores `auth` / `company` / `subscription` drží „session/profil" stav a píší do `localStorage`
  přímo (mimo `useApi`); kolekce `clients` / `invoices` jdou přes `useApi`.
- [`src/lib/seed.ts`](src/lib/seed.ts) naseeduje demo data (klienti + faktury) při prázdné DB —
  jen pro vývoj, po napojení API se odstraní.

## Konvence

- **Komunikace** s uživatelem **česky**, **kód a identifikátory anglicky**.
- **Komponenty:** `PascalCase.vue`, `<script setup lang="ts">`. UI primitiva v `components/ui/*`
  mají záměrně jednoslovné názvy (Button, Card…). Stránky končí na `…Page.vue`.
- **Stores (Pinia):** setup-store styl s `init()` (lazy načtení z `localStorage`) a `persist()`.
- **Routy:** v [`src/router/index.ts`](src/router/index.ts), `meta` nese `title` / `layout`
  (`public` | `app` | `auth`) / `requiresAuth`; chráněné `/app/*` řeší route guard.
- **Ceny tarifu** jsou na jednom místě: [`src/lib/pricing.ts`](src/lib/pricing.ts).
- **Fakturační výpočty** (DPH, zaokrouhlení, číslo faktury, VS, IBAN/QR) v
  [`src/lib/invoice.ts`](src/lib/invoice.ts).

## Testování

- **Unit (vitest):** `*.spec.ts` vedle zdroje (např. `src/lib/invoice.spec.ts`). Pokrývají
  finančně/přístupově kritickou logiku. Spouští `npm run test`.
- **E2E (Playwright):** v [`e2e/`](e2e/). Seed `localStorage` přes
  [`e2e/helpers/seed.ts`](e2e/helpers/seed.ts) (auth/firma/předplatné/klienti). Spouští
  `npm run test:e2e` (Playwright si sám nastartuje dev server).
- **Přístupnost:** [`e2e/a11y.spec.ts`](e2e/a11y.spec.ts) — axe-core scan produktových obrazovek,
  gate na žádná serious/critical WCAG AA porušení.

## PWA a přístupnost

- **PWA:** instalovatelná appka — manifest a ikony v `public/`, service worker generuje
  `vite-plugin-pwa` (precache app shellu). Aktivní v produkčním buildu.
- **Přístupnost:** design tokeny splňují WCAG AA kontrast; focus stavy, ARIA a klávesová navigace
  přes reka-ui; a11y hlídá axe v e2e sadě.

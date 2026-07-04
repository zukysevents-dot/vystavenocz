# AGENTS.md — Vystaveno.cz (frontend)

Pro AI coding agenty (Codex, Claude, …). Shrnuje, co **není zřejmé jen z kódu**.
Podrobná pravidla stylu a způsobu práce jsou v **[CLAUDE.md](CLAUDE.md)** — platí i pro tebe, přečti si ji.

## Co to je

Vystaveno.cz — fakturační + pokladní (POS) / gastro SaaS pro malé české firmy.
Tento repozitář = **frontend**: Vue 3 (`<script setup>` SFC) + Vite + TypeScript, package manager **npm**.
Migrace ze staré React appky (zazálohovaná ve větvi `legacy-react`, nevracet do working tree).

## Dva repozitáře, jeden produkt

- **`vystavenocz`** (tento) — frontend (Vue).
- **`vystaveno-api`** (samostatný repozitář) — backend: .NET / ASP.NET Core + PostgreSQL + EF Core. Při vývoji leží vedle jako `../vystaveno-api`.

Frontend volá backend přes **same-origin `/api/v1`** (žádné CORS).
Datový kontrakt: `src/lib/types.ts` (FE) musí sedět s DTO na backendu; sdílené kontrakty jsou popsané v `docs/backend/*.md`.
**Když měníš tvar přenášených dat, uprav OBĚ strany** (FE typy + BE DTO) a případně kontrakt v `docs/backend/`.

## Dva režimy (důležité)

`src/composables/useApi.ts` je swap-point mezi daty:

- `VITE_API_URL` prázdné → **mock režim** (localStorage). Takhle běží e2e testy i offline demo.
- `VITE_API_URL` nastavené → **API režim** (reálný backend). POS / Pokladna / Uzávěrka fungují jen v API režimu (v mocku zobrazí „potřebuje server").

## Build / lint / test

```bash
npm install
npm run dev        # dev server
npm run build      # build + typecheck (vue-tsc)
npm run lint
npm run format
npx vitest run     # unit testy
npx playwright test  # e2e (mock režim, seed v e2e/helpers/seed.ts)
```

**Definice „hotovo":** `npm run build` + `npm run lint` + `npx vitest run` projdou; u UI flow i `npx playwright test`. Bez lokálního Node jde vše přes `npx`.

## Deploy (produkce = VPS, ne Vercel/Render)

Produkce běží na vlastním VPS (OVH), Docker stack: Caddy (TLS) → nginx (SPA statika + reverse-proxy `/api`) → .NET API → PostgreSQL.
Deploy soubory jsou v TOMTO repu (`Dockerfile`, `docker-compose*.yml`, `nginx.conf`, `Caddyfile`); API se builduje ze sousedního `../vystaveno-api` (musí ležet vedle).

Deploy je **pull-based** — po merge do `main` se samo NIC nenasadí. Uživatel to pouští ručně na VPS:

```bash
cd ~/vystavenocz && git pull
cd ~/vystaveno-api && git pull
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1   # VPS nemá IPv6, jinak build API padá na stahování
cd ~/vystavenocz && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
```

`Dockerfile` zapéká `ARG VITE_API_URL=/api/v1` do buildu → přebíjí `.env.production` (ten je pro VPS irelevantní, needituj ho kvůli produkci).
Migrace databáze naskočí samy při startu API. Ověření živého stavu: `curl https://vystaveno.cz/health/ready` → 200 „Healthy".

## Konvence (dodržuj)

- **S uživatelem komunikuj česky, kód a identifikátory anglicky.** Uživatel je netechnický — vysvětluj polopaticky, po jednom kroku.
- **Necommituj ani nepushuj bez výslovného souhlasu uživatele.** Pracuje se na feature větvích, PR do `main`.
- **Do commit zpráv NEDÁVAT AI/„Co-Authored-By" trailer.**
- Minimální zásah, drž se stávajícího stylu, nerefaktoruj, co není rozbité (viz [CLAUDE.md](CLAUDE.md) §2–3).

## Ověřování backendu bez lokálního .NET

.NET není potřeba instalovat — backend (`../vystaveno-api`) se dá buildit, migrovat i testovat v Docker SDK kontejneru. Postup je v `AGENTS.md` uvnitř repa `vystaveno-api`.

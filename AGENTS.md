# AGENTS.md — Vystaveno.cz (frontend)

Pro AI coding agenty (Codex, Claude, …). Shrnuje, co **není zřejmé jen z kódu**.
Podrobná pravidla stylu a způsobu práce jsou v **[CLAUDE.md](CLAUDE.md)** — platí i pro tebe, přečti si ji.

## Kontext pro AI agenty

`AGENTS.md` je hlavní společný kontext pro Codex a ostatní AI coding agenty. `CLAUDE.md` je Claude Code vstup se stejnými závaznými pravidly pro práci.
Při každé smysluplné změně projektu aktualizuj **oba soubory**, aby se při přepínání mezi Codexem a Claude Code neztratil kontext.

Za smysluplnou změnu se bere hlavně: architektura, doménový model, modulový systém, API kontrakty, deploy postup, bezpečnostní pravidla, workflow vývoje, testovací brány a důležitá produktová rozhodnutí.

## Co to je

Vystaveno.cz — fakturační + pokladní (POS) / gastro SaaS pro malé české firmy.
Tento repozitář = **frontend**: Vue 3 (`<script setup>` SFC) + Vite + TypeScript, package manager **npm**.
Migrace ze staré React appky (zazálohovaná ve větvi `legacy-react`, nevracet do working tree).

Produktová roadmapa modulárního Vystaveno + gastro priority je v `docs/product/modular-business-roadmap.md`. Při změně zásadního produktového směru ji aktualizuj společně s tímto kontextem.

Modulární runtime základ: backend `/me` vrací `modules` + `features`; frontend je drží v `src/stores/auth.ts` a app shell filtruje navigaci/routy přes `src/lib/modules.ts`. Backend ukládá tenant-selected moduly v `company_modules`; staré firmy bez řádků mají fallback na všechny default moduly. Onboarding vybírá první modulový balíček podle typu podnikání a `Nastavení firmy` umožňuje pozdější změnu modulů přes `/company/modules`. Modul `core` je povinný a normalizace ho vždy doplní.

Gastro receptury/BOM: editor je v `Sklad / katalog` jako akce u produktu (`ProductRecipeDialog.vue`) a volá `GET/PUT/DELETE /api/v1/products/{productId}/recipe`. Backend API/migrace žije ve `vystaveno-api`; backend PR #153 zapíná odečet surovin při POS i restaurant payment prodeji. Produkt s recepturou odečítá suroviny, produkt bez receptury dál odečítá sám sebe; storno vrací původní skladové pohyby, ne aktuální recepturu. Řádek receptury má `quantity` (čistá porce), `wastePercent` (odpad/výtěžnost navíc) a `effectiveQuantity` (skladová spotřeba). Dialog receptury počítá živě náklady, prodejní cenu, marži a food cost z effective quantity pro okamžitou kontrolu profitability.

Skladové zrcadlo: backend PR #154 přidává `GET /api/v1/inventory/stock-mirror`; frontend panel je třetí tab `Zrcadlo` na stránce `Zásoby`. UI musí jasně ukazovat `Stav má být`, `Realita` a `Rozdíl`; rozdíl se skládá z korekcí a inventur. Backend PR #157 přidává `unitCost` a `varianceValue`; UI zobrazuje rozdíl v kusech i Kč. Backend PR #158 mění `unitCost` na vážený průměr nákupních cen z příjemek do konce období s fallbackem na nákupní cenu produktu. Zrcadlo v `Zásoby` posílá filtry `from`, `to`, `locationId` a `search`, aby šlo kontrolovat konkrétní den/pobočku/bar. Ruční výdej v `Zásoby` posílá `type` (`Issue`, `WriteOff`, `StaffMeal`, `Breakage`, `Expiration`) a historie ukazuje český důvod pohybu. Přesunový dialog v `Zásoby` volá `POST /inventory/transfers`, backend zapisuje `TransferOut` + `TransferIn`; celkový stav firmy se nemění, ale zrcadlo filtrované podle pobočky ukazuje odchozí/příchozí množství.

Inventura v `Zásoby` musí obsluze ukazovat stejný slovník jako zrcadlo: `Stav má být` = systémový stav před uložením, `Realita` = fyzicky napočítáno, `Rozdíl` = realita minus systém. Ukládá se celá inventura přes `/inventory/stocktake`; hledání v dialogu jen filtruje pohled.

Nákupní příjemky: backend PR #156 přidává `POST/GET /api/v1/inventory/purchase-receipts` jako atomický skladový doklad. Frontend `Naskladnění` ukládá hlavičku příjemky, řádky s množstvím a volitelnou nákupní cenou; sklad se mění přes příjemku, ne přes anonymní ruční příjem.

Uzávěrka: zavřený den na stránce `Uzávěrka` nabízí běžný čitelný CSV export Z-reportu i účetní CSV export (`src/lib/day-close-export.ts`) se stabilními sloupci pro DPH, platby, spropitné, slevy/storna, prodané produkty a hotovostní rozdíl. Tlačítko `Export měsíc účetní CSV` používá backend `GET /api/v1/day-close?from=&to=&locationId=` a stáhne všechny uzavřené Z-reporty z vybraného měsíce/provozovny do jednoho účetního souboru.

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

## Deploy (produkce = VPS only)

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
- Uživatel dal souhlas průběžně commitovat a pushovat dokončené změny. Stále pracuj na feature větvích a přes PR do `main`; nepushuj přímo do `main`, pokud si to výslovně neřekne.
- **Do commit zpráv NEDÁVAT AI/„Co-Authored-By" trailer.**
- Minimální zásah, drž se stávajícího stylu, nerefaktoruj, co není rozbité (viz [CLAUDE.md](CLAUDE.md) §2–3).

## Ověřování backendu bez lokálního .NET

.NET není potřeba instalovat — backend (`../vystaveno-api`) se dá buildit, migrovat i testovat v Docker SDK kontejneru. Postup je v `AGENTS.md` uvnitř repa `vystaveno-api`.

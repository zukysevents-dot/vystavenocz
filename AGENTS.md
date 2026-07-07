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
Jednoduchý uživatelský manuál pro gastro je v `docs/product/gastro-user-manual.md`; při každé uživatelsky viditelné gastro změně ho aktualizuj tak, aby obsluha pochopila workflow bez technických znalostí.
Claude Code continuation prompt pro samostatnou pipeline práci nad gastro roadmapou je v `docs/agent-workflow/claude-gastro-pipeline-prompt.md`; používej ho při předávání práce do Claude Code nebo po delší pauze.

Modulární runtime základ: backend `/me` vrací `modules` + `features`; frontend je drží v `src/stores/auth.ts` a app shell filtruje navigaci/routy přes `src/lib/modules.ts`. Backend ukládá tenant-selected moduly v `company_modules`; staré firmy bez řádků mají fallback na všechny default moduly. Onboarding vybírá první modulový balíček podle typu podnikání a ukazuje profilový checklist `setupSteps`; po uložení pošle firmu na první doporučený krok (Gastro začíná v `Pobočky`). `Nastavení firmy` umožňuje pozdější změnu modulů přes `/company/modules`. Modul `core` je povinný a normalizace ho vždy doplní.

Stav integrací: `Nastavení firmy` má sekci `Integrace a exporty`, která pravdivě rozlišuje připravené exporty (ISDOC/CSV faktury, Z-reporty), manuální terminálový krok a exportní režim POHODA/Flexi. Nepiš do UI ani dokumentace, že terminál, POHODA nebo Flexi běží přímou synchronizací, dokud nevznikne skutečný konektor.

Veřejný slug firmy: `Nastavení firmy` ukládá `Company.publicSlug` přes `/company`; frontend ho normalizuje na malá ASCII písmena, čísla a pomlčky. Slug je sdílený základ pro `/objednavka/:slug`, veřejné rezervace a QR odkazy ke stolům.

QR objednávka ke stolu: veřejná route `/objednavka/:slug?table=<tableId>&name=<tableName>` schová výdej/rozvoz, odešle `tableId` přes `usePublicOrders` a backend objednávku připíše do dine-in účtu stolu. Na mobilu `PublicOrderPage` po přidání položek ukazuje sticky spodní košík s počtem položek, totalem a skokem na checkout. E2E `e2e/public-order-table.spec.ts` ověřuje hostovský table-link flow bez JWT.

Produktové alergeny: backend PR #208 přidává `Product.Allergens` jako číselník 1–14 (validace rozsahu a duplicit, normalizace vzestupně) a vrací ho i ve veřejném menu `GET /api/v1/public/{slug}/menu`. Frontend číselník je v `src/lib/allergens.ts`; `Sklad / katalog` ukládá alergeny v product create/update payloadu a `PublicOrderPage.vue` je zobrazuje hostovi u položky menu. Alergeny jsou informační/legal text, neovlivňují cenu, sklad, receptury ani modifikátory.

Gastro receptury/BOM: editor je v `Sklad / katalog` jako akce u produktu (`ProductRecipeDialog.vue`) a volá `GET/PUT/DELETE /api/v1/products/{productId}/recipe`. Backend API/migrace žije ve `vystaveno-api`; backend PR #153 zapíná odečet surovin při POS i restaurant payment prodeji. Produkt s recepturou odečítá suroviny, produkt bez receptury dál odečítá sám sebe; storno vrací původní skladové pohyby, ne aktuální recepturu. Řádek receptury má `quantity` (čistá porce), `wastePercent` (odpad/výtěžnost navíc) a `effectiveQuantity` (skladová spotřeba). Dialog receptury počítá živě náklady, prodejní cenu, marži a food cost z effective quantity pro okamžitou kontrolu profitability.

Gastro modifikátory: `/app/modifikatory` (modul `stock`) spravuje sdílené skupiny modifikátorů přes `src/composables/useModifierGroups.ts` a backend `GET/POST/PUT/DELETE /api/v1/modifier-groups`. Skupina má typ `Single`/`Multi`, povinnost, volby a příplatky. Přiřazení skupin k produktu řeší `ProductModifiersDialog.vue` v katalogu `Sklad / katalog` přes `GET/PUT /api/v1/products/{productId}/modifier-groups`; backend kontrakt bere `{ groups: [{ modifierGroupId, sortOrder }] }`. Výběr při účtování obsluhou je v `ModifierSelectDialog.vue`: `RestauracePage.vue` před přidáním produktu načte/cachuje přiřazené skupiny, vynutí required/single/multi/maxSelect a volá `useOrders.addItem(..., { modifierOptionIds })`. Stejný dialog používá `PublicOrderPage.vue` pro veřejné/QR objednávky: produkt z menu nese `modifierGroups`, košík drží samostatné řádky podle `productId + modifierOptionIds` a `usePublicOrders.order` posílá `modifierOptionIds` v položkách. `OrderItemLine.modifiers`/`KitchenQueueItem.modifiers`/účtenka jsou jen zobrazovací rozpad; cena už je v backendem vrácené `unitPrice`/`lineTotal`, nikdy ji nepřičítat podruhé.

Gastro pilot smoke: `e2e/gastro-pilot-smoke.spec.ts` je rychlá end-to-end brána přes otevřený účet u stolu, kuchyňský bon s modifikátory, platbu kartou a nenulovou otevřenou `Uzávěrku` včetně DPH a prodaného produktu. Spouštěj ji po změnách v `Restaurace`, `Kuchyně`, `Uzávěrka`, `useOrders`, `useKitchen`, `useSalesReport` nebo v gastro platebním toku.

Skladové zrcadlo: backend PR #154 přidává `GET /api/v1/inventory/stock-mirror`; frontend panel je třetí tab `Zrcadlo` na stránce `Zásoby`. UI musí jasně ukazovat `Stav má být`, `Realita` a `Rozdíl`; rozdíl se skládá z korekcí a inventur. Detail řádku vysvětluje obsluze vzorec otevření + příjem + storno - prodej - výdej = stav má být a korekce + inventura = rozdíl. Backend PR #157 přidává `unitCost` a `varianceValue`; UI zobrazuje rozdíl v kusech i Kč. Backend PR #158 mění `unitCost` na vážený průměr nákupních cen z příjemek do konce období s fallbackem na nákupní cenu produktu. Zrcadlo v `Zásoby` posílá filtry `from`, `to`, `locationId` a `search`, aby šlo kontrolovat konkrétní den/pobočku/bar. Ruční výdej v `Zásoby` posílá `type` (`Issue`, `WriteOff`, `StaffMeal`, `Breakage`, `Expiration`) a historie ukazuje český důvod pohybu. Přesunový dialog v `Zásoby` volá `POST /inventory/transfers`, backend zapisuje `TransferOut` + `TransferIn`; celkový stav firmy se nemění, ale zrcadlo filtrované podle pobočky ukazuje odchozí/příchozí množství. Backend location-stock foundation ukládá `stock_levels` per `locationId`; frontend `Zásoby` má výběr `Pobočka skladu`, `GET /inventory/stock-levels?locationId=` používá pro pobočkové stavy a příjem/výdej/korekce/inventura posílají `locationId`. Pokud má firma víc poboček a je vybráno `Všechny pobočky`, ruční skladová akce se zablokuje a obsluha musí vybrat konkrétní pobočku. E2E `e2e/stock-mirror-smoke.spec.ts` hlídá slovník `Stav má být`/`Realita`/`Rozdíl`, filtrování a vysvětlení rozdílu v detailu; spouštěj ho po změnách v `Zásoby`, `useInventory`, zrcadle nebo inventuře.

Inventura v `Zásoby` musí obsluze ukazovat stejný slovník jako zrcadlo: `Stav má být` = systémový stav před uložením, `Realita` = fyzicky napočítáno, `Rozdíl` = realita minus systém. Ukládá se celá inventura přes `/inventory/stocktake`; hledání v dialogu jen filtruje pohled.

Nákupní příjemky: backend PR #156 přidává `POST/GET /api/v1/inventory/purchase-receipts` jako atomický skladový doklad. Frontend `Naskladnění` ukládá hlavičku příjemky, řádky s množstvím a volitelnou nákupní cenou; sklad se mění přes příjemku, ne přes anonymní ruční příjem. `Naskladnění` je pobočkové jako `Zásoby`: u víc poboček výběr `Pobočka skladu`, reads (stav/doporučení/poslední příjemky) filtrují `locationId`, uložení příjemky posílá konkrétní `locationId` a při `Všechny pobočky` se zablokuje. Backend `GET /inventory/purchase-receipts` má volitelný `locationId` filtr přes sdílený `LocationScope.ResolveForReadAsync` (scoped člen jen svou pobočku → cizí 403, neexistující 422).

Nákupní doporučení: backend `GET /api/v1/inventory/purchase-suggestions` doporučuje doobjednání z aktuálního skladu, minim, skutečné spotřeby a receptur; frontend `Naskladnění` používá backend doporučení pro blok `K doobjednání` a umí položku rovnou přidat na příjemku. Když endpoint není dostupný, stránka nespadne a použije starý minimový fallback.

Import katalogu z konkurenční pokladny: `src/import/adapters/pos-products.ts` registruje frontend-only produktové adaptery pro Dotykačka, Storyous/Teya a iKelp CSV/XLSX exporty. Scope je jen katalog/menu: název, PLU/SKU, EAN, prodejní cena, DPH, nákupní cena, kategorie a množství skladem. Commit jde přes existující import pipeline, produktový CRUD, kategorii a příjemku; žádný nový backend import endpoint není potřeba. Neimportuje historické prodeje, účtenky, mapy stolů, modifikátory, alergeny, cenové hladiny ani live POS sync — to je samostatný budoucí backend+FE návrh.

Pobočkové skladové stavy: backend větev `feat/location-stock-balances` mění `StockLevel` na per-location stav a přidává `locationId` filtr pro `GET /api/v1/inventory/stock-levels`, detail stavu produktu a `low-stock`. Frontend má výběr pobočky v `Zásoby` (stav, low-stock, ruční operace) i v `Naskladnění` (příjemky, doporučení); bez filtru API vrací celofiremní součet.

Centrální sklad (přehled napříč pobočkami): backend `GET /api/v1/inventory/stock-by-location` (read-only, `Inventory.Read`, bez migrace) vrací matici produkt × pobočka (hlavička `locations` + stránkované `products` řádky s `totalQuantity` a řídkými `cells`). `locationId=null` = sloupec „Nezařazeno"; scope přes `LocationScope.ResolveForReadAsync`. Frontend `Zásoby` má tab `Podle poboček` (jen při >1 pobočce) — matice v `overflow-x-auto`, lazy load přes `useInventory.stockByLocation`.

Uzávěrka: zavřený den na stránce `Uzávěrka` nabízí běžný čitelný CSV export Z-reportu i účetní CSV export (`src/lib/day-close-export.ts`) se stabilními sloupci pro DPH, platby, spropitné, slevy/storna, prodané produkty a hotovostní rozdíl. Hotovostní uzávěrka posílá na backend `cashOpening`, `cashPayIns`, `cashPayOuts`, `cashCountedClosing`, `cashDrop`; backend počítá očekávanou hotovost jako počátek + hotovostní tržby + vklady - výběry - odvod. Backend odmítne zavření dne s otevřenými gastro účty na provozovně (409); `useDayClose` nechává backendovou hlášku projít do toastu, aby obsluha věděla, že má účty doplatit nebo zrušit. `Provozní předávka` na otevřeném i zavřeném dni ukazuje hotovost/kartu/storna a checklist; `Export předávky CSV` přidává řádky `Předal`, `Převzal`, `Poznámka` pro směnové předání bez nové účetní entity. Tlačítko `Export měsíc účetní CSV` používá backend `GET /api/v1/day-close?from=&to=&locationId=` a stáhne všechny uzavřené Z-reporty z vybraného měsíce/provozovny do jednoho účetního souboru; `Export měsíc souhrn CSV` k nim přidává kontrolní jeden-řádek-na-Z-report souhrn se součtovým řádkem `CELKEM`.

Restaurace / účty na stole: `src/pages/RestauracePage.vue` řídí mapu stolů a otevřené účty přes `src/composables/useOrders.ts` (bez Pinia store — zdroj pravdy je backend, po každé akci se volá `refreshOpen()`). Sloučení účtů (backend PR #165) volá `POST /orders/{targetOrderId}/merge` s `{ sourceOrderId }`: položky ze zdrojového účtu se přesunou do cílového (`currentOrder`), zdroj backend nastaví na `Cancelled` a jeho stůl se uvolní, sleva/spropitné zůstávají na cíli a split (rozdělení účtu) se resetuje, takže ho obsluha po sloučení nastavuje znovu. Částečná platba osoby ze split dialogu volá backend PR #168 `POST /orders/{id}/pay-items` přes `ordersApi.payItems(orderId, paymentMethod, [{ itemId, quantity }])`; backend vytvoří normální `Sale`, odečte sklad/receptury jen pro zaplacená množství, na účtu nechá zbytek a split resetuje. Frontend proto po této platbě zavře split dialog, obnoví open orders a pro zbytek účtu musí obsluha split nastavit znovu. Otevřený účet se drží aktuální vůči QR doobjednávkám hosta: `RestauracePage.vue` má `refreshCurrentOrder()`, který běží v 5s intervalu (jen API mód; přeskočí při probíhající akci, otevřeném platebním/split dialogu nebo přepnutém stole) a navíc se forced refresh volá v `openPayment()` před platbou celého účtu — obsluha tak platí a tiskne účtenku podle skutečného stavu, ne podle zastaralého snapshotu. Lokální sleva/spropitné se při refreshi nepřepisují; když účet mezitím uzavře jiný terminál (`status !== Open`), refresh vrátí obsluhu na mapu. Souběžné akce, které backend odmítne s 404/409 protože účet už není otevřený, řeší sdílený helper `handleAccountClosedElsewhere` (hláška „Účet mezitím zaplatil nebo zrušil jiný terminál." + `refreshOpen()` + návrat na mapu) — použitý u `addProduct` a `sendToKitchen`; pay/split/merge mají tuto logiku vlastní, `changeQty`/`saveNote` ho nepoužívají (jejich 409 může znamenat i „položka už odeslána do kuchyně"). E2E `e2e/restaurace-qr-reorder.spec.ts` ověřuje QR doobjednávku v totalu před platbou a `e2e/restaurace-account-closed.spec.ts` graceful 409 při přidání položky (fixture `allowConsoleError` anotace pro očekávaný 4xx network log).
Mobile/tablet waiter flow: `Restaurace` má na malých a tabletových displejích kompaktní seznam stolů (kvůli stolům mimo absolutně pozicovanou mapu) a při otevřeném účtu sticky spodní lištu s názvem stolu, počtem položek, celkem a akcemi `Odeslat`/`Zaplatit`. Vizuální mapa zůstává od `lg` výš. Při dalších úpravách hlídej, aby hlavní akce obsluhy zůstaly dosažitelné bez dlouhého scrollování.

Platební tok: sdílený `src/components/PaymentDialog.vue` používají `Pokladna` (celý košík), `Restaurace` (celý účet) i split dialog (část za osobu). Tok: `Zaplatit` → volba Hotově/Kartou → hotovost = přijatá částka (rychlé volby z `src/lib/payment.ts` `suggestedCashAmounts`) s živým výpočtem vrácení, karta = terminálový krok (terminál zatím není integrovaný — obsluha zadá částku na terminálu ručně a potvrdí `Platba prošla`; Sale vzniká až po potvrzení, žádná platba se nezapisuje předem). `cashReceived` se posílá do `POST /sales`, `/orders/{id}/pay` a `/orders/{id}/pay-items`; backend validuje pokrytí Total (422) a vrací `cashChange`. Účtenka (`SaleReceipt`) tiskne `Přijato / Vráceno`. Při chybě platby zůstává dialog otevřený.

Kuchyně / KDS: `src/pages/KuchynePage.vue` čte `GET /api/v1/kitchen/queue?section=` přes `useKitchen`, seskupuje položky do bonů podle účtu + `kitchenSection`, umí filtry Vše/Kuchyně/Bar, tisk bonu a workflow `Sent → Preparing → Ready → Served`. Bon ukazuje přípravný čas se SLA barvami (bar přísnější než kuchyně); veřejné objednávky bez stolu zobrazuje podle `customerName` + `fulfillment` (`pickup`/`delivery`) a QR objednávky ke stolu podle `tableName`. Přepínač `Živé / Historie` používá backend PR #172 `GET /api/v1/kitchen/history?section=`; historie je read-only, řadí vydané (`Served`) bony nejnovější napřed podle `kitchenStatusUpdatedAt`, ukazuje odesláno/vydáno/dobu přípravy a nepolluje síť každých 5 sekund jako živá fronta.

Veřejné objednávky: route `/objednavka/:slug` (`PublicOrderPage.vue`) používá `usePublicOrders` a public endpointy `GET /public/{slug}/menu` + `POST /public/{slug}/orders` bez JWT. Bez query `table` zákazník vybírá menu do košíku, zvolí `pickup`/`delivery`, vyplní kontakt a objednávka jde rovnou do KDS; ceny vždy počítá backend z katalogu. Produkty s `modifierGroups` otevřou `ModifierSelectDialog`, povinné volby nejdou přeskočit a payload řádku nese `modifierOptionIds`. QR objednávka ke stolu používá `/objednavka/:slug?table=<tableId>&name=<tableName>`, schová volbu výdej/rozvoz, odešle `tableId` a backend objednávku uloží do dine-in účtu stolu; pokud už účet existuje, přidá do něj nové položky. `Mapa stolů` generuje pro vybraný stůl QR kód a kopírovatelný odkaz z `Company.publicSlug` vraceného `/company`.

Audit POS/gastro akcí: backend PR #169 zapisuje append-only audit přes `GET /api/v1/company/audit` pro storno prodeje, změnu slevy/spropitného na otevřeném gastro účtu a uzavření dne/Z-report; backend PR #170 přidává změny prodejní/nákupní ceny a DPH produktu; backend PR #173 přidává query filtr `action=...`. Frontend stránka `src/pages/AuditPage.vue` (`/app/audit`, modul `core`, role Owner/Admin) čte stránkovaný audit přes `useAudit`, zobrazuje české názvy akcí, aktéra, čas, entitu a ne-citlivé detaily z `dataJson` a umí rychle filtrovat klíčové provozní akce.

Schvalování rizikových akcí: backend větev `feat/approval-workflow` přidává `GET/PUT /api/v1/approvals/settings`, `GET /api/v1/approvals`, `POST /api/v1/approvals/{id}/approve|reject` a `202 Accepted` s `ApprovalRequestResponse` pro storno prodeje, ruční výdej/odpis skladu a inventuru nad limitem. Frontend stránka `src/pages/SchvalovaniPage.vue` (`/app/schvalovani`, modul `core`, role Owner/Admin/Manager) spravuje limity a pending/approved/rejected frontu. `useSales.storno`, `useInventory.issue` a `useInventory.stocktake` vrací buď původní výsledek, nebo `ApprovalRequest`; stránky používají `isApprovalRequest` a místo chyby zobrazí toast `čeká na schválení managerem`. E2E `e2e/schvalovani.spec.ts` hlídá manažerskou stranu (nastavení limitů, frontu žádostí a approve/reject workflow) a `e2e/approval-requests-smoke.spec.ts` stranu obsluhy (202 z POS storna, skladového výdeje a inventury zobrazí toast `čeká na schválení managerem`, ověří odeslaný payload a u storna i to, že se akce neprovede a prodej zůstává aktivní). Spouštěj je po změnách ve schvalování, stornech, skladových odpisech nebo inventuře.

Provozní přehled (manažerský dashboard): stránka `src/pages/ProvozniPrehledPage.vue` (`/app/provozni-prehled`, nav+routa pod modulem `reporting`, role Owner/Admin/Manager) čte manažerskou analytiku prodejů přes `src/composables/usePosReports.ts` z backendu `GET /api/v1/pos-reports/summary`, `/revenue`, `/costs`, `/staff`, `/losses` a `/dead-items`. Typy a čistý helper na rozsah období (`posReportRange`) jsou v `src/lib/posReports.ts` (rozsahy z LOKÁLNÍHO data, ne UTC). Stránka ukazuje KPI (tržby, počet účtů, průměrný účet, spropitné, hotově/kartou, slevy, storna), graf tržeb po dnech (reuse `BarChart`), nejprodávanější položky, blok `Marže a food cost` (hrubá marže, food cost %, odhadovaný náklad, tržby mimo katalog a produkty s nejvyšším food costem), blok `Výkon obsluhy` (tržby/účty/průměr/hotovost/karta/tip/slevy/storna, procento slev a procento storen po zaměstnanci včetně `Nepřiřazeno`), blok `Ztráty skladu` (provozní ztráty, inventurní ztráty, nálezy, důvody a největší ztrátové položky v Kč) a blok `Ležáky skladu` (kladný sklad bez prodeje v období, známá skladová hodnota, položky bez nákladové ceny, poslední prodej). Filtr období (dnes/7/30 dní/měsíc) a provozovny. Jen API režim (v mocku „potřebuje server"). Backend agreguje jen dokončené prodeje konzistentně s uzávěrkou dne; oprávnění `pos.reports` má Owner/Admin/Manager. `/costs`, `/losses` a `/dead-items` používají nákladové ceny z receptur/příjemek/nákupních cen jako MVP odhad.

Konsolidace poboček: `src/pages/KonsolidacePage.vue` používá starší `useApi<Sale>('sales')` pro tržby po pobočkách a v API režimu navíc volá `usePosReports` pro každou aktivní pobočku. Čistá logika je v `src/lib/consolidation.ts`: `consolidationReportRange` mapuje zvolené období (`all` nebo `YYYY-MM`) na reportovací rozsah a `buildLocationOperationalComparison` skládá pobočkový řádek z `/summary`, `/costs`, `/losses` a `/dead-items`. UI ukazuje gross margin, food cost, stock losses, dead stock value a margin after losses, s CSV exportem `provozni-srovnani-pobocek.csv`. V mock režimu zůstává jen tržbová konsolidace bez serverových provozních reportů.

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
- E2E může před načtením appky vynutit API režim přes `window.__VYSTAVENO_API_URL__ = '/api/v1'`, aby šlo mockovat serverové endpointy bez produkčního env buildu.

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

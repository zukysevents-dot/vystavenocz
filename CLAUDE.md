# CLAUDE.md

Tradeoff: Tato pravidla preferují opatrnost před rychlostí. U triviálních úkolů použij selský rozum.

## 0. O projektu

**Vystaveno.cz** — migrace ze staré React appky na **Vue 3**, zatím frontend-only MVP.

- **Stack:** Vue 3 (`<script setup>` SFC) + Vite + TypeScript. Package manager **npm**.
- **Komunikace:** s uživatelem **česky**, kód a identifikátory **anglicky**.
- **Příkazy:**
  - `npm run dev` — vývojový server (localhost)
  - `npm run build` — produkční build včetně typecheck (`vue-tsc`)
  - `npm run lint` — ESLint
  - `npm run format` — Prettier
- **Repo:** [github.com/zukysevents-dot/vystavenocz](https://github.com/zukysevents-dot/vystavenocz) — produkční větev `main` = **Vue app**. Stará React appka je zazálohovaná ve větvi `legacy-react` (jen reference, NEvracet do working tree). Vyvíjí se na feature větvích.
- **Plán práce:** GitHub Project #1 — 58 tasků, fáze F0–F8.
- **Produktová roadmapa:** `docs/product/modular-business-roadmap.md` — modulární Vystaveno, gastro priority a konkurenční benchmark.
- **Uživatelský manuál:** `docs/product/gastro-user-manual.md` — jednoduchý český manuál pro gastro obsluhu; při uživatelsky viditelné gastro změně ho aktualizuj společně s kódem.
- **Continuation prompt:** `docs/agent-workflow/claude-gastro-pipeline-prompt.md` — copy-paste prompt pro Claude Code, aby mohl autonomně pokračovat v gastro roadmape přes architect → implement → QA → review → docs → PR workflow.
- **Deploy:** produkce běží pouze na VPS přes Docker stack v tomto repu (`docker-compose*.yml`, `nginx.conf`, `Caddyfile`); deploy je pull-based a nespouští se automaticky po merge.
- **Modulární runtime základ:** `/me` vrací `modules` + `features`; frontend je drží v `src/stores/auth.ts` a app shell filtruje navigaci/routy přes `src/lib/modules.ts`. Backend ukládá tenant-selected moduly v `company_modules`; onboarding ukládá první balíček podle typu podnikání, ukazuje profilový checklist `setupSteps` a po uložení pošle firmu na první doporučený krok (Gastro začíná v `Pobočky`). `Nastavení firmy` umožňuje pozdější změnu modulů přes `/company/modules`. Modul `core` je povinný a normalizace ho vždy doplní.
- **Stav integrací:** `Nastavení firmy` má sekci `Integrace a exporty`, která pravdivě rozlišuje připravené exporty (ISDOC/CSV faktury, Z-reporty), manuální terminálový krok a exportní režim POHODA/Flexi. Nepiš do UI ani dokumentace, že terminál, POHODA nebo Flexi běží přímou synchronizací, dokud nevznikne skutečný konektor.
- **Veřejný slug firmy:** `Nastavení firmy` ukládá `Company.publicSlug` přes `/company`; frontend ho normalizuje na malá ASCII písmena, čísla a pomlčky. Slug je sdílený základ pro `/objednavka/:slug`, veřejné rezervace a QR odkazy ke stolům.
- **QR objednávka ke stolu:** veřejná route `/objednavka/:slug?table=<tableId>&name=<tableName>` schová výdej/rozvoz, odešle `tableId` přes `usePublicOrders` a backend objednávku připíše do dine-in účtu stolu. Na mobilu `PublicOrderPage` po přidání položek ukazuje sticky spodní košík s počtem položek, totalem a skokem na checkout. E2E `e2e/public-order-table.spec.ts` ověřuje hostovský table-link flow bez JWT.
- **Produktové alergeny:** backend PR #208 přidává `Product.Allergens` jako číselník 1–14 (validace rozsahu a duplicit, normalizace vzestupně) a vrací ho i ve veřejném menu `GET /api/v1/public/{slug}/menu`. Frontend číselník je v `src/lib/allergens.ts`; `Sklad / katalog` ukládá alergeny v product create/update payloadu a `PublicOrderPage.vue` je zobrazuje hostovi u položky menu. Alergeny jsou informační/legal text, neovlivňují cenu, sklad, receptury ani modifikátory.
- **Gastro receptury/BOM:** editor je v `Sklad / katalog` jako akce u produktu (`ProductRecipeDialog.vue`) a volá `GET/PUT/DELETE /api/v1/products/{productId}/recipe`. Backend PR #153 ve `vystaveno-api` zapíná odečet surovin při POS i restaurant payment prodeji: produkt s recepturou odečítá suroviny, produkt bez receptury dál odečítá sám sebe, storno vrací původní skladové pohyby. Řádek receptury má `quantity` (čistá porce), `wastePercent` (odpad/výtěžnost navíc) a `effectiveQuantity` (skladová spotřeba). Dialog receptury počítá živě náklady, prodejní cenu, marži a food cost z effective quantity pro okamžitou kontrolu profitability.
- **Gastro modifikátory:** `/app/modifikatory` (modul `stock`) spravuje sdílené skupiny přes `src/composables/useModifierGroups.ts` a backend `GET/POST/PUT/DELETE /api/v1/modifier-groups`. Skupina má typ `Single`/`Multi`, povinnost, volby a příplatky. Přiřazení skupin k produktu řeší `ProductModifiersDialog.vue` v katalogu `Sklad / katalog` přes `GET/PUT /api/v1/products/{productId}/modifier-groups`; PUT body je `{ groups: [{ modifierGroupId, sortOrder }] }`. Výběr při účtování obsluhou je v `ModifierSelectDialog.vue`: `RestauracePage.vue` před přidáním produktu načte/cachuje přiřazené skupiny, vynutí required/single/multi/maxSelect a volá `useOrders.addItem(..., { modifierOptionIds })`. Stejný dialog používá `PublicOrderPage.vue` pro veřejné/QR objednávky: produkt z menu nese `modifierGroups`, košík drží samostatné řádky podle `productId + modifierOptionIds` a `usePublicOrders.order` posílá `modifierOptionIds` v položkách. `OrderItemLine.modifiers`/`KitchenQueueItem.modifiers`/účtenka jsou jen zobrazovací rozpad; cena už je v backendem vrácené `unitPrice`/`lineTotal`, nikdy ji nepřičítat podruhé.
- **Gastro pilot smoke:** `e2e/gastro-pilot-smoke.spec.ts` je rychlá end-to-end brána přes otevřený účet u stolu, kuchyňský bon s modifikátory, platbu kartou a nenulovou otevřenou `Uzávěrku` včetně DPH a prodaného produktu. Spouštěj ji po změnách v `Restaurace`, `Kuchyně`, `Uzávěrka`, `useOrders`, `useKitchen`, `useSalesReport` nebo v gastro platebním toku.
- **Skladové zrcadlo:** backend PR #154 přidává `GET /api/v1/inventory/stock-mirror`; frontend panel je třetí tab `Zrcadlo` na stránce `Zásoby`. UI musí jasně ukazovat `Stav má být`, `Realita` a `Rozdíl`; rozdíl se skládá z korekcí a inventur. Detail řádku vysvětluje vzorec otevření + příjem + storno - prodej - výdej = stav má být a korekce + inventura = rozdíl. Backend PR #157 přidává `unitCost` a `varianceValue`; UI zobrazuje rozdíl v kusech i Kč. Backend PR #158 mění `unitCost` na vážený průměr nákupních cen z příjemek do konce období s fallbackem na nákupní cenu produktu. Zrcadlo v `Zásoby` posílá filtry `from`, `to`, `locationId` a `search`, aby šlo kontrolovat konkrétní den/pobočku/bar. Ruční výdej v `Zásoby` posílá `type` (`Issue`, `WriteOff`, `StaffMeal`, `Breakage`, `Expiration`) a historie ukazuje český důvod pohybu. Přesunový dialog v `Zásoby` volá `POST /inventory/transfers`, backend zapisuje `TransferOut` + `TransferIn`; celkový stav firmy se nemění, ale zrcadlo filtrované podle pobočky ukazuje odchozí/příchozí množství. Backend location-stock foundation ukládá `stock_levels` per `locationId`; frontend `Zásoby` má výběr `Pobočka skladu`, `GET /inventory/stock-levels?locationId=` používá pro pobočkové stavy a příjem/výdej/korekce/inventura posílají `locationId`. Pokud má firma víc poboček a je vybráno `Všechny pobočky`, ruční skladová akce se zablokuje a obsluha musí vybrat konkrétní pobočku. E2E `e2e/stock-mirror-smoke.spec.ts` hlídá slovník `Stav má být`/`Realita`/`Rozdíl`, filtrování a vysvětlení rozdílu v detailu; spouštěj ho po změnách v `Zásoby`, `useInventory`, zrcadle nebo inventuře.
- **Inventura:** dialog v `Zásoby` používá stejný slovník jako zrcadlo: `Stav má být` = systémový stav před uložením, `Realita` = fyzicky napočítáno, `Rozdíl` = realita minus systém. Ukládá se celá inventura přes `/inventory/stocktake`; hledání v dialogu jen filtruje pohled.
- **Nákupní příjemky:** backend PR #156 přidává `POST/GET /api/v1/inventory/purchase-receipts` jako atomický skladový doklad. Frontend `Naskladnění` ukládá hlavičku příjemky, řádky s množstvím a volitelnou nákupní cenou; sklad se mění přes příjemku, ne přes anonymní ruční příjem. `Naskladnění` je pobočkové (stejný vzor jako `Zásoby`): u víc poboček má výběr `Pobočka skladu`, stav/doporučení/poslední příjemky se filtrují přes `locationId` a nová příjemka se ukládá na konkrétní pobočku (`Všechny pobočky` uložení zablokuje). Backend `GET /api/v1/inventory/purchase-receipts` dostal volitelný `locationId` filtr (unrestricted člen bez něj vidí celou firmu, scoped člen jen svou pobočku, cizí → 403); sdílený read-filtr `LocationScope.ResolveForReadAsync` je společný se skladem.
- **Nákupní doporučení:** backend `GET /api/v1/inventory/purchase-suggestions` doporučuje doobjednání podle aktuálního skladu, minim, skutečné spotřeby a receptur. Frontend `Naskladnění` tím plní blok `K doobjednání`, ukazuje doporučené množství, denní spotřebu, dny zásoby a odhad ceny a položku umí rovnou přidat na příjemku; při nedostupném endpointu stránka nespadne a použije starý minimový fallback.
- **Import katalogu z konkurenční pokladny:** `src/import/adapters/pos-products.ts` registruje frontend-only produktové adaptery pro Dotykačka, Storyous/Teya a iKelp CSV/XLSX exporty. Scope je jen katalog/menu: název, PLU/SKU, EAN, prodejní cena, DPH, nákupní cena, kategorie a množství skladem. Commit jde přes existující import pipeline, produktový CRUD, kategorii a příjemku; žádný nový backend import endpoint není potřeba. Neimportuje historické prodeje, účtenky, mapy stolů, modifikátory, alergeny, cenové hladiny ani live POS sync — to je samostatný budoucí backend+FE návrh.
- **Pobočkové skladové stavy:** backend větev `feat/location-stock-balances` mění `StockLevel` na per-location stav a přidává `locationId` filtr pro `GET /api/v1/inventory/stock-levels`, detail stavu produktu a `low-stock`. Frontend má výběr pobočky v `Zásoby` (stav, low-stock, ruční skladové operace) i v `Naskladnění` (příjemky, doporučení); bez filtru API vrací celofiremní součet.
- **Centrální sklad (přehled napříč pobočkami):** backend `GET /api/v1/inventory/stock-by-location` (read-only, `Inventory.Read`, bez migrace) vrací matici produkt × pobočka: `{ locations: [{locationId, locationName}], products: PagedResult<{productId, productName, productSku, totalQuantity, cells: [{locationId, quantity}]}> }`. Buňky jsou řídké (jen nenulové), `locationId=null` = sloupec „Nezařazeno", scope přes `LocationScope.ResolveForReadAsync` (scoped člen jen svou pobočku). Frontend má v `Zásoby` tab `Podle poboček` (jen při >1 pobočce) — matice v `overflow-x-auto`, lazy load přes `useInventory.stockByLocation`, řídké buňky doplní 0 podle hlavičky sloupců.
- **Uzávěrka:** zavřený den na stránce `Uzávěrka` nabízí běžný čitelný CSV export Z-reportu i účetní CSV export (`src/lib/day-close-export.ts`) se stabilními sloupci pro DPH, platby, spropitné, slevy/storna, prodané produkty a hotovostní rozdíl. Hotovostní uzávěrka posílá na backend `cashOpening`, `cashPayIns`, `cashPayOuts`, `cashCountedClosing`, `cashDrop`; backend počítá očekávanou hotovost jako počátek + hotovostní tržby + vklady - výběry - odvod. Backend odmítne zavření dne s otevřenými gastro účty na provozovně (409); `useDayClose` nechává backendovou hlášku projít do toastu, aby obsluha věděla, že má účty doplatit nebo zrušit. `Provozní předávka` na otevřeném i zavřeném dni ukazuje hotovost/kartu/storna a checklist; `Export předávky CSV` přidává řádky `Předal`, `Převzal`, `Poznámka` pro směnové předání bez nové účetní entity. Tlačítko `Export měsíc účetní CSV` používá backend `GET /api/v1/day-close?from=&to=&locationId=` a stáhne všechny uzavřené Z-reporty z vybraného měsíce/provozovny do jednoho účetního souboru; `Export měsíc souhrn CSV` k nim přidává kontrolní jeden-řádek-na-Z-report souhrn se součtovým řádkem `CELKEM`.
- **Restaurace / účty na stole:** `src/pages/RestauracePage.vue` řídí mapu stolů a otevřené účty přes `src/composables/useOrders.ts` (bez Pinia store — zdroj pravdy je backend, po akci se volá `refreshOpen()`). Sloučení účtů (backend PR #165) volá `POST /orders/{targetOrderId}/merge` s `{ sourceOrderId }`: položky ze zdrojového účtu se přesunou do cílového (`currentOrder`), zdroj backend nastaví na `Cancelled` a jeho stůl se uvolní, sleva/spropitné zůstávají na cíli a split (rozdělení účtu) se resetuje. Částečná platba osoby ze split dialogu volá backend PR #168 `POST /orders/{id}/pay-items` přes `ordersApi.payItems(orderId, paymentMethod, [{ itemId, quantity }])`; backend vytvoří normální `Sale`, odečte sklad/receptury jen pro zaplacená množství, na účtu nechá zbytek a split resetuje. Frontend po této platbě zavře split dialog, obnoví open orders a pro zbytek účtu musí obsluha split nastavit znovu. Otevřený účet se drží aktuální vůči QR doobjednávkám hosta: `RestauracePage.vue` má `refreshCurrentOrder()`, který běží v 5s intervalu (jen API mód; přeskočí při probíhající akci, otevřeném platebním/split dialogu nebo přepnutém stole) a navíc se forced refresh volá v `openPayment()` před platbou celého účtu — obsluha tak platí a tiskne účtenku podle skutečného stavu, ne podle zastaralého snapshotu. Lokální sleva/spropitné (`accountDiscountPercent`/`tipAmount`) se při refreshi nepřepisují; když účet mezitím uzavře jiný terminál (`status !== Open`), refresh vrátí obsluhu na mapu. Souběžné akce, které backend odmítne s 404/409 protože účet už není otevřený, řeší sdílený helper `handleAccountClosedElsewhere` (hláška „Účet mezitím zaplatil nebo zrušil jiný terminál." + `refreshOpen()` + návrat na mapu) — použitý u `addProduct` a `sendToKitchen` (kde 409 znamená jen zavřený účet); pay/split/merge mají tuto logiku vlastní. `changeQty`/`saveNote` ho nepoužívají, protože jejich 409 může znamenat i „položka už byla odeslána do kuchyně".
- **Mobile/tablet waiter flow:** `Restaurace` má na malých a tabletových displejích kompaktní seznam stolů (kvůli stolům mimo absolutně pozicovanou mapu) a při otevřeném účtu sticky spodní lištu s názvem stolu, počtem položek, celkem a akcemi `Odeslat`/`Zaplatit`. Vizuální mapa zůstává od `lg` výš. Při dalších úpravách hlídej, aby hlavní akce obsluhy zůstaly dosažitelné bez dlouhého scrollování.
- **Kuchyně / KDS:** `src/pages/KuchynePage.vue` čte `GET /api/v1/kitchen/queue?section=` přes `useKitchen`, seskupuje položky do bonů podle účtu + `kitchenSection`, umí filtry Vše/Kuchyně/Bar, tisk bonu a workflow `Sent → Preparing → Ready → Served`. Bon ukazuje přípravný čas se SLA barvami (bar přísnější než kuchyně); veřejné objednávky bez stolu zobrazuje podle `customerName` + `fulfillment` (`pickup`/`delivery`) a QR objednávky ke stolu podle `tableName`. Přepínač `Živé / Historie` používá backend PR #172 `GET /api/v1/kitchen/history?section=`; historie je read-only, řadí vydané (`Served`) bony nejnovější napřed podle `kitchenStatusUpdatedAt`, ukazuje odesláno/vydáno/dobu přípravy a nepolluje síť každých 5 sekund jako živá fronta.
- **Pokladna / rychlé přidání:** `src/pages/PokladnaPage.vue` má pole `Sken / EAN` pro HW/Bluetooth čtečku v režimu klávesnice i tlačítko `Kamera`, které používá sdílený `CameraScanner.vue` s vlastní POS hláškou. Přidání hledá přes exact `Product.ean` (`findByEan`); neznámý EAN a duplicitní EAN zobrazují toast a nepřidávají položku. Vedle toho `Hledat produkt` filtruje dlaždice podle názvu, SKU nebo EAN a kombinuje se s kategorií. E2E `e2e/pokladna-scan.spec.ts` hlídá přidání skenem, navýšení množství opakovaným skenem a hledání podle názvu/SKU/EAN.
- **Veřejné objednávky:** route `/objednavka/:slug` (`PublicOrderPage.vue`) používá `usePublicOrders` a public endpointy `GET /public/{slug}/menu` + `POST /public/{slug}/orders` bez JWT. Bez query `table` zákazník vybírá menu do košíku, zvolí `pickup`/`delivery`, vyplní kontakt a objednávka jde rovnou do KDS; ceny vždy počítá backend z katalogu. Produkty s `modifierGroups` otevřou `ModifierSelectDialog`, povinné volby nejdou přeskočit a payload řádku nese `modifierOptionIds`. QR objednávka ke stolu používá `/objednavka/:slug?table=<tableId>&name=<tableName>`, schová volbu výdej/rozvoz, odešle `tableId` a backend objednávku uloží do dine-in účtu stolu; pokud už účet existuje, přidá do něj nové položky. `Mapa stolů` generuje pro vybraný stůl QR kód a kopírovatelný odkaz z `Company.publicSlug` vraceného `/company`.
- **Audit POS/gastro akcí:** backend PR #169 zapisuje append-only audit přes `GET /api/v1/company/audit` pro storno prodeje, změnu slevy/spropitného na otevřeném gastro účtu a uzavření dne/Z-report; backend PR #170 přidává změny prodejní/nákupní ceny a DPH produktu; backend PR #173 přidává query filtr `action=...`. Frontend stránka `src/pages/AuditPage.vue` (`/app/audit`, modul `core`, role Owner/Admin) čte stránkovaný audit přes `useAudit`, zobrazuje české názvy akcí, aktéra, čas, entitu a ne-citlivé detaily z `dataJson` a umí rychle filtrovat klíčové provozní akce.
- **Schvalování rizikových akcí:** backend větev `feat/approval-workflow` přidává `GET/PUT /api/v1/approvals/settings`, `GET /api/v1/approvals`, `POST /api/v1/approvals/{id}/approve|reject` a `202 Accepted` s `ApprovalRequestResponse` pro storno prodeje, ruční výdej/odpis skladu a inventuru nad limitem. Frontend stránka `src/pages/SchvalovaniPage.vue` (`/app/schvalovani`, modul `core`, role Owner/Admin/Manager) spravuje limity a pending/approved/rejected frontu. `useSales.storno`, `useInventory.issue` a `useInventory.stocktake` vrací buď původní výsledek, nebo `ApprovalRequest`; stránky používají `isApprovalRequest` a místo chyby zobrazí toast `čeká na schválení managerem`. E2E `e2e/schvalovani.spec.ts` hlídá manažerskou stranu (nastavení limitů, frontu žádostí a approve/reject workflow), `e2e/approval-requests-smoke.spec.ts` hlídá 202 toasty ve flows POS storno / skladový výdej / inventura a `e2e/approval-obsluha-smoke.spec.ts` navíc ověřuje stranu obsluhy včetně toho, že 202 akci neprovede hned, prodej zůstane aktivní a skladový výdej posílá správný payload. Spouštěj je po změnách ve schvalování, stornech, skladových odpisech nebo inventuře.
- **Provozní přehled (manažerský dashboard):** `src/pages/ProvozniPrehledPage.vue` (`/app/provozni-prehled`, modul `reporting`, role Owner/Admin/Manager) čte manažerskou analytiku prodejů přes `src/composables/usePosReports.ts` z backendu `GET /api/v1/pos-reports/summary`, `/revenue`, `/costs`, `/staff`, `/losses` a `/dead-items`. Typy + čistý helper `posReportRange` (rozsahy z lokálního data) jsou v `src/lib/posReports.ts`. Ukazuje KPI tržeb a plateb, graf tržeb po dnech (`BarChart`), nejprodávanější položky, blok `Marže a food cost` s hrubou marží, food cost %, odhadovaným nákladem, tržbami mimo katalog a produkty s nejvyšším food costem, blok `Výkon obsluhy` s tržbami/účty/průměrem/platbami/tipy/slevami/storny, procentem slev a procentem storen po zaměstnanci včetně `Nepřiřazeno`, blok `Ztráty skladu` s provozními ztrátami, inventurními ztrátami, nálezy, důvody a největšími ztrátovými položkami v Kč a blok `Ležáky skladu` s kladným skladem bez prodeje v období, známou skladovou hodnotou, položkami bez nákladové ceny a posledním prodejem; filtr období a provozovny. Jen API režim. Backend (oprávnění `pos.reports`, Owner/Admin/Manager) agreguje jen dokončené prodeje konzistentně s uzávěrkou dne; `/costs`, `/losses` a `/dead-items` používají receptury/příjemky/nákupní ceny jako MVP odhad nákladu.
- **Konsolidace poboček:** `src/pages/KonsolidacePage.vue` používá starší `useApi<Sale>('sales')` pro tržby po pobočkách a v API režimu navíc volá `usePosReports` pro každou aktivní pobočku. Čistá logika je v `src/lib/consolidation.ts`: `consolidationReportRange` mapuje zvolené období (`all` nebo `YYYY-MM`) na reportovací rozsah a `buildLocationOperationalComparison` skládá pobočkový řádek z `/summary`, `/costs`, `/losses` a `/dead-items`. UI ukazuje gross margin, food cost, stock losses, dead stock value a margin after losses, s CSV exportem `provozni-srovnani-pobocek.csv`. V mock režimu zůstává jen tržbová konsolidace bez serverových provozních reportů.
- **Git:** uživatel dal souhlas průběžně commitovat a pushovat dokončené změny. Stále pracuj na feature větvích a přes PR do `main`; nepushuj přímo do `main`, pokud si to výslovně neřekne.

## 0.1 Kontext mezi Codexem a Claude Code

**AGENTS.md je hlavní společný kontext pro AI agenty. Tento CLAUDE.md je Claude Code vstup a musí s AGENTS.md zůstat v souladu.**

Při každé smysluplné změně projektu aktualizuj **AGENTS.md i CLAUDE.md**. Platí to hlavně pro architekturu, doménový model, modulový systém, API kontrakty, deploy postup, bezpečnostní pravidla, workflow vývoje, testovací brány a důležitá produktová rozhodnutí.

Když se pravidlo týká všech agentů, napiš ho do AGENTS.md a zrcadli/odkaž ho tady. Když je specifické jen pro Claude Code, může být jen tady, ale nesmí odporovat AGENTS.md.

## 1. Nejdřív přemýšlej, pak piš kód

Nepředpokládej. Neskrývej zmatek. Pojmenuj tradeoffy.

Před implementací:

- Své předpoklady řekni nahlas. Pokud si nejsi jistý, zeptej se.
- Pokud existuje víc možných výkladů, ukaž je — nevybírej potichu.
- Pokud existuje jednodušší cesta, řekni to. Když to dává smysl, oponuj.
- Pokud je něco nejasné, zastav se. Pojmenuj, co tě mate. Zeptej se.

## 2. Nejdřív jednoduchost

Minimum kódu, který řeší daný problém. Nic spekulativního.

- Žádné featury navíc, které nebyly zadány.
- Žádné abstrakce pro kód použitý jen jednou.
- Žádná „flexibilita" nebo „konfigurovatelnost", o kterou nikdo nepožádal.
- Žádné ošetření chyb pro scénáře, které nemůžou nastat.
- Pokud jsi napsal 200 řádek a šlo to na 50, přepiš to.

Zeptej se sám sebe: „Řekl by senior engineer, že je to zbytečně složité?" Pokud ano, zjednoduš.

## 3. Zásahy, opravy a updaty

Sahej jen na to, na co musíš. Uklízej jen po sobě.

Když upravuješ existující kód:

- „Nevylepšuj" sousední kód, komentáře ani formátování.
- Nerefaktoruj věci, které nejsou rozbité.
- Drž se stávajícího stylu, i kdybys to dělal jinak.
- Pokud si všimneš nesouvisejícího mrtvého kódu, zmiň ho — nemaž ho.

Když tvé změny vytvoří „osiřelý" kód:

- Smaž importy / proměnné / funkce, které tvé změny udělaly nepoužívanými.
- Nemaž mrtvý kód, který tu byl už předtím, pokud o to nikdo nepožádá.

Test: Každý změněný řádek by měl jít přímo dohledat k požadavku uživatele.

## 4. Exekuce podle cíle

Definuj kritéria úspěchu. Cyklicky ověřuj, dokud nesedí.

Z úkolů udělej ověřitelné cíle. V tomhle projektu (frontend) ověření typicky znamená:

- **Build projde čistě:** `npm run build` (včetně typecheck) bez chyb.
- **Lint projde:** `npm run lint` bez chyb.
- **Testy projdou:** `npm run test` (vitest unit) a u UI flows `npm run test:e2e` (Playwright).
- **Vypadá to správně:** stránka naběhne v prohlížeči bez chyb v konzoli.
- API e2e flow může před načtením appky nastavit `window.__VYSTAVENO_API_URL__ = '/api/v1'`; produkce dál používá build-time `VITE_API_URL`.

Když task výslovně přidává testy, pak platí: „napiš test, který stav reprodukuje, a doveď ho k zelené."

U vícekrokových úkolů sepiš krátký plán:

```
1. [Krok] → ověření: [kontrola]
2. [Krok] → ověření: [kontrola]
3. [Krok] → ověření: [kontrola]
```

Silná kritéria úspěchu ti umožní pracovat samostatně v cyklu. Slabá kritéria („udělej to, ať to funguje") vyžadují neustálé doptávání.

## 5. Multi-agent pipeline (orchestrace)

U netriviálních úkolů orchestruje hlavní smyčka tyto subagenty (žijí v `.claude/agents/`, lokálně/gitignorováno): `solution-architect`, `qa-tester`, `invoice-code-reviewer`, `debugger`, `a11y-specialist` a `orchestrator` (plánovač). Subagent neumí spustit jiného subagenta — řetězení a předávání kontextu řídí hlavní smyčka.

Default routing podle typu tasku:

- **Nový feature** → `solution-architect` (návrh) → implementace → `qa-tester` → `invoice-code-reviewer`
- **Bug fix** → `debugger` (root cause) → oprava → `qa-tester` → `invoice-code-reviewer`
- **Refactor** → `invoice-code-reviewer` (stav) → `solution-architect` → implementace → `qa-tester`
- **A11y / přístupnost** → `a11y-specialist` (kontrast, focus, ARIA, dark mode) → `qa-tester` (axe e2e regrese)
- **Code review / architektura** → příslušný agent samostatně
- **Nejasný task** → upřesnit PŘED spuštěním pipeline

Pravidla:

- Triviální úkoly (drobná oprava, přejmenování, copy, dep bump) pipeline NEspouštějí — selský rozum (viz tradeoff nahoře).
- Mezi kroky předávej relevantní kontext (nálezy předchozího agenta dalšímu).
- Po pipeline agreguj výstupy agentů a uveď finální doporučení + stav ověření (build / lint / testy).

---

Tato pravidla fungují, když: v diffech je méně zbytečných změn, méně přepisování kvůli překomplikování, a doptávání přichází před implementací, ne až po chybách.

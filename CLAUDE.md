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
- **Deploy:** produkce běží pouze na VPS přes Docker stack v tomto repu (`docker-compose*.yml`, `nginx.conf`, `Caddyfile`); deploy je pull-based a nespouští se automaticky po merge.
- **Modulární runtime základ:** `/me` vrací `modules` + `features`; frontend je drží v `src/stores/auth.ts` a app shell filtruje navigaci/routy přes `src/lib/modules.ts`. Backend ukládá tenant-selected moduly v `company_modules`; onboarding ukládá první balíček podle typu podnikání a `Nastavení firmy` umožňuje pozdější změnu modulů přes `/company/modules`. Modul `core` je povinný a normalizace ho vždy doplní.
- **Gastro receptury/BOM:** editor je v `Sklad / katalog` jako akce u produktu (`ProductRecipeDialog.vue`) a volá `GET/PUT/DELETE /api/v1/products/{productId}/recipe`. Backend PR #153 ve `vystaveno-api` zapíná odečet surovin při POS i restaurant payment prodeji: produkt s recepturou odečítá suroviny, produkt bez receptury dál odečítá sám sebe, storno vrací původní skladové pohyby. Řádek receptury má `quantity` (čistá porce), `wastePercent` (odpad/výtěžnost navíc) a `effectiveQuantity` (skladová spotřeba). Dialog receptury počítá živě náklady, prodejní cenu, marži a food cost z effective quantity pro okamžitou kontrolu profitability.
- **Skladové zrcadlo:** backend PR #154 přidává `GET /api/v1/inventory/stock-mirror`; frontend panel je třetí tab `Zrcadlo` na stránce `Zásoby`. UI musí jasně ukazovat `Stav má být`, `Realita` a `Rozdíl`; rozdíl se skládá z korekcí a inventur. Detail řádku vysvětluje vzorec otevření + příjem + storno - prodej - výdej = stav má být a korekce + inventura = rozdíl. Backend PR #157 přidává `unitCost` a `varianceValue`; UI zobrazuje rozdíl v kusech i Kč. Backend PR #158 mění `unitCost` na vážený průměr nákupních cen z příjemek do konce období s fallbackem na nákupní cenu produktu. Zrcadlo v `Zásoby` posílá filtry `from`, `to`, `locationId` a `search`, aby šlo kontrolovat konkrétní den/pobočku/bar. Ruční výdej v `Zásoby` posílá `type` (`Issue`, `WriteOff`, `StaffMeal`, `Breakage`, `Expiration`) a historie ukazuje český důvod pohybu. Přesunový dialog v `Zásoby` volá `POST /inventory/transfers`, backend zapisuje `TransferOut` + `TransferIn`; celkový stav firmy se nemění, ale zrcadlo filtrované podle pobočky ukazuje odchozí/příchozí množství.
- **Inventura:** dialog v `Zásoby` používá stejný slovník jako zrcadlo: `Stav má být` = systémový stav před uložením, `Realita` = fyzicky napočítáno, `Rozdíl` = realita minus systém. Ukládá se celá inventura přes `/inventory/stocktake`; hledání v dialogu jen filtruje pohled.
- **Nákupní příjemky:** backend PR #156 přidává `POST/GET /api/v1/inventory/purchase-receipts` jako atomický skladový doklad. Frontend `Naskladnění` ukládá hlavičku příjemky, řádky s množstvím a volitelnou nákupní cenou; sklad se mění přes příjemku, ne přes anonymní ruční příjem.
- **Nákupní doporučení:** backend `GET /api/v1/inventory/purchase-suggestions` doporučuje doobjednání podle aktuálního skladu, minim, skutečné spotřeby a receptur. Frontend `Naskladnění` tím plní blok `K doobjednání`, ukazuje doporučené množství, denní spotřebu, dny zásoby a odhad ceny a položku umí rovnou přidat na příjemku; při nedostupném endpointu stránka nespadne a použije starý minimový fallback.
- **Uzávěrka:** zavřený den na stránce `Uzávěrka` nabízí běžný čitelný CSV export Z-reportu i účetní CSV export (`src/lib/day-close-export.ts`) se stabilními sloupci pro DPH, platby, spropitné, slevy/storna, prodané produkty a hotovostní rozdíl. Hotovostní uzávěrka posílá na backend `cashOpening`, `cashPayIns`, `cashPayOuts`, `cashCountedClosing`, `cashDrop`; backend počítá očekávanou hotovost jako počátek + hotovostní tržby + vklady - výběry - odvod. Tlačítko `Export měsíc účetní CSV` používá backend `GET /api/v1/day-close?from=&to=&locationId=` a stáhne všechny uzavřené Z-reporty z vybraného měsíce/provozovny do jednoho účetního souboru.
- **Restaurace / účty na stole:** `src/pages/RestauracePage.vue` řídí mapu stolů a otevřené účty přes `src/composables/useOrders.ts` (bez Pinia store — zdroj pravdy je backend, po akci se volá `refreshOpen()`). Sloučení účtů (backend PR #165) volá `POST /orders/{targetOrderId}/merge` s `{ sourceOrderId }`: položky ze zdrojového účtu se přesunou do cílového (`currentOrder`), zdroj backend nastaví na `Cancelled` a jeho stůl se uvolní, sleva/spropitné zůstávají na cíli a split (rozdělení účtu) se resetuje. Částečná platba osoby ze split dialogu volá backend PR #168 `POST /orders/{id}/pay-items` přes `ordersApi.payItems(orderId, paymentMethod, [{ itemId, quantity }])`; backend vytvoří normální `Sale`, odečte sklad/receptury jen pro zaplacená množství, na účtu nechá zbytek a split resetuje. Frontend po této platbě zavře split dialog, obnoví open orders a pro zbytek účtu musí obsluha split nastavit znovu.
- **Kuchyně / KDS:** `src/pages/KuchynePage.vue` čte `GET /api/v1/kitchen/queue?section=` přes `useKitchen`, seskupuje položky do bonů podle účtu + `kitchenSection`, umí filtry Vše/Kuchyně/Bar, tisk bonu a workflow `Sent → Preparing → Ready → Served`. Bon ukazuje přípravný čas se SLA barvami (bar přísnější než kuchyně) a veřejné objednávky bez stolu zobrazuje podle `customerName` + `fulfillment` (`pickup`/`delivery`). Přepínač `Živé / Historie` používá backend PR #172 `GET /api/v1/kitchen/history?section=`; historie je read-only, řadí vydané (`Served`) bony nejnovější napřed podle `kitchenStatusUpdatedAt`, ukazuje odesláno/vydáno/dobu přípravy a nepolluje síť každých 5 sekund jako živá fronta.
- **Audit POS/gastro akcí:** backend PR #169 zapisuje append-only audit přes `GET /api/v1/company/audit` pro storno prodeje, změnu slevy/spropitného na otevřeném gastro účtu a uzavření dne/Z-report; backend PR #170 přidává změny prodejní/nákupní ceny a DPH produktu; backend PR #173 přidává query filtr `action=...`. Frontend stránka `src/pages/AuditPage.vue` (`/app/audit`, modul `core`, role Owner/Admin) čte stránkovaný audit přes `useAudit`, zobrazuje české názvy akcí, aktéra, čas, entitu a ne-citlivé detaily z `dataJson` a umí rychle filtrovat klíčové provozní akce.
- **Provozní přehled (manažerský dashboard):** `src/pages/ProvozniPrehledPage.vue` (`/app/provozni-prehled`, modul `reporting`, role Owner/Admin/Manager) čte manažerskou analytiku prodejů přes `src/composables/usePosReports.ts` z backendu `GET /api/v1/pos-reports/summary`, `/revenue`, `/costs`, `/staff`, `/losses` a `/dead-items`. Typy + čistý helper `posReportRange` (rozsahy z lokálního data) jsou v `src/lib/posReports.ts`. Ukazuje KPI tržeb a plateb, graf tržeb po dnech (`BarChart`), nejprodávanější položky, blok `Marže a food cost` s hrubou marží, food cost %, odhadovaným nákladem, tržbami mimo katalog a produkty s nejvyšším food costem, blok `Výkon obsluhy` s tržbami/účty/průměrem/platbami/tipy/slevami/storny, procentem slev a procentem storen po zaměstnanci včetně `Nepřiřazeno`, blok `Ztráty skladu` s provozními ztrátami, inventurními ztrátami, nálezy, důvody a největšími ztrátovými položkami v Kč a blok `Ležáky skladu` s kladným skladem bez prodeje v období, známou skladovou hodnotou, položkami bez nákladové ceny a posledním prodejem; filtr období a provozovny. Jen API režim. Backend (oprávnění `pos.reports`, Owner/Admin/Manager) agreguje jen dokončené prodeje konzistentně s uzávěrkou dne; `/costs`, `/losses` a `/dead-items` používají receptury/příjemky/nákupní ceny jako MVP odhad nákladu.
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

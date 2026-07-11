# Opakované faktury V2 — pravidelná fakturace ze šablony (FE↔BE kontrakt)

**Vlastnictví:** oba PR (backend `vystaveno-api`, frontend `vystavenocz`) staví Claude Code v rámci milníku Opakované faktury V2. Tento soubor je **jediný zdroj pravdy** pro seam; obě strany ho drží v souladu a zrcadlí klíčové body do `AGENTS.md` a `CLAUDE.md` obou repozitářů.

**Rozsah:** rozšíření existujícího modulu `invoicing` (default-on) o **šablony pravidelných faktur** (např. měsíční paušál). Firma nastaví šablonu pro klienta, systém ve správný den bezpečně vytvoří fakturu — **bez duplicit, s plným auditem**. **Žádný nový modul ani permission** — reuse modul `invoicing` + `invoices.read`/`invoices.write` (stejný vzor jako Services & Jobs V2 reuse `jobs`). JSON camelCase; enumy jako string. **Výsledná faktura vzniká VÝHRADNĚ přes `InvoiceService.CreateDraftAsync` (+ volitelně `IssueAsync`)** — žádné přímé zakládání faktur v jobu; číslování, DPH i snapshoty tak běží přes stávající fakturační pravidla.

**Vědomě mimo tento milník:** automatické **odeslání e-mailem** ani **napojení platby** se negenerují (viz §11). Interval je zatím **měsíční** (den v měsíci); jiné frekvence jsou připravené v modelu (`intervalMonths`), ale UI nabízí měsíční.

---

## 1. Doménový model

- **`RecurringInvoiceTemplate`** (tenant-owned, soft-delete): `{ id, companyId, clientId (FK Client, povinný), name, intervalMonths (int, default 1), dayOfMonth (1–31; u kratších měsíců clamp na poslední den), dueDays (int ≥ 0), autoIssue (bool, default FALSE), status (Active|Paused), note?, nextRunDate (DateOnly), lastRunAt? (UTC), createdAt, updatedAt }`. Snapshot položek = child tabulka.
- **`RecurringInvoiceTemplateItem`** (child, FK cascade, tenant-owned): `{ id, templateId, description, quantity, unitPrice (NET/bez DPH), vatRate (0|12|21), unit?, sortOrder }`. Snapshot řádků — při generování se 1:1 mapují na `InvoiceLineDto` (DPH/součty dopočítá `InvoiceService`).
- **`RecurringInvoiceRun`** (historie generování, tenant-owned, append-only-ish): `{ id, companyId, templateId, periodKey (string "yyyy-MM"), invoiceId (FK Invoice), autoIssued (bool), generatedAt (UTC), createdAt }`. **UNIQUE index `(companyId, templateId, periodKey)`** = idempotence gate (za jedno období max 1 faktura ze šablony). Slouží i jako odkaz na vytvořené doklady v detailu.
- **`Invoice`** (rozšíření): +nullable FK `recurringInvoiceTemplateId` — vazba faktury na šablonu, ze které vznikla (`ON DELETE NO ACTION`; doklady se stejně nemažou). Faktura tak ví, že je z opakované řady, a šablona najde své doklady.

**Výpočet `nextRunDate` (čisté, testovatelné):** pro daný měsíc `target = new DateOnly(year, month, min(dayOfMonth, daysInMonth(year, month)))`. „Další běh" = přičti `intervalMonths` měsíců k aktuálnímu `nextRunDate` a znovu clampni den. Konec měsíce (31. → 28./29./30.) je explicitní testovaný případ.

## 2. API — `/api/v1/recurring-invoice-templates`

Vše pod modulem `invoicing` (jinak 403). Tenant scope = globální filtr; cizí/neexistující id → 404.

| Metoda   | Cesta                                                      | Policy           | Popis                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/recurring-invoice-templates?status&search&page&pageSize` | `invoices.read`  | Stránkovaný seznam šablon (`PagedResponse<RecurringInvoiceTemplateSummary>`).                                                                                                                                                                |
| `GET`    | `/recurring-invoice-templates/{id}`                        | `invoices.read`  | Detail (hlavička + položky + posledních N `runs` s `invoiceId`/číslem/stavem).                                                                                                                                                               |
| `POST`   | `/recurring-invoice-templates`                             | `invoices.write` | Vytvoří šablonu. Request `{ clientId, name, intervalMonths?, dayOfMonth, dueDays, autoIssue?, note?, startDate?, items[] }`. `status` server-controlled (nová = Active). `nextRunDate` dopočte server ze `startDate ?? dnes` + `dayOfMonth`. |
| `PUT`    | `/recurring-invoice-templates/{id}`                        | `invoices.write` | Upraví hlavičku + **nahradí celý seznam položek**. Změna `dayOfMonth`/`intervalMonths` přepočítá `nextRunDate` do budoucna (nikdy do minulosti).                                                                                             |
| `DELETE` | `/recurring-invoice-templates/{id}`                        | `invoices.write` | Soft-delete (archivace). Už vygenerované faktury zůstávají.                                                                                                                                                                                  |
| `POST`   | `/recurring-invoice-templates/{id}/pause`                  | `invoices.write` | `status → Paused`. Job ji přeskočí. Audit `RecurringTemplatePaused`.                                                                                                                                                                         |
| `POST`   | `/recurring-invoice-templates/{id}/resume`                 | `invoices.write` | `status → Active`; pokud `nextRunDate` v minulosti, posune na nejbližší budoucí výskyt (žádná dávka zpětných faktur). Audit `RecurringTemplateResumed`.                                                                                      |
| `POST`   | `/recurring-invoice-templates/{id}/generate-now`           | `invoices.write` | Ruční „Vygenerovat teď" — vytvoří fakturu pro aktuální due období **stejným jádrem** jako job (sdílí idempotenci). Vrací vytvořenou/existující `InvoiceResponse` (idempotentně).                                                             |

Validace (422): `dayOfMonth` 1–31, `dueDays` 0–365, `intervalMonths` 1–12, `items` neprázdné, `quantity>0`, `unitPrice≥0`, `vatRate ∈ {0,12,21}`, `clientId` existuje.

## 3. Generování faktury — jádro (job i „generate-now" ho sdílí)

`RecurringInvoiceService.GenerateForTemplateAsync(template, runDate, ct)` běží pod tenant kontextem firmy šablony:

0. **Resume pass (crash-recovery pro AutoIssue):** ještě před generováním nového období — pokud `template.autoIssue`, dohledej faktury `WHERE recurringInvoiceTemplateId = template.Id AND status = Draft` a zavolej na ně `IssueAsync` (idempotentní). Řeší pád mezi krokem 6 a 7 (draft vznikl, ale nevystavil se, a `nextRunDate` už je posunutá → jinak by zůstal navždy koncept).
1. `BeginTransaction`; **`RowLock` šablony** (`FOR UPDATE`) — serializuje souběžné workery na téže šabloně. Reload přes EF (globální filtr): `null` (mezitím soft-smazaná) → skip.
2. Guardy: u jobu `status != Active` nebo `nextRunDate > today` → skip (jiný worker posunul / pauza). **Ověř klienta** (`db.Clients.AnyAsync(id)` — globální filtr): pokud byl odběratel mezitím smazán → **Pause šablony** + audit + skip (jinak by run padal každý tick).
3. `periodKey` z **`nextRunDate`** (`yyyy-MM`) — stejně u jobu i manuálu (idempotence gate je jediný zdroj pravdy). Pokud `RecurringInvoiceRun (templateId, periodKey)` už existuje → **už vygenerováno**, defenzivně posuň `nextRunDate`, commit, vrať existující fakturu.
4. `CreateInvoiceRequest` ze snapshot položek (klient, `dueDate = dnes + dueDays`) → **`InvoiceService.CreateDraftAsync(CompanyRole.Owner, Guid.Empty, req)`** (běží v ambientní transakci — nevytváří vlastní). Stampni `Invoice.RecurringInvoiceTemplateId` (ExecuteUpdate ve stejné tx).
5. Vlož `RecurringInvoiceRun` (unique backstop; 23505 → „už vygenerováno"). Posuň `template.nextRunDate` = `advance(dayOfMonth, intervalMonths)` **z `template.dayOfMonth` clampnutého na cílový měsíc** (nikdy ze dne předchozího data — jinak konec měsíce driftuje) + `lastRunAt`.
6. Audit `RecurringInvoiceGenerated` (`templateId, invoiceId, periodKey`). `SaveChanges` + `Commit` — draft + run + posun **atomicky**.
7. **Po commitu**, pokud `template.autoIssue`: **`InvoiceService.IssueAsync(...)`** (vlastní transakce, MIMO zámek — `IssueAsync` si otevírá vlastní tx kvůli `FOR UPDATE` na číselné řadě). Když selže → faktura zůstane **draftem** (bezpečný default), zaloguje se; resume pass (krok 0) ji příště doissuuje. `IssueAsync` je sama idempotentní (ne-Draft → 409, přeskočí se).

**Bezpečný výchozí režim:** bez `autoIssue` vzniká vždy jen **KONCEPT** — obsluha zkontroluje a vystaví ručně. Auto-issue je opt-in per šablona.

## 4. Background job — `RecurringInvoiceJob`

`BackgroundService` + `PeriodicTimer` (vzor `OverdueInvoiceJob`/`ReservationReminderJob`). Registrace `AddHostedService` jen mimo `Testing` prostředí. Interval `Jobs:RecurringIntervalMinutes` (default 60).

- **Jádro `RunDueAsync` (bez timeru → testovatelné):** cross-tenant sken **MIMO ambient** `db.RecurringInvoiceTemplates.IgnoreQueryFilters().Where(t => t.DeletedAt==null && t.Status==Active && t.NextRunDate <= today)` (strop na batch, `OrderBy Id`), projekce `(id, companyId)`. Per šablona: **ambient tenant scope** (viz §5) → `scopeFactory.CreateScope()` → resolve `RecurringInvoiceService` → `GenerateForTemplateAsync`. Chyba jedné šablony neshodí ostatní (per-item try/catch + log).
- **Catch-up po výpadku:** job generuje **jedno období za tick** (období u `nextRunDate`), pak posune. Šablona 2 měsíce pozadu se dožene 1 fakturou za tick; každé zmeškané období má vlastní `periodKey` → idempotentní, `issueDate = dnes`.
- **Idempotence & souběh:** row-lock (§3.1) + due re-check (§3.2) + existence `RecurringInvoiceRun` (§3.3) + unique index (23505 backstop). Dvojí tick ani dva pody (multi-replika) nevytvoří druhou fakturu za stejné období.
- **Tenant izolace:** job nemá HTTP kontext → data vidí jen skrz ambient tenant (per šablona nastavená na její `companyId`); nikdy nemíchá firmy. Sken due šablon běží mimo ambient (IgnoreQueryFilters).

## 5. Tenant kontext pro job (ambient) — reuse `InvoiceService` bez obcházení

`InvoiceService` scopuje vše přes `ICurrentTenant` — pohání **současně** globální query filtr (`AppDbContext.CurrentCompanyId`) i CompanyId-stamping v `AuditableSaveChangesInterceptor`. Proto samotný „explicitní companyId parametr" na service NESTAČÍ (neopravil by filtr pod DbContextem); jednotící seam je `ICurrentTenant`. V requestu ho plní `CurrentContext` z JWT/`HttpContext`; job HTTP kontext nemá → **ambient fallback jen pro CompanyId**:

- `IAmbientTenant` (Application/Security) drží **jen `Guid? CompanyId`** ve **static `AsyncLocal`** + `IDisposable Enter(companyId)`, který na `Dispose` **obnoví předchozí hodnotu** (re-entrantní, ne natvrdo null).
- `CurrentContext` (Api) se dotkne **jediného řádku**: `CompanyIdOrNull => httpClaim ?? ambient.CompanyId`. **Precedence je bezpečnostní invariant** — JWT claim vždy vyhraje; v requestu nikdo `Enter` nevolá → ambient je null → chování requestů beze změny. `ICurrentUser` (UserId/Role) se NEmění: role a userId předává job **explicitně** do `InvoiceService` (`CompanyRole.Owner` + `Guid.Empty` actor, jako `OverdueInvoiceJob`); interceptor nechá `CreatedBy` null (systémový zápis).
- Job: `using (ambient.Enter(template.CompanyId)) { scope → InvoiceService }`. **Invariant:** `Enter()` se NIKDY nevolá v request pipeline (pokryto testem: request po tiku ani anonymní endpoint nesmí vidět ambient hodnotu).

> Ověřeno architektem (adversariálně) před implementací: ambient je flow-scoped a jen CompanyId (žádný leak mezi tenanty/requesty při povinném `using`), `IssueAsync` mimo zámek (žádné nested-tx), idempotence gate `(companyId, templateId, periodKey)` odolá i změně `dayOfMonth` uprostřed měsíce.

## 6. Migrace `RecurringInvoicesV2` (forward-only, aditivní)

+`RecurringInvoiceTemplate`, +`RecurringInvoiceTemplateItem`, +`RecurringInvoiceRun` (unique `(company_id, template_id, period_key)`), +`Invoice.RecurringInvoiceTemplateId` (nullable FK, index). Bez backfillu (nová funkce). Bez pending model changes.

## 7. Oprávnění / role / moduly

| Schopnost                                      | Owner/Admin | Manager | Účetní                | Employee |
| ---------------------------------------------- | ----------- | ------- | --------------------- | -------- |
| Šablony — čtení (list/detail)                  | ✅          | ✅      | ✅ (`invoices.read`)  | ❌       |
| Šablony — CRUD / pauza / obnova / generate-now | ✅          | ✅      | ✅ (`invoices.write`) | ❌       |

Modul `invoicing` gatuje vše (`ProductModules.ForPermission(invoices.*) == invoicing`). Tenant izolace: všechny entity `ITenantOwned` → globální filtr; cross-tenant → 404. Bez modulu → 403 (nav i route skryté na FE, backend odmítne).

## 8. Frontend

- Typy `RecurringInvoiceTemplate`, `RecurringInvoiceTemplateItem`, `RecurringInvoiceRun`, `RecurringInvoiceStatus` v `src/lib/types.ts`. Čisté helpery (`recurringStatusLabel`, `formatNextRun`, `computeNextRunDate`) v `src/lib/recurring.ts` (+ `recurring.spec.ts`).
- Composable `useRecurringInvoices` (mock-capable, vzor `useJobs`/`useQuotes`): `list/get/create/update/remove/pause/resume/generateNow`. localStorage větev pro mock/e2e, `http.*` větev pro API. Klíč `vystaveno:recurring-invoice-templates`.
- Stránka `RecurringInvoicesPage.vue` na `/app/opakovane-faktury` (`requiresModule: 'invoicing'`): **jednoduchý desktop i mobilní seznam** šablon (název, klient, další běh `nextRunDate`, stav Active/Paused, režim Koncept/Auto-vystavení), akce **Nová/Upravit** (dialog: klient, položky, den v měsíci, splatnost, auto-issue), **Pozastavit/Obnovit**, **Vygenerovat teď**, a **odkazy na vytvořené doklady** (z `runs` → `/app/faktury/editor?id=`). Loading/LoadError/empty stavy jako `ZakazkyPage`.
- Nav `Opakované faktury` v `src/lib/modules.ts` (`module: 'invoicing'`, `hiddenForRoles: ['Employee']`) + ikona v `AppSidebar`. Route guard skryje bez modulu.
- **Součty a čísla dopočítá server** — FE je jen zobrazuje; jasně ukazuje **stav dalšího běhu**.

## 9. Demo data

Mock seed (`src/lib/seed.ts`, `seedRecurringTemplates()`): 1 aktivní měsíční šablona (paušál) navázaná na demo klienta + 1 pozastavená, obojí s položkami. Idempotentní, jen mock režim. Backend demo seeder (`DemoDataSeeder`) přidá stejný vzor pro staging.

## 10. Testy

- **Unit:** `computeNextRunDate` (běžný měsíc, **konec měsíce** 31→28/29/30, přechod roku), validátory (dayOfMonth, dueDays, items). FE `recurring.spec.ts`.
- **Integrační (Postgres):** generování draft vs auto-issue, **idempotence** (2× tick = 1 faktura), **souběh** (paralelní generate = 1 faktura), **pozastavení** (Paused se přeskočí), **generate-now** (idempotentní s jobem), **role/module gate** (403 bez `invoicing`/práv), **tenant izolace** (cizí šablona → 404, job nemíchá firmy), faktura má `recurringInvoiceTemplateId` a projde číslováním/DPH.
- **FE e2e** `e2e/recurring-invoices.spec.ts` (API-mode + mock): list, vytvořit šablonu, pauza/obnova, generate-now, odkaz na doklad.

## 11. Vědomě mimo milník (zalogováno)

- **Automatické odeslání e-mailem** vygenerované faktury: negeneruje se (bezpečný default = koncept ke kontrole). Odeslání zůstává ruční přes stávající `SendAsync`.
- **Napojení platby / online checkout** na opakovanou fakturu: mimo rozsah.
- **Neměsíční frekvence** (týdně/kvartálně/ročně): model má `intervalMonths`, ale UI a job MVP jedou měsíčně (den v měsíci). Rozšíření je aditivní.
- **Náhled/úprava jednotlivé faktury před vytvořením** (approval krok): mimo rozsah — bezpečný default je koncept, který obsluha zkontroluje.

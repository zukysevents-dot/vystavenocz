# Workforce V2 — plánovač směn, docházka, payroll (FE↔BE kontrakt)

**Vlastnictví:** oba PR (backend `vystaveno-api` i frontend `vystavenocz`) staví Claude Code v rámci milníku Workforce V2. Tento soubor je **jediný zdroj pravdy** pro seam; obě strany ho drží v souladu a zrcadlí klíčové body do `AGENTS.md`.

**Rozsah:** rozšíření existujícího modulu `attendance` a oprávnění `attendance.read/write/manage`. **Žádný nový modul ani permission.** Konsolidace na FK-based `Shift` (`/shifts`); starý free-text `/staff-shifts` zůstává na backendu netknutý, ale **frontend ho už nepoužívá** (deprecated). JSON je camelCase; enumy jako string (`JsonStringEnumConverter`).

---

## 1. Doménový model (rozšíření)

- `Employee` +`position` (`string?`, ≤80, default pozice) +`hourlyRate` (`decimal?`, mzdová sazba). `hourlyRate` je **mzdově citlivé** — viz wage privacy.
- `Shift` +`status` (`ShiftStatus` = `Draft | Published`, default `Draft`) +`position` (`string?`, ≤80) +`hourlyRateOverride` (`decimal?`, per-směna přebití sazby).
- `ShiftTemplate` (nová entita): `id`, `name` (≤120), `locationId?`, `weekday` (0 = pondělí … 6 = neděle), `startTime`/`endTime` (`"HH:mm"`), `position?`.
- `ShiftStatus`: `Draft` (rozpracovaná — vidí jen manažer), `Published` (zveřejněná rota — vidí i zaměstnanci). Zrušení směny = **soft-delete** (DELETE), ne samostatný stav.
- **Efektivní sazba** = `shift.hourlyRateOverride ?? employee.hourlyRate ?? 0` (shodně FE i BE).
- Odpracované hodiny i výjimky jsou **computed** (žádná nová tabulka). Migrace: `WorkforceV2ShiftPlanning` (forward-only) přidá pole + `shift_templates`; existující směny backfillne na `Published`.

## 2. Směny — `/api/v1/shifts`

| Metoda   | Route                                                             | Policy              | Poznámka                                                                                                                                               |
| -------- | ----------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`    | `/shifts?from&to&locationId&status&employeeId&page&pageSize&sort` | `attendance.read`   | Paged obálka. `from/to` = UTC dle `startsAt` (týdenní rozsah). **Ne-manažer (bez `attendance.manage`) vidí jen `Published`.** Manager location-scoped. |
| `GET`    | `/shifts/{id}`                                                    | `attendance.read`   | Ne-manažer nevidí `Draft` → **404**.                                                                                                                   |
| `POST`   | `/shifts`                                                         | `attendance.manage` | `CreateShiftRequest`. Location scope `ResolveForCreateAsync` (Manager cizí pobočka → 403).                                                             |
| `PUT`    | `/shifts/{id}`                                                    | `attendance.manage` | `UpdateShiftRequest`.                                                                                                                                  |
| `DELETE` | `/shifts/{id}`                                                    | `attendance.manage` | Soft-delete = zrušení směny. 204.                                                                                                                      |
| `POST`   | `/shifts/publish`                                                 | `attendance.manage` | `PublishShiftsRequest`. Draft → Published v rozsahu/pobočce. **Audit `ShiftsPublished`** v transakci.                                                  |

- `CreateShiftRequest`/`UpdateShiftRequest`: `{ employeeId, startsAt, endsAt, locationId?, note?, status?, position?, hourlyRateOverride? }` (`status` default `Draft`).
- `ShiftResponse`: `{ id, employeeId, locationId, startsAt, endsAt, note, status, position, hourlyRateOverride }` — **bez `employeeName`** (FE si zaměstnance načítá zvlášť). `hourlyRateOverride` je `null` pro volajícího bez `attendance.manage` (wage privacy — ne-manažer vidí publikovanou rotu, ale ne sazby na ní; viz §4/§7).
- `PublishShiftsRequest`: `{ from, to, locationId? }` → `PublishShiftsResponse`: `{ published: number }`.
- Aplikace šablony = **FE-side** (načte šablonu + zaměstnance + cílový týden → `POST /shifts` Draft). Žádný `apply` endpoint.

## 3. Šablony — `/api/v1/shift-templates`

CRUD (POST/PUT/DELETE = `attendance.manage`, GET list/`{id}` = `attendance.read`), location-scoped. Validace: `weekday` 0–6, `startTime`/`endTime` regex `^([01]\d|2[0-3]):[0-5]\d$`, `endTime > startTime`, `name` NotEmpty ≤120.

- Request `{ name, weekday, startTime, endTime, locationId?, position? }`; response `{ id, name, locationId, weekday, startTime, endTime, position }`.

## 4. Zaměstnanci — `/api/v1/employees`

- `CreateEmployeeRequest`/`UpdateEmployeeRequest` +`position?`, `hourlyRate?` (validace `hourlyRate >= 0`). POST/PUT = `attendance.manage`.
- `EmployeeResponse`: `{ id, fullName, userId, locationId, isActive, position, hourlyRate }`.
- **Wage privacy:** mzdové sazby jsou v response `null` pro volajícího bez `attendance.manage` — jak `Employee.hourlyRate` v `EmployeeResponse`, tak `Shift.hourlyRateOverride` v `ShiftResponse` (aby se přes sdílenou publikovanou rotu neprozradily sazby kolegů).

## 5. Payroll — `/api/v1/attendance/summary` + `/export`

- `AttendanceSummaryItem`: `{ employeeId, employeeName, workedMinutes, hourlyRate, wageCost }` — `wageCost` = odpracované hodiny × `hourlyRate` (skutečné hodiny z docházky). `hourlyRate`/`wageCost` = `null` bez sazby.
- `GET /attendance/export` CSV dostane sloupce `Sazba/hod` a `Mzdový náklad`. Self-scope zůstává (zaměstnanec vidí jen svou mzdu).
- Plánovaný mzdový náklad (z rozvrhu) počítá **FE** v plánovači (live náhled + `Export plánu` CSV). Dva různé základy: plán (rozvrh) vs. realita (docházka) — obojí správně.

## 6. Docházka — korekce a výjimky

- `GET /attendance/records?from&to&employeeId&status&page&pageSize&sort` (`attendance.read`, self-scope bez manage). `AttendanceRecordResponse` beze změny.
- `PUT /attendance/records/{id}` (`attendance.manage`) `CorrectRecordRequest`: `{ clockInAt, clockOutAt? }` (`clockOutAt` null = nechat otevřenou). **Audit `AttendanceCorrected`.** **Manager location guard:** manažer smí opravit jen záznam své pobočky (cizí → 403).
- `GET /attendance/exceptions?from&to&locationId` (`attendance.read`, manažerský scope: Owner/Admin vše, scoped Manager svá pobočka, ne-manažer jen sebe). Vrací **pole** `AttendanceExceptionDto`:
  - `{ employeeId, employeeName, date, kind, plannedMinutes?, actualMinutes?, detail }`, `date` = `YYYY-MM-DD` (Europe/Prague).
  - `kind` (`AttendanceExceptionKind`): `MissingClockOut` (otevřená docházka z minulého dne), `Overtime` (odpracováno > denní práh 9 h), `PlanVsActualVariance` (publikovaná směna vs. docházka mimo toleranci / žádná docházka). Prahy jsou MVP konstanty (bez per-firma configu).

## 7. Oprávnění / role / location (matice)

| Schopnost                                                                   | Owner/Admin | Manager          | Employee      | Accountant    |
| --------------------------------------------------------------------------- | ----------- | ---------------- | ------------- | ------------- |
| Plán/publikace směn, šablony, mzda zaměstnance                              | ✅          | ✅ (svá pobočka) | ❌            | ❌            |
| Čtení směn (Draft+Published)                                                | ✅          | ✅ (svá)         | jen Published | jen Published |
| Píchačka (sebe)                                                             | ✅          | ✅               | ✅            | ❌            |
| Oprava docházky (audit)                                                     | ✅          | ✅ (svá pobočka) | ❌            | ❌            |
| Payroll (mzda v přehledu/CSV)                                               | ✅          | ✅               | jen svou      | jen svou      |
| Mzdová sazba v response (`Employee.hourlyRate`, `Shift.hourlyRateOverride`) | ✅          | ✅               | ❌ (null)     | ❌ (null)     |

Modul gate `attendance.*` → modul `attendance` beze změny. Tenant izolace přes global query filter (cross-tenant → 404).

## 8. Frontend flow

- Plánovač `SmenyPage.vue` je **mock-capable** (composables `useShifts`/`useShiftTemplates` mají localStorage větev proti tomuto tvaru). V API režimu přepne na `/shifts` + `/shift-templates` bez změny UI.
- Docházka `DochazkaPage.vue`: taby `Opravy` a `Výjimky` jsou **API-only** (manažerské), gate-ované rolí Owner/Admin/Manager.

## 9. Vědomě odloženo (zalogováno)

- `Employee.email/phone` — jen pokud vznikne featura notifikace publikované směny.
- Per-směna create/update audit (dnes stačí `ShiftsPublished` + `AttendanceCorrected`).
- Konfigurovatelné prahy výjimek per firma; přesčasové/zaokrouhlovací pravidla; výměny směn.

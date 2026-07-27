# Placené moduly — architektura nároků (entitlements)

Stav: implementováno 2026-07-26. Vynucení je zapnuté (`Entitlements:Enforce=true`), ale rollout
fallback pro historické firmy je zatím **grandfathered** — viz
[migration-and-rollout.md](migration-and-rollout.md).

## Hlavní pravidlo

> Pokud firma nemá aktivní nárok na modul, nesmí získat přístup k jeho datům, funkcím ani API akcím —
> ani přes přímou URL, mobilní deep link, starou cache, upravený request nebo ručně zavolaný endpoint.

Vynucuje to **server**. Web, PWA i mobil funkce jen skrývají pro lepší UX; nikdy nejsou jedinou obranou.

## Kde nárok vzniká a kde se vyhodnocuje

```
CompanySubscription (tarif firmy)  ─┐
CompanyEntitlement  (granty)       ─┼─→  NÁROK (entitled)
SubscriptionPlans   (katalog)      ─┘         │
                                              ├─ ∩ CompanyModules (VOLBA firmy) ─→ EFEKTIVNÍ moduly
CompanyModules      (co chce firma vidět) ─────┘        (+ granty jsou aktivní hned)
```

Skládá to `EntitlementResolver` (`src/Vystaveno.Infrastructure/Billing/EntitlementResolver.cs`) —
**jediný zdroj pravdy**. `CapabilityResolver` (moduly/features v `GET /me`) je nad ním jen fasáda,
takže se to, co klient vidí, nemůže rozejít s tím, co server povolí.

### Nárok vs. volba — proč dvě věci

`company_modules` existovalo dřív a znamenalo _volbu firmy_ (onboarding profil, „které části používáme").
Zároveň to ale bylo jediné, co autorizace kontrolovala, takže `PUT /api/v1/company/modules` byl
**samoobslužný entitlement**: Owner si přímým API voláním zapnul kterýkoli placený modul.

Teď jsou to dvě oddělené vrstvy:

| Vrstva                                       | Kdo mění                                                                | Význam                                 |
| -------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| `CompanySubscription` + `CompanyEntitlement` | jen interní billing workflow (platform admin), v budoucnu webhook brány | na co má firma **nárok**               |
| `CompanyModules`                             | zákazník (Owner/Admin) přes `PUT /company/modules`                      | co z nárokovaného chce **mít zapnuté** |

`PUT /company/modules` odmítne modul mimo nárok (403 + `reason: module_not_in_plan`).

**Samostatně přidělený modul (grant) je aktivní okamžitě** a volbou se nezužuje — koupený doplněk
nemá smysl nutit zákazníka ještě někde zapínat. Zúžení volbou se tak vztahuje jen na moduly z tarifu.
(Doplnit modul do `company_modules` za zákazníka technicky nejde: `AuditableSaveChangesInterceptor`
stampuje `CompanyId` tenant entit z kontextu requestu, takže by support řádek zapsal své vlastní firmě.)

## Datový model

Migrace `20260726115424_AddEntitlementsAndSubscriptions` (aditivní + backfill).

### `company_subscriptions` — jeden řádek na firmu (unique `company_id`)

| Sloupec              | Význam                                                               |
| -------------------- | -------------------------------------------------------------------- |
| `plan_id`            | klíč tarifu z katalogu (`free`, `standard`, `growth`, `legacy_full`) |
| `status`             | **jen ZÁMĚR**: `Trial`, `Active`, `Suspended`, `Cancelled`           |
| `trial_ends_at`      | konec zkušební doby                                                  |
| `current_period_end` | konec zaplaceného období; `null` = bez konce (grandfathered/interní) |
| `grace_days`         | ochranná lhůta ve dnech (default 14, rozsah 0–180)                   |
| `external_ref`       | reference u platebního providera — **nikdy se nevrací zákazníkovi**  |
| `note`               | interní poznámka supportu — **nikdy se nevrací zákazníkovi**         |

`GracePeriod` a `Expired` se **neukládají** — počítá je čistá funkce `SubscriptionAccess.Evaluate`
z datumů při každém čtení. Proto systém nepotřebuje plánovač, nemůže se rozejít s realitou a rollback
je jen změna dat, ne dohánění stavů.

### `company_entitlements` — samostatné granty mimo tarif

| Sloupec                      | Význam                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| `module_id`                  | modul z `ProductModules.All`                                               |
| `source`                     | `plan`, `addon`, `trial`, `promo`, `referral`, `manual_grant`, `migration` |
| `status`                     | `Active`, `Suspended`, `Revoked` (`Expired` se dopočítá z `ends_at`)       |
| `starts_at` / `ends_at`      | platnost; `ends_at = null` = bez expirace                                  |
| `external_ref`               | idempotency/reference klíč z externího eventu (unique per firma+modul)     |
| `granted_by_user_id`, `note` | auditní informace                                                          |

Moduly z tarifu se sem **neukládají** — jsou dopočítané z `plan_id`. Jinak by downgrade musel mazat
řádky a jedna zapomenutá cesta by zákazníkovi nechala placený modul navždy.

Revoke nemaže řádek, jen ho označí — zůstává dohledatelné, co firma kdy měla.

### `billing_events` — vstupní branka pro platební bránu

`event_key` je **unique napříč providery** → opakované doručení stejného eventu nic nezmění.
`payload_json` je náš normalizovaný request (bez karet a bez secrets), jen pro dohledání ve supportu.

### `users.is_platform_admin`

Interní support/billing role. **Není** firemní role — Owner jí nikdy nebude, jinak by si zákazník
mohl sám přidělit placený modul. Nastavuje se výhradně provozně (SQL), žádný endpoint ji nezapíná.
Policy `platform.admin` ověřuje příznak **v DB, ne claim v tokenu** → odebrání práva platí okamžitě.

### Katalog tarifů je KÓD, ne tabulka

`src/Vystaveno.Domain/Billing/SubscriptionPlans.cs`. Tarify se mění s nasazením, ne za běhu, a admin
CRUD nad cenotvorbou nikdo nepotřebuje. Migrace na tabulku = doplnit `subscription_plans` a nechat
tenhle katalog jako seed (klíče zůstávají). **Entity `SubscriptionPlan`/`PlanModule` proto v DB nejsou** —
vědomá odchylka od zadání, viz „Otevřené otázky".

Přiřazení tarif → modul je v [module-access-matrix.md](module-access-matrix.md).

## Režim přístupu (`accessMode`)

`SubscriptionAccess.Evaluate(storedStatus, trialEndsAt, currentPeriodEnd, graceDays, now)`:

| Uložený stav     | Podmínka                    | Efektivní stav | `accessMode`              |
| ---------------- | --------------------------- | -------------- | ------------------------- |
| `Trial`          | `now ≤ trialEndsAt`         | `trial`        | `full`                    |
| `Trial`          | `≤ trialEndsAt + grace`     | `grace_period` | `full`                    |
| `Trial`          | po grace                    | `expired`      | `read_only`               |
| `Active`         | `current_period_end = null` | `active`       | `full`                    |
| `Active`         | `now ≤ end`                 | `active`       | `full`                    |
| `Active`         | `≤ end + grace`             | `grace_period` | `full`                    |
| `Active`         | po grace                    | `expired`      | `read_only`               |
| `Cancelled`      | `now ≤ end` (zaplaceno)     | `active`       | `full`                    |
| `Cancelled`      | po konci období             | `cancelled`    | `read_only`               |
| `Suspended`      | vždy                        | `suspended`    | `locked`                  |
| `Trial`/`Active` | chybí datum (datová chyba)  | `expired`      | `read_only` (fail-closed) |

### Co znamená `read_only`

Projdou **jen čtení a EXPORTY vlastních dat**: oprávnění končící `.read`, plus `pos.reports`,
`reporting.margin`, `catalog.cost_view` a `integrations.export`. Zákazník tak po skončení tarifu
vidí i odnese svoje účetní doklady (zákonná úschova + GDPR portabilita). Všechny zápisy → 403.

### Co znamená `locked`

Efektivní moduly se zúží na `core` a projdou jen čtení. Je to **ruční** eskalace (zneužití,
opakované nezaplacení) — nikdy nenastane automaticky. Řeší se přes podporu.

## Vynucení na serveru

`PermissionAuthorizationHandler` vyhodnocuje v tomto pořadí (a žádný krok nenahrazuje jiný):

1. **role → oprávnění** (`RolePermissions`) — entitlement nikdy nenahrazuje roli;
2. **nárok na modul** odpovídající oprávnění (`ProductModules.ForPermission`);
3. **režim přístupu** — v `read_only`/`locked` projdou jen čtení a exporty.

Tenant izolace (EF global query filter) běží nezávisle a tímhle se nenahrazuje. Modul `core` se už
**nezkratuje** na povolení — v omezeném režimu musí odmítnout zápis i jádro.

Fail-closed: chybějící role, nevalidní claim, chybějící nárok i omezený režim → 403.

Stejná pravidla platí pro **veřejné API** (`ScopeAuthorizationHandler`): bez nároku na modul
`integrations` i na doménový modul scope → 403 i s platným tokenem; po expiraci projdou jen čtecí scopes.

### Odpověď při zamítnutí

403 `ProblemDetails` s extension `reason`:

| `reason`                 | Kdy                       | Zákaznická hláška                                                    |
| ------------------------ | ------------------------- | -------------------------------------------------------------------- |
| `module_not_in_plan`     | firma na modul nemá nárok | „Tato část aplikace není ve vašem tarifu."                           |
| `subscription_read_only` | zápis po expiraci/zrušení | „Vaše předplatné skončilo. Data zůstávají k nahlédnutí i k exportu…" |
| `subscription_locked`    | pozastavený přístup       | „Přístup je pozastavený. Obraťte se prosím na naši podporu."         |

Chybějící **role** zůstává bez `reason` — klient nemá zjišťovat, které oprávnění mu chybí.
Interní billing data, ceny ani informace o jiných firmách se nikdy nevracejí.

## Snapshot pro klienta

`GET /api/v1/entitlements` (a totéž jako `entitlement` v `GET /api/v1/me` — jeden mapper
`EntitlementSnapshot.From`, takže se nemohou rozejít):

```json
{
  "companyId": "…",
  "plan": {
    "id": "growth",
    "name": "Růst",
    "status": "trial",
    "renewsAt": "2026-08-09T10:00:00Z",
    "graceEndsAt": null,
    "canManageSubscription": true
  },
  "modules": ["core", "invoicing", "pos"],
  "features": ["invoices.read", "…"],
  "limits": {},
  "accessMode": "full",
  "lockedModules": ["gastro", "verified_signing"]
}
```

- `canManageSubscription` = uživatel má `company.manage` (Owner/Admin). Manager/Accountant/Employee
  předplatné nemění.
- `features` se v omezeném režimu **zúží stejně jako na serveru** → klient schová zápisové CTA bez
  vlastní logiky.
- `limits` je záměrně prázdné — objemové limity neexistují (viz „Otevřené otázky").
- Endpoint je vědomě bez permission policy (self-identita jako `/me`, whitelist v
  `EndpointAuthorizationConventionTests`); firma se bere výhradně z tokenu.

## Interní billing workflow

`/api/v1/admin/billing/*`, celé pod policy `platform.admin`. Jediné místo, kde se mění nárok — všechny
cesty (trial, promo, referral, ruční grant, upgrade/downgrade, zrušení, obnova, budoucí webhook)
vedou do `EntitlementAdminService`, takže audit a idempotenci nejde obejít.

| Endpoint                                    | Co dělá                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /companies/{id}`                       | stav tarifu, granty s historií, efektivní moduly                         |
| `PUT /companies/{id}/subscription`          | tarif + stav + období (upgrade, downgrade, zrušení, pozastavení, obnova) |
| `POST /companies/{id}/entitlements`         | grant modulu (`addon`/`trial`/`promo`/`referral`/`manual_grant`)         |
| `DELETE /companies/{id}/entitlements/{eid}` | revoke (historie zůstává)                                                |
| `POST /events`                              | idempotentní příjem billing eventu                                       |

Validace odmítne neznámý tarif, `GracePeriod`/`Expired` jako uložený stav (jsou dopočítané), trial bez
data konce a `graceDays` mimo 0–180.

Audit (existující `AuditLog`): `SubscriptionTrialStarted`, `SubscriptionPlanChanged`,
`EntitlementGranted`, `EntitlementRevoked`, `BillingEventProcessed`. Nikdy neobsahuje platební údaje —
jen referenci providera.

### Idempotence

- **Billing event**: kontrola `event_key` **před** jakoukoli změnou; replay vrátí `replayed: true` a
  nic nepřepíše. Aplikace tarifu + grantu + zápis eventu běží v jedné transakci; souběžné doručení
  zastaví unique index → 409.
- **Grant**: stejný `external_ref` (promo redemption, faktura providera) nevytvoří druhý grant.

## Nová firma

Firma vzniká na třech místech (registrace e-mailem, OAuth registrace, `POST /companies`). Všechna
používají `TrialSubscription.New` → tarif **Růst** ve stavu `Trial` na 14 dní, grace 14 dní.
Bez řádku by firma spadla na rollout fallback, který je určený jen pro historické firmy.

## Klienti

### Web / PWA (`vystavenocz`)

- `src/lib/entitlements.ts` — typy snapshotu, upsell copy per modul (přínos + který tarif ho obsahuje),
  `daysUntil`. Fallback snapshot je **povolující** (dokud `/me` nedorazí UI neblokujeme; server odmítne sám).
- `src/stores/auth.ts` — drží snapshot, vystavuje `accessMode`, `isReadOnly`, `plan`, `lockedModules`,
  `canManageSubscription`. Cache v `localStorage` smí jen zrychlit první render; každé `/me` ji přepíše.
- `src/stores/subscription.ts` — **derivovaný** ze snapshotu. Dřív to byl localStorage mock, který si
  sám udělil trial a měl `activatePro()` → tarif se dal „zaplatit" z prohlížeče. Rozhraní
  (`isPaid`/`isTrial`/`trialDaysLeft`) zůstalo, hodnoty jsou teď serverové a `activatePro` neexistuje.
- Router guard: modul mimo nárok → `/app/modul/:module` (`ModulNedostupnyPage`) s vysvětlením přínosu
  a CTA „Zobrazit možnosti" / „Přejít na ceník“ (jen Owner/Admin). Dřív tichý redirect na Přehled.
- `TrialBanner` — zkušební doba (≤ 7 dní), ochranná lhůta, `read_only`, `locked`.
- `PredplatnePage` — aktuální tarif, co je v ceně, co lze přidat, cesta ke změně. Žádná lokální aktivace.
- `NastaveniPage` — modul mimo nárok je nedostupný s odkazem „Obsahuje …".
- **Přepnutí firmy**: `switchCompany` zahodí všechny tenant cache (`vystaveno.*` / `vystaveno:*` kromě
  přihlášení), znovu načte `/me` a sidebar udělá **tvrdý přechod** na `/app`. Softový `router.push` by
  nechal v paměti rozpracovaná data a načtené seznamy předchozí firmy.

### Mobil (`vystaveno-mobile`)

- `EntitlementDto` v `/me` → `EntitlementGates.allows(me, module)`; `NavigationCatalog` má
  `entitlementGate` u každé destinace, takže se zamčený modul nedostane do bottom navigation ani do hubů.
- `lockedModules` **vyhrává nad** `modules` — stará cache tak nemůže odemknout modul, o který firma přišla.
- Chybějící snapshot (starší backend) = fail open; server pořád odmítá.
- 403 s `reason` → `AppError.PlanModuleMissing` / `PlanReadOnly` / `PlanLocked` s konkrétní českou
  hláškou. Zamčený modul se nikdy nevydává za chybu načítání.
- `SessionManager.refreshEntitlements()` se volá při návratu z pozadí (Android `onResume`) — stará
  cache neodemkne modul po expiraci ani po zásahu podpory.
- Mobil **nemá přepínač firem** (token nese jednu firmu), takže se ho scénář „přepnutí firmy" netýká;
  vznik firmy v onboardingu už cache maže (`TenantCacheRegistry.clearAll`).

## Rollout přepínače

Konfigurace `Entitlements:*` (`EntitlementOptions`):

| Klíč                                             | Default       | Význam                                                                                                                                     |
| ------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Entitlements:Enforce`                           | `true`        | `false` = shadow/audit mód: chybějící nárok se jen zaloguje (warning) a request projde. Monitoring před ostrým zapnutím + rychlý rollback. |
| `Entitlements:DefaultPlanForMissingSubscription` | `legacy_full` | tarif pro firmu bez řádku předplatného. Po ověření backfillu utáhnout na `free`.                                                           |

## Budoucí platební provider

Připraveno, **nic z toho netvrdíme jako ostré platby**:

- `POST /api/v1/admin/billing/events` má už tvar webhooku (`eventKey`, `provider`, `type`, `companyId`,
  změna tarifu / grant) a je idempotentní. Reálný webhook = nový `[AllowAnonymous]` controller, který
  **ověří podpis** a zavolá tuto stejnou službu — žádná paralelní logika.
- `CompanySubscription.ExternalRef` / `CompanyEntitlement.ExternalRef` drží referenci providera.
- `SubscriptionPlan.IsSelfServiceUpgrade` označuje tarify, které smí být cílem samoobslužné změny.
- Promo/referral evidence (`SubscriptionCampaign`/`SubscriptionCode`/`SubscriptionAttribution`,
  `GrowthInvitation`/`GrowthAttribution`) zůstává oddělená a nárok **nevytváří sama** — grant vzniká
  až přes billing workflow. To je záměr: dokud nárok nevznikne, UI nesmí slevu ani bonus prezentovat
  jako platný.
- Osobní (uživatelské) předplatné je **budoucí rozšíření**, ne dnešní model: nárok je na firmě,
  protože uživatel může být ve víc firmách a každá má jiný tarif. Kdyby bylo potřeba, přidalo by se
  jako `UserEntitlement` s vlastním resolverem a s explicitním pravidlem, jak se skládá s firemním —
  nikdy jako záměna za firemní nárok.

## Testy

- Unit: `SubscriptionAccessTests` (trial/grace/expirace/zrušení/pozastavení, klasifikace read-only
  oprávnění), `SubscriptionPlansTests` (vnořenost tarifů, doplňky mimo tarify, fail-closed neznámý tarif).
- Integrační: `EntitlementTests` — 31 případů (nárok podle tarifu, obejití UI přímým API voláním,
  role bez nároku, doplněk, trial/grace/expirace/pozastavení/zrušení, snapshot, samoobslužné zapnutí
  modulu, admin workflow, idempotence grantu i eventu, downgrade, audit, multi-company, migrace
  historické firmy, shadow mód).
- Web: `entitlements.spec.ts`, `subscription.spec.ts`, `routes.spec.ts` (upsell místo tichého redirectu).
- Mobil: `EntitlementGatesTest` (gating, stará cache, fail-open, mapování `reason` na české hlášky).

## Otevřené produktové otázky

Shrnuté v [migration-and-rollout.md](migration-and-rollout.md) → „Co musí rozhodnout vlastník produktu".

# Přístupová matice: tarif → modul → funkce → endpoint

Zdroje pravdy (tento dokument je jejich čitelný přepis — při změně kódu aktualizuj i tady):

- tarify: `vystaveno-api/src/Vystaveno.Domain/Billing/SubscriptionPlans.cs`
- oprávnění → modul: `vystaveno-api/src/Vystaveno.Domain/Authorization/ProductModules.ForPermission`
- role → oprávnění: `vystaveno-api/src/Vystaveno.Domain/Authorization/RolePermissions.cs`
- routy → modul: `vystavenocz/src/router/index.ts` (`requiresModule`), navigace `src/lib/modules.ts`
- mobilní navigace → modul: `vystaveno-mobile/.../core/navigation/NavigationCatalog.kt`

## 1. Tarif → modul

| Modul                                                | `free` (Základ) | `standard` (Provoz) | `growth` (Růst) | `legacy_full` (Původní plán) |
| ---------------------------------------------------- | :-------------: | :-----------------: | :-------------: | :--------------------------: |
| `core` — jádro, nastavení, tým, předplatné           |       ✅        |         ✅          |       ✅        |              ✅              |
| `invoicing` — faktury, nabídky, klienti, DPH         |       ✅        |         ✅          |       ✅        |              ✅              |
| `pos` — pokladna, uzávěrka                           |        —        |         ✅          |       ✅        |              ✅              |
| `stock` — sklad, příjemky, doklady, dodavatelé       |        —        |         ✅          |       ✅        |              ✅              |
| `attendance` — docházka, směny                       |        —        |         ✅          |       ✅        |              ✅              |
| `reporting` — výsledky provozu, porovnání poboček    |        —        |         ✅          |       ✅        |              ✅              |
| `gastro` — stoly, kuchyně, modifikátory              |        —        |          —          |       ✅        |              ✅              |
| `booking` — rezervace                                |        —        |          —          |       ✅        |              ✅              |
| `jobs` — zakázky, ceník služeb                       |        —        |          —          |       ✅        |              ✅              |
| `loyalty` — věrnost, akce a ceny                     |        —        |          —          |       ✅        |              ✅              |
| `ai` — nápověda a doporučení                         |        —        |          —          |       ✅        |              ✅              |
| `integrations` — exporty, periferie, API a webhooky  |        —        |          —          |       ✅        |              ✅              |
| `crm` — poznámky, úkoly, timeline                    |        —        |          —          |       ✅        |              ✅              |
| `verified_signing` — podpisy dokumentů (**doplněk**) |        —        |          —          |        —        |              ✅              |

Vlastnosti, které hlídají unit testy (`SubscriptionPlansTests`):

- `free ⊂ standard ⊂ growth` (striktně vnořené),
- `core` je v každém tarifu (jinak by se firma nedostala ani ke změně tarifu),
- **doplňky nejsou v žádném komerčním tarifu** — `verified_signing` jen přes grant,
- `legacy_full ⊇ všechny moduly` (migrace nikomu nic nevypne),
- `growth ⊇ ProductModules.DefaultEnabled` (nová firma v trialu má stejný povrch jako historický default),
- neznámý tarif → **jen `core`** (fail-closed, nikdy „všechno").

`legacy_full` je grandfathered, není v ceníku a `IsSelfServiceUpgrade = false` — není cílem upgradu.

### Zkušební doba a doplňky

| Co                                                                      | Hodnota                   |
| ----------------------------------------------------------------------- | ------------------------- |
| Tarif nové firmy                                                        | `growth` ve stavu `Trial` |
| Délka zkušební doby                                                     | 14 dní                    |
| Ochranná lhůta (po trialu i po období)                                  | 14 dní, plný přístup      |
| Tarif po neúspěšném trialu (produktové rozhodnutí, viz otevřené otázky) | `free` (`FallbackPlan`)   |
| Doplňky (nikdy v tarifu)                                                | `verified_signing`        |

## 2. Modul → funkce (oprávnění) → endpointy

Oprávnění se mapuje na modul přes `ProductModules.ForPermission`. Pokud firma modul nemá, endpoint
vrátí **403 + `reason: module_not_in_plan`** — i pro Ownera, i při přímém API volání.

| Modul              | Oprávnění                                                                                                     | Hlavní endpointy (`/api/v1`)                                                                                                                     | Routy (web)                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core`             | `company.read`, `company.manage`, `approvals.manage`, `catalog.read`, `catalog.manage`, `catalog.cost_view`   | `/company`, `/company/modules`, `/company/members*`, `/company/audit`, `/locations`, `/approvals*`, `/products*`, `/categories`, `/entitlements` | `/app`, `/app/nastaveni`, `/app/tym`, `/app/pobocky`, `/app/audit`, `/app/schvalovani`, `/app/predplatne`, `/app/pruvodce`, `/app/modul/:module` |
| `invoicing`        | `invoices.read`, `invoices.write`, `quotes.read`, `quotes.manage`                                             | `/invoices*`, `/invoices/vat-summary`, `/recurring-invoice-templates*`, `/quotes*`, `/clients*`, `/dashboard/*`                                  | `/app/faktury*`, `/app/nabidky`, `/app/klienti`, `/app/dph`, `/app/uctarna`, `/app/cashflow`, `/app/opakovane-faktury`                           |
| `pos`              | `pos.read`, `pos.operate`, `pos.void`, `pos.discount_unlimited`, `pos.close_day`, `pos.import`                | `/sales*`, `/sales/import`, `/day-close*`                                                                                                        | `/app/pokladna`, `/app/uzaverka`                                                                                                                 |
| `reporting`        | `pos.reports`, `reporting.margin`                                                                             | `/pos-reports/{summary,revenue,costs,staff,losses,dead-items}`                                                                                   | `/app/provozni-prehled`, `/app/konsolidace`                                                                                                      |
| `gastro`           | `gastro.read`, `gastro.manage`, `gastro.operate`, `gastro.kitchen`                                            | `/orders*`, `/kitchen/*`, `/floors*`, `/modifier-groups*`                                                                                        | `/app/restaurace`, `/app/kuchyne`, `/app/mapa-stolu`, `/app/modifikatory`                                                                        |
| `stock`            | `inventory.read`, `inventory.manage`, `inventory.write_off`                                                   | `/inventory/*`, `/stock-documents*`, `/suppliers*`, `/purchase-orders*`, `/production-batches`                                                   | `/app/sklad`, `/app/zasoby`, `/app/naskladneni`, `/app/skladove-doklady`, `/app/dodavatele`, `/app/nakupni-objednavky`, `/app/kategorie`         |
| `attendance`       | `attendance.read`, `attendance.write`, `attendance.manage`                                                    | `/attendance/*`, `/shifts*`, `/shift-templates*`, `/employees*`                                                                                  | `/app/dochazka`, `/app/smeny`                                                                                                                    |
| `booking`          | `booking.read`, `booking.manage`                                                                              | `/reservations*`, `/resources*`, `/services*`, `/reservation-reminder-settings`                                                                  | `/app/rezervace`                                                                                                                                 |
| `jobs`             | `jobs.read`, `jobs.manage`                                                                                    | `/jobs*`, `/jobs/{id}/files`, `/service-items*`                                                                                                  | `/app/zakazky*`, `/app/cenik-sluzeb`                                                                                                             |
| `loyalty`          | `loyalty.read`, `loyalty.manage`                                                                              | `/promotions*`, `/promotions/calculate`, `/price-levels*`, `/customers*`, `/loyalty/settings`                                                    | `/app/vernost`, `/app/akce-ceny`                                                                                                                 |
| `integrations`     | `integrations.read`, `integrations.operate`, `integrations.manage`, `integrations.export`, `integrations.api` | `/integrations/*`, `/api-tokens*`, `/webhook-subscriptions*`, `api/public/v1/*`                                                                  | `/app/import`, `/app/nastaveni/api-webhooky`                                                                                                     |
| `crm`              | `crm.read`, `crm.manage`                                                                                      | `/crm/*`                                                                                                                                         | `/app/crm`                                                                                                                                       |
| `verified_signing` | `verified_signing.read`, `verified_signing.operate`, `verified_signing.manage`                                | `/verified-signing/*`                                                                                                                            | `/app/podpisy`                                                                                                                                   |
| `ai`               | (zatím bez vlastního oprávnění)                                                                               | —                                                                                                                                                | nápověda v kontextu                                                                                                                              |

Poznámky:

- **`approvals.manage` je průřezové (`core`)** — schvalování se nevypíná s žádným modulem.
- `pos.reports` a `reporting.margin` patří pod `reporting`, ne `pos` — firma může mít pokladnu bez
  manažerské analytiky.
- Nové oprávnění MUSÍ být v `Permissions.All` **i** v `ProductModules.ForPermission`, jinak spadne
  `EndpointAuthorizationConventionTests`, nebo klíč tiše propadne na `core`.
- Veřejné API: scope → modul přes `ApiScopes.ModuleFor`, navíc **master vypínač** `integrations`.

## 3. Režim přístupu → co projde

| `accessMode` | Efektivní moduly         |     Čtení     | Export vlastních dat |             Zápisy              |
| ------------ | ------------------------ | :-----------: | :------------------: | :-----------------------------: |
| `full`       | nárok ∩ volba (+ granty) |      ✅       |          ✅          |               ✅                |
| `read_only`  | nezměněné                |      ✅       |          ✅          | ❌ 403 `subscription_read_only` |
| `locked`     | jen `core`               | ✅ (jen core) |          ❌          |  ❌ 403 `subscription_locked`   |

Oprávnění, která **zůstávají** i v `read_only`: cokoli `*.read`, plus `pos.reports`,
`reporting.margin`, `catalog.cost_view`, `integrations.export`.

## 4. Role × modul

Role určuje, **co** uživatel v rámci aktivního modulu smí; entitlement určuje, **zda** modul firma má.
Obojí musí platit — ani jedno nenahrazuje druhé, ani tenant izolaci.

| Role          | Typický rozsah                                                           |
| ------------- | ------------------------------------------------------------------------ |
| Owner / Admin | vše (`Permissions.All`) + jediní smí měnit předplatné (`company.manage`) |
| Manager       | vše kromě správy firmy, data scopovaná na svou provozovnu                |
| Accountant    | fakturace, klienti, exporty, nákupní ceny; **ne** `reporting.margin`     |
| Employee      | provozní moduly (pokladna, sklad); **ne** storno, odpisy, nákupní ceny   |
| Kitchen       | KDS + docházka                                                           |
| Stockkeeper   | sklad + katalog + docházka; **ne** odpisy                                |

Změnu tarifu smí požádat **jen Owner/Admin** (`canManageSubscription` ve snapshotu). Ostatní role
vidí vlastní snapshot, ale ne billing administraci.

## 5. Co matici hlídá v testech

| Vlastnost                                    | Test                                                      |
| -------------------------------------------- | --------------------------------------------------------- |
| Firma s modulem v tarifu má přístup          | `EntitlementTests.Company_with_module_in_plan_has_access` |
| Firma bez modulu nemá přístup                | `Free_plan_has_no_access_to_pos_even_for_owner`           |
| UI gating nelze obejít přímým API voláním    | `Ui_gating_cannot_be_bypassed_by_direct_api_mutation`     |
| Správná role bez modulu nemá přístup         | `Correct_role_without_entitlement_is_still_rejected`      |
| Doplněk potřebuje grant i v nejvyšším tarifu | `Addon_module_needs_explicit_grant_not_just_top_plan`     |
| Zákazník si nezapne modul mimo tarif         | `Owner_cannot_self_enable_module_outside_plan`            |
| Downgrade odebere jen odpovídající moduly    | `Downgrade_removes_only_matching_modules`                 |
| Přepnutí firmy změní tarif i moduly          | `Switching_company_switches_plan_and_modules`             |
| `/me` a `/entitlements` vracejí totéž        | `Me_and_entitlements_return_identical_modules`            |
| Vnořenost tarifů, doplňky, fail-closed       | `SubscriptionPlansTests`                                  |
| Klasifikace read-only oprávnění              | `SubscriptionAccessTests`                                 |

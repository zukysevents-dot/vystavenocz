# Přístupová matice: firma × tarif × modul × role × platforma

Doplňuje `docs/billing/module-access-matrix.md` (backendová strana) o pohled „co uvidí uživatel na
webu a v mobilu". Rozhodnutí je vždy stejné a v tomto pořadí:

1. **Firma** — tenant z JWT claimu `companyId`. Klient tenant nikdy neposílá.
2. **Membership + role** — role platí per firma (`RolePermissions.cs`).
3. **Nárok** — tarif + samostatné granty (`CompanySubscription` + `CompanyEntitlement`).
4. **Volba firmy** — `company_modules` (co z nárokovaných modulů chce firma vidět).
5. **Režim přístupu** — `full` / `read_only` / `locked` (po expiraci projdou jen čtení a exporty).

Efektivní modul = (tarif ∪ granty) ∩ volba firmy, samostatný grant je aktivní hned.
`core` má firma vždy; v režimu `locked` se snapshot zúží na `core` a zápisy neprojdou ani tam.

## Vynucení podle vrstvy

| Vrstva                                   | Co dělá                                                | Co NEDĚLÁ            |
| ---------------------------------------- | ------------------------------------------------------ | -------------------- |
| Backend `PermissionAuthorizationHandler` | role → nárok na modul → režim přístupu; 403 + `reason` | nic nevěří klientovi |
| Web router guard                         | odklon na `/app/modul/:module` s vysvětlením přínosu   | nenahrazuje server   |
| Web sidebar                              | schová položku bez modulu/role                         | není ochrana         |
| Mobil `ScreenAccess`                     | route-level brána nad každou obrazovkou + detailem     | nenahrazuje server   |
| Mobil `NavigationCatalog`                | spodní lišta, „Více", editor zkratek                   | není ochrana         |

Nikdy nestačí: skryté menu, klientský `if`, lokální feature flag, client-side company id.

## Matice rolí (mobil i web stejně)

| Modul                  | Owner    | Admin    | Manager                   | Accountant | Employee    | Kitchen   | Stockkeeper |
| ---------------------- | -------- | -------- | ------------------------- | ---------- | ----------- | --------- | ----------- |
| core – nastavení firmy | ✔ zápis  | ✔ zápis  | čtení                     | —          | —           | —         | —           |
| core – schvalování     | ✔        | ✔        | ✔                         | —          | —           | —         | —           |
| invoicing              | ✔        | ✔        | ✔                         | ✔          | —           | —         | —           |
| jobs                   | ✔        | ✔        | ✔                         | čtení      | ✔ (technik) | —         | —           |
| stock                  | ✔        | ✔        | ✔                         | čtení      | ✔           | —         | ✔           |
| pos                    | ✔        | ✔        | ✔                         | čtení      | ✔           | —         | —           |
| gastro                 | ✔        | ✔        | ✔                         | čtení      | ✔           | ✔ jen KDS | —           |
| booking                | ✔        | ✔        | ✔                         | čtení      | ✔           | —         | —           |
| attendance             | ✔ správa | ✔ správa | ✔ správa                  | čtení      | vlastní     | vlastní   | vlastní     |
| reporting              | ✔        | ✔        | ✔                         | —          | —           | —         | —           |
| loyalty                | ✔        | ✔        | ✔                         | —          | —           | —         | —           |
| crm                    | ✔        | ✔        | ✔                         | čtení      | —           | —         | —           |
| integrations           | ✔        | ✔        | částečně (bez API tokenů) | export     | —           | —         | —           |
| verified_signing       | ✔        | ✔        | ✔                         | čtení      | —           | —         | —           |

Manager je navíc scopovaný na svou provozovnu (`LocationScope`), `integrations.api` má jen
Owner/Admin (API token čte data celé firmy).

## Chování při odepření

| Situace                   | Backend                                 | Web                                                            | Mobil                                                                               |
| ------------------------- | --------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Firma nemá modul          | 403 `module_not_in_plan`                | `/app/modul/:module` — přínos + CTA na ceník (jen Owner/Admin) | `ModuleUnavailableScreen` — přínos + „přidáte ve webové aplikaci" (jen Owner/Admin) |
| Tarif vypršel (read_only) | zápisy 403 `subscription_read_only`     | banner + skryté zápisové akce                                  | banner + skryté zápisové akce                                                       |
| Přístup zamčen            | vše mimo core 403 `subscription_locked` | vysvětlení + cesta k obnovení                                  | jen Nastavení a vysvětlení                                                          |
| Role bez oprávnění        | 403 bez `reason`                        | skrytá položka + guard                                         | `RoleUnavailableScreen`                                                             |

Uživateli se NIKDY nezobrazí `403`, `entitlement`, `module_not_in_plan`, `feature flag` ani interní
názvy tarifů — hlídají to unit testy na obou platformách.

## Cache a přepnutí firmy

| Platforma | Klíčování                                                             | Vyčištění                                                                       |
| --------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Web       | `localStorage` klíče `vystaveno.*`                                    | logout + `switchCompany` (zahodí všechny tenant klíče, tvrdý přechod na `/app`) |
| Mobil     | in-memory `TenantCacheRegistry`, preference zkratek klíčované `userId | companyId`                                                                      | logout, forced logout, `switchCompany`; shell je klíčovaný `companyId`, takže se přestaví celý back stack |

Jiný uživatel na stejném zařízení tak nikdy nezdědí moduly ani navigaci předchozího.

# QA checklist — placené moduly

Legenda: ✅ = pokryto automatizovaným testem · 🖐 = ruční krok (staging)

Příprava: staging s obnovenou produkční zálohou, `Entitlements__Enforce=true`, platform admin účet
(`users.is_platform_admin = true` + vlastní firma), testovací firma na tarifu `free`.

## 1. Backend — nárok a vynucení

| #    | Případ                                               | Očekávání                                     | Stav                                                                                      |
| ---- | ---------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1.1  | Firma s aktivním modulem                             | 200                                           | ✅ `Company_with_module_in_plan_has_access`                                               |
| 1.2  | Firma bez modulu                                     | 403 + `reason=module_not_in_plan`             | ✅ `Free_plan_has_no_access_to_pos_even_for_owner`                                        |
| 1.3  | UI gating obejit přímým API voláním (POST)           | 403, akce se neprovede                        | ✅ `Ui_gating_cannot_be_bypassed_by_direct_api_mutation`                                  |
| 1.4  | Člen jiné firmy na cizí data                         | 404/403, nikdy data                           | ✅ `Member_of_another_company_cannot_read_its_entitlements` + `CrossTenantIsolationTests` |
| 1.5  | Správná role, ale bez modulu                         | 403                                           | ✅ `Correct_role_without_entitlement_is_still_rejected`                                   |
| 1.6  | Doplněk v nejvyšším tarifu bez grantu                | 403; po grantu 200 **bez dalšího zapínání**   | ✅ `Addon_module_needs_explicit_grant_not_just_top_plan`                                  |
| 1.7  | Aktivní zkušební doba                                | plný přístup vč. zápisů                       | ✅ `Active_trial_grants_full_access`                                                      |
| 1.8  | Zkušební doba v ochranné lhůtě                       | zápisy stále projdou                          | ✅ `Trial_inside_grace_period_still_writes`                                               |
| 1.9  | Po ochranné lhůtě                                    | čtení 200, zápis 403 `subscription_read_only` | ✅ `Expired_trial_is_read_only_but_keeps_data_and_export`                                 |
| 1.10 | Pozastavené předplatné                               | jen `core`, 403 `subscription_locked`         | ✅ `Suspended_subscription_is_locked_to_core_only`                                        |
| 1.11 | Zrušené, ale zaplacené období                        | plný přístup do konce období                  | ✅ `Cancelled_subscription_keeps_access_until_paid_period_ends`                           |
| 1.12 | Promo grant                                          | modul aktivní, audit `EntitlementGranted`     | ✅ `Platform_admin_can_grant_trial_promo_and_manual_entitlements_with_audit`              |
| 1.13 | Referral grant se stejným `externalRef` 2×           | jeden grant                                   | ✅ `Grant_with_same_external_ref_is_idempotent`                                           |
| 1.14 | Expirovaný grant                                     | 403                                           | ✅ `Expired_grant_no_longer_opens_the_module`                                             |
| 1.15 | Revokovaný grant                                     | 403, historie zůstává (`Revoked`)             | ✅ `Revoked_grant_closes_the_module_and_keeps_history`                                    |
| 1.16 | Downgrade `growth → standard`                        | zmizí jen gastro; pos i fakturace zůstanou    | ✅ `Downgrade_removes_only_matching_modules`                                              |
| 1.17 | Přepnutí firmy                                       | jiný tarif, jiné moduly                       | ✅ `Switching_company_switches_plan_and_modules`                                          |
| 1.18 | Historická firma bez předplatného                    | nepřišla o nic (vč. doplňku)                  | ✅ `Legacy_company_without_subscription_keeps_everything`                                 |
| 1.19 | Billing event aplikuje změnu                         | tarif se změní                                | ✅ `Billing_event_applies_change_and_replay_is_idempotent`                                |
| 1.20 | Replay stejného eventu po ruční změně                | `replayed: true`, **nic nepřepíše**           | ✅ tamtéž                                                                                 |
| 1.21 | Event bez obsahu                                     | 422                                           | ✅ `Billing_event_without_payload_is_rejected`                                            |
| 1.22 | Uložení dopočítaného stavu (`GracePeriod`/`Expired`) | 422                                           | ✅ `Computed_statuses_cannot_be_stored`                                                   |
| 1.23 | Neznámý tarif                                        | 422                                           | ✅ `Unknown_plan_is_rejected`                                                             |
| 1.24 | Audit u změny tarifu                                 | `SubscriptionPlanChanged`                     | ✅ `Subscription_change_is_audited`                                                       |
| 1.25 | Zákazník si zapne modul mimo tarif                   | 403 `module_not_in_plan`, modul se nezapne    | ✅ `Owner_cannot_self_enable_module_outside_plan`                                         |
| 1.26 | Zákazník zúží volbu v rámci tarifu                   | 200, vypnutý modul odmítne API                | ✅ `Owner_can_narrow_selection_within_plan`                                               |
| 1.27 | Employee na billing administraci                     | 403                                           | ✅ `Employee_cannot_manage_subscription_but_sees_own_snapshot`                            |
| 1.28 | Shadow mód                                           | chybějící nárok neblokuje, jen loguje         | ✅ `Shadow_mode_logs_but_does_not_block`                                                  |
| 1.29 | `/me` a `/entitlements` vracejí totéž                | shodné moduly i tarif                         | ✅ `Me_and_entitlements_return_identical_modules`                                         |
| 1.30 | Veřejné API bez nároku na modul scope                | 403 i s platným tokenem                       | ✅ `PublicApiTests` (module gating)                                                       |
| 1.31 | Veřejné API zápisový scope po expiraci               | 403                                           | 🖐 (kód: `ScopeAuthorizationHandler` + `IsReadOnlySafe`)                                  |

## 2. Backend — hranice a bezpečnost

| #   | Případ                             | Očekávání                                     | Stav                                                                            |
| --- | ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| 2.1 | `companyId` v těle requestu        | ignorováno, bere se z tokenu                  | ✅ konvence + `HttpTenantIsolationTests`                                        |
| 2.2 | `module`/`plan` poslané klientem   | server je nečte                               | ✅ (v kontraktu nejsou)                                                         |
| 2.3 | 403 neprozradí chybějící oprávnění | u role žádný `reason`                         | ✅ `ProblemDetailsAuthorizationResultHandler`                                   |
| 2.4 | Snapshot neobsahuje interní data   | žádné ceny, `note`, `externalRef`, cizí firmy | ✅ `Snapshot_exposes_plan_modules_and_locked_modules_without_billing_internals` |
| 2.5 | Každý endpoint má gate             | konvenční test                                | ✅ `EndpointAuthorizationConventionTests`                                       |
| 2.6 | Owner není platform admin          | 403 na `/admin/billing`                       | ✅ `Member_of_another_company_cannot_read_its_entitlements`                     |
| 2.7 | Odebrání platform admin práva      | platí okamžitě (čte se DB, ne claim)          | 🖐 nastav `false` a zavolej `/admin/billing`                                    |
| 2.8 | Audit neobsahuje platební údaje    | jen reference                                 | 🖐 projít `GET /company/audit`                                                  |

## 3. Web / PWA (Playwright + ruční)

| #    | Případ                                    | Očekávání                                                      | Stav                                  |
| ---- | ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| 3.1  | Navigace odpovídá tarifu                  | zamčené moduly nejsou v menu                                   | 🖐 + ✅ `modules.spec.ts`             |
| 3.2  | Přímá URL na modul mimo tarif             | `/app/modul/:module` s vysvětlením přínosu                     | ✅ `routes.spec.ts`                   |
| 3.3  | Stránka vysvětlení není sama zamčená      | žádná redirect smyčka                                          | ✅ tamtéž                             |
| 3.4  | Dostupný modul projde                     | bez přesměrování                                               | ✅ tamtéž                             |
| 3.5  | Přímé API volání z konzole bez modulu     | 403, UI ukáže lidskou hlášku                                   | 🖐                                    |
| 3.6  | Owner/Admin vidí cestu k upgradu          | „Zobrazit možnosti" / „Přejít na ceník"                        | 🖐                                    |
| 3.7  | Employee nevidí billing administraci      | žádné CTA, `canManageSubscription=false`                       | ✅ backend + 🖐 UI                    |
| 3.8  | Zamčený modul nevypadá jako rozbitá appka | žádné „Server je nedostupný"                                   | 🖐                                    |
| 3.9  | Změna entitlementu se po refreshi projeví | nový modul v navigaci                                          | 🖐 (grant přes admin → F5)            |
| 3.10 | Přepnutí firmy změní navigaci i data      | tvrdý přechod na `/app`, žádná data původní firmy              | 🖐 účet ve 2 firmách s různými tarify |
| 3.11 | Po přepnutí nezůstala cizí cache          | `localStorage` bez `vystaveno.*` z předchozí firmy             | 🖐 DevTools                           |
| 3.12 | Zkušební doba ≤ 7 dní                     | banner s počtem dní                                            | 🖐                                    |
| 3.13 | Ochranná lhůta                            | banner „je potřeba obnovit", vše funguje                       | 🖐                                    |
| 3.14 | Režim jen pro čtení                       | banner + zápis skončí českou hláškou, export funguje           | 🖐                                    |
| 3.15 | Pozastavený přístup                       | banner s odkazem na podporu                                    | 🖐                                    |
| 3.16 | Nastavení: modul mimo tarif               | nedostupný + „Obsahuje …"                                      | 🖐                                    |
| 3.17 | Stránka Předplatné                        | tarif, co je v ceně, co lze přidat; **žádná lokální aktivace** | ✅ `subscription.spec.ts` + 🖐        |
| 3.18 | Texty neobsahují interní pojmy            | ✅ test nad upsell copy                                        | ✅ `entitlements.spec.ts`             |
| 3.19 | axe serious/critical na upsell stránce    | 0 nálezů                                                       | 🖐 `npm run test:e2e` (a11y)          |

## 4. Mobil (Android + iOS)

| #    | Případ                                     | Očekávání                                        | Stav                                                 |
| ---- | ------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------- |
| 4.1  | Navigace odpovídá snapshotu                | zamčený modul není v bottom nav ani v hubu       | ✅ `EntitlementGatesTest` + `NavigationCatalogTest`  |
| 4.2  | Stará cache s modulem, který firma pozbyla | `lockedModules` vyhraje → zamčeno                | ✅ `locked_list_wins_over_a_stale_module_list`       |
| 4.3  | Chybějící snapshot (starší backend)        | fail open, appka se nezablokuje                  | ✅ `missing_snapshot_fails_open…`                    |
| 4.4  | Pozastavený přístup                        | jen `core`                                       | ✅ `locked_access_narrows_everything_to_core`        |
| 4.5  | Režim jen pro čtení                        | obrazovky zůstanou (data jsou čitelná)           | ✅ `read_only_keeps_navigation…`                     |
| 4.6  | 403 z důvodu tarifu                        | konkrétní česká hláška, ne „chyba načítání"      | ✅ `plan_rejections_get_their_own_czech_explanation` |
| 4.7  | Hlášky bez interních pojmů                 | ✅                                               | ✅ `plan_messages_never_leak_internal_wording`       |
| 4.8  | Deep link do zamčeného modulu              | vysvětlení, ne prázdná/rozbitá obrazovka         | 🖐                                                   |
| 4.9  | Restart aplikace                           | `restore()` → `/me` → aktuální snapshot          | 🖐                                                   |
| 4.10 | Návrat z pozadí                            | `refreshEntitlements()` (Android `onResume`)     | 🖐                                                   |
| 4.11 | Offline s cache                            | navigace z cache, 403 při akci s hláškou         | 🖐                                                   |
| 4.12 | Android build                              | `assembleDebug` projde                           | ✅                                                   |
| 4.13 | iOS build/testy                            | `iosSimulatorArm64Test` projde (`DEVELOPER_DIR`) | ✅                                                   |
| 4.14 | Návrat z pozadí na iOS                     | ⚠️ hook zatím **není** — refresh jen při startu  | 🖐 follow-up                                         |

## 5. Migrace a rollout

| #   | Případ                                       | Očekávání                                         | Stav                                      |
| --- | -------------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| 5.1 | Backfill pokryl všechny živé firmy           | `count(company_subscriptions) ≥ count(companies)` | 🖐 SQL                                    |
| 5.2 | Všechny backfillované firmy na `legacy_full` | `plan_id <> 'legacy_full'` → 0 řádků              | 🖐 SQL                                    |
| 5.3 | Opakovaný běh migrace                        | idempotentní (`ON CONFLICT DO NOTHING`)           | 🖐                                        |
| 5.4 | Shadow mód 24 h                              | žádný `Entitlement shadow` u `legacy_full` firem  | 🖐 log                                    |
| 5.5 | Nová firma po nasazení                       | `Trial` na `growth`, 14 dní                       | 🖐 registrace                             |
| 5.6 | Demo firma                                   | tarif `growth` + doplněk Podpisy                  | ✅ `DemoDataSeederTests` + 🖐 `seed-demo` |
| 5.7 | Rollback přes `Enforce=false`                | nikdo není blokovaný                              | 🖐                                        |
| 5.8 | Support obnoví omylem zamčený účet           | grant je aktivní okamžitě                         | 🖐                                        |

## 6. Spouštění

```bash
# backend
cd vystaveno-api
dotnet build --no-restore -warnaserror
dotnet format --verify-no-changes
dotnet test                                # potřebuje Docker (Testcontainers PG)
dotnet test tests/Vystaveno.IntegrationTests --filter "FullyQualifiedName~EntitlementTests"
```

```bash
# web
cd vystavenocz
npm run lint && npm run build
npx vitest run src/lib/entitlements.spec.ts src/stores/subscription.spec.ts src/router/routes.spec.ts
npm run test:e2e                           # Playwright (mock režim)
npm run test:e2e:audit                     # proti běžícímu API + demo seedu
```

```bash
# mobil
cd vystaveno-mobile
./gradlew :composeApp:testDebugUnitTest :composeApp:assembleDebug
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer ./gradlew :composeApp:iosSimulatorArm64Test
```

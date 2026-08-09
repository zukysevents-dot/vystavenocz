# Migrace a rollout placených modulů

Cíl: zapnout vynucení nároků **bez toho, aby jediný existující zákazník o cokoli přišel**.

## 0. Než začneš

- Migrace jsou forward-only. Před nasazením **pg_dump + ověřený restore** (`docs/deployment.md`,
  `ops/vps-backup.sh`, `ops/vps-verify-backup.sh`).
- Backend na `feat/*` větvi + PR do `main`; deploy je pull-based a nespouští se po merge sám.

## 1. Databázová migrace

`20260726115424_AddEntitlementsAndSubscriptions` — **aditivní**:

- `company_subscriptions` (unique `company_id`, FK cascade na `companies`),
- `company_entitlements` (index `(company_id, module_id, status)` + filtrovaný unique
  `(company_id, module_id, external_ref) WHERE external_ref IS NOT NULL`),
- `billing_events` (unique `event_key`, index `company_id`),
- `users.is_platform_admin` (bool, default `false`).

Nic se nemaže ani nepřepisuje. `dotnet ef migrations has-pending-model-changes` je čisté.

## 2. Backfill existujících firem

Součást téže migrace (SQL, idempotentní `ON CONFLICT DO NOTHING`):

```sql
INSERT INTO company_subscriptions (…)
SELECT gen_random_uuid(), c.id, 'legacy_full', 'Active', NULL, NULL, 14, NULL,
       'Backfill AddEntitlementsAndSubscriptions — grandfathered přístup.', now(), now()
FROM companies c
WHERE c.deleted_at IS NULL
ON CONFLICT (company_id) DO NOTHING;
```

Každá živá firma dostane tarif **`legacy_full`** (obsahuje všechny moduly) ve stavu `Active`
**bez konce období**. Efektivní moduly tak zůstanou přesně tím, co firma dnes má vybrané v
`company_modules` (nebo výchozí sadou, když žádný řádek nemá).

**Proč `legacy_full` a ne odhad komerčního tarifu:** odhadovat by znamenalo riskovat, že někomu vypneme
funkci, kterou dnes používá. Komerční převod je obchodní rozhodnutí, dělá ho support ručně přes
`/api/v1/admin/billing` — ne migrace.

## 3. Výchozí entitlement pro nové firmy

Registrace e-mailem, OAuth registrace i `POST /companies` zakládají `Trial` tarifu **Růst** na 14 dní
(`TrialSubscription.New`, jeden sdílený tvar pro všechny tři cesty). Audit `SubscriptionTrialStarted`.

## 4. Feature flag pro postupné zapnutí

```
Entitlements__Enforce=false      # shadow/audit mód
Entitlements__DefaultPlanForMissingSubscription=legacy_full
```

- `Enforce=false` → chybějící nárok se **jen zaloguje** (warning `"Entitlement shadow: firma {CompanyId}
tarif {PlanId} by dostala {Reason} na {Permission} (modul {Module})"`) a request projde.
- `Enforce=true` (default) → ostré vynucení.

Přepínač je jediné místo, kde se vynucení vypíná — žádné rozházené podmínky v controllerech.

## 5. Shadow / audit mód — doporučený postup

1. Nasaď s `Entitlements__Enforce=false`.
2. Sleduj logy 24–72 h. Každý warning `Entitlement shadow` = firma, které by ostré zapnutí něco vzalo.
3. Vyhodnoť:
   - Warning u firmy na `legacy_full` → **chyba v katalogu/mapování**, ne obchodní případ. Oprav kód.
   - Warning u firmy na komerčním tarifu → doplň grant nebo uprav tarif přes admin workflow.
4. Až je log 24 h čistý, přepni `Enforce=true`.

## 6. Monitoring

| Signál                                                                                 | Kde                         | Co znamená                                       |
| -------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| warning `Entitlement shadow`                                                           | log API                     | v shadow módu: budoucí zamítnutí                 |
| 403 s `reason=module_not_in_plan`                                                      | access log / APM            | zamčený modul (v pořádku, pokud odpovídá tarifu) |
| 403 s `reason=subscription_read_only`                                                  | access log                  | firma po expiraci se snaží zapisovat             |
| 403 s `reason=subscription_locked`                                                     | access log                  | pozastavená firma                                |
| audit `SubscriptionPlanChanged`, `EntitlementGranted/Revoked`, `BillingEventProcessed` | `GET /api/v1/company/audit` | každá změna nároku                               |

**Alert, který stojí za zapnutí:** skok 403 `module_not_in_plan` u firem s tarifem `legacy_full` — ta
kombinace by neměla nikdy nastat a znamená chybu v katalogu nebo ztracený backfill.

## 7. Rollback

Bez migrace zpět, ve třech úrovních:

1. **Okamžitě:** `Entitlements__Enforce=false` + restart → nikdo není blokovaný, vše se jen loguje.
2. **Data:** vrátit firmě tarif/grant přes `/api/v1/admin/billing` (auditované, dohledatelné).
3. **Krajní případ:** `DELETE FROM company_subscriptions WHERE company_id = …` → firma spadne na
   `DefaultPlanForMissingSubscription` (dokud je `legacy_full`, má všechno).

Down migrace existuje (dropne tři tabulky + sloupec), ale **není** rollback plán — je to poslední
možnost při havárii schématu a znamená ztrátu evidence nároků.

## 8. Komunikace pro zákazníky

Existující zákazníci **nedostávají žádnou zprávu při technickém nasazení** — nic se jim nemění
(`legacy_full`). Zpráva patří až ke komerčnímu převodu konkrétní firmy a musí obsahovat:

- co má dnes zapnuté a co bude v navrženém tarifu,
- co se stane po konci zkušební doby / období: **14 dní ochranné lhůty s plným přístupem**, pak režim
  jen pro čtení — data zůstávají, jde je prohlížet i vyexportovat,
- že o změnu tarifu žádá majitel nebo správce,
- kontakt na podporu.

Zákazníkovi se **nikdy** nezobrazuje `403`, `feature flag`, `module_not_in_plan`, `entitlement`,
`billing event` ani interní názvy tarifů/API. Kontroluje to unit test nad upsell texty.

## 9. Support: omylem zamčený účet

1. `GET /api/v1/admin/billing/companies/{companyId}` → tarif, efektivní stav, granty, efektivní moduly.
2. Rychlá záplata: `POST …/entitlements` s `source=manual_grant`, `endsAt` např. +30 dní a poznámkou
   „dočasně do vyřešení" → modul je aktivní **okamžitě**, bez zásahu zákazníka.
3. Systémová oprava: `PUT …/subscription` (tarif, období, případně `Status=Active`).
4. Obnova po pozastavení: `PUT …/subscription` s `Status=Active` (+ `currentPeriodEnd`).
5. Vše je auditované; grant se dá revokovat (`DELETE …/entitlements/{id}`) a historie zůstane.

Platform admin potřebuje `users.is_platform_admin = true` (provozní SQL) a **vlastní firmu** — JWT
s claimem `companyId` prochází revalidací členství, takže token bez existujícího členství skončí 401.

```sql
UPDATE users SET is_platform_admin = true WHERE email = 'podpora@vystaveno.cz';
```

## 10. Test na stagingu před produkcí

1. Restore produkční zálohy do stagingu.
2. Migrace → zkontroluj backfill:
   ```sql
   SELECT count(*) FROM companies WHERE deleted_at IS NULL;         -- N
   SELECT count(*) FROM company_subscriptions;                       -- musí být ≥ N
   SELECT count(*) FROM company_subscriptions WHERE plan_id <> 'legacy_full';  -- 0
   ```
3. `Enforce=false` → projdi `docs/deploy-smoke-checklist.md`; log nesmí mít `Entitlement shadow`.
4. `Enforce=true` → projdi smoke znovu + [qa-checklist.md](qa-checklist.md).
5. Na jedné testovací firmě vyzkoušej celý cyklus: trial → expirace → grace → read-only → grant →
   downgrade → pozastavení → obnova.
6. Ověř mobil: Android i iOS build, zamčený modul, deep link, restart, návrat z pozadí.

## 11. Co musí rozhodnout vlastník produktu před ostrým zapnutím

| #   | Rozhodnutí                                                    | Dnešní implementace (změnitelná)                                                                 |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Skladba tarifů `free`/`standard`/`growth`                     | viz [module-access-matrix.md](module-access-matrix.md)                                           |
| 2   | Ceny (měsíc/rok) a jejich provázání s `SubscriptionPlans`     | ceník na webu ještě mluví o „Vystaveno Pro" a modulárních cenách — **nesedí s katalogem tarifů** |
| 3   | Délka zkušební doby a její tarif                              | 14 dní na `growth`                                                                               |
| 4   | Délka ochranné lhůty                                          | 14 dní, plný přístup                                                                             |
| 5   | Tarif po neúspěšné konverzi                                   | `free` (jádro + fakturace) — **není nikde automatizované**, dnes to udělá support                |
| 6   | Zda po expiraci nechat čtení + export (dnes ano) nebo tvrději | `read_only` s exporty (zákonná úschova + GDPR portabilita)                                       |
| 7   | Kdy nasadit `locked`                                          | jen ruční eskalace, nikdy automaticky                                                            |
| 8   | Objemové limity (faktury/uživatelé/pobočky)                   | **neexistují** — `limits` je prázdné, viz níže                                                   |
| 9   | Kdo je platform admin                                         | seznam e-mailů pro provozní SQL                                                                  |
| 10  | Kdy utáhnout `DefaultPlanForMissingSubscription` na `free`    | po ověření backfillu na produkci                                                                 |
| 11  | Kdy a jak převést `legacy_full` firmy na komerční tarify      | ruční proces supportu; potřebuje obchodní playbook                                               |

## 12. Vědomě mimo tento milník

| Co                                                  | Proč / co by to znamenalo                                                                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objemové limity (počet faktur, uživatelů, poboček)  | zadání je zakazuje bez výslovného product rozhodnutí. `limits` je stabilní prázdné pole v kontraktu; systém by byl oddělený usage-limit resolver, ne rozšíření modulů.                    |
| Entity `SubscriptionPlan`/`PlanModule` v DB         | tarify jsou kód (`SubscriptionPlans`). Migrace na tabulku = doplnit `subscription_plans` + nechat katalog jako seed, klíče zůstávají.                                                     |
| Samoobslužná změna tarifu zákazníkem                | vyžaduje platební bránu. Dnes: „Přejít na ceník" / „Napsat podpoře"; `IsSelfServiceUpgrade` je připravené.                                                                                |
| Ostré platby a webhook brány                        | `POST /admin/billing/events` má už tvar webhooku a je idempotentní; reálný webhook = nový `[AllowAnonymous]` controller, který **ověří podpis** a zavolá stejnou službu.                  |
| Automatické promo/referral → nárok                  | evidence (`SubscriptionAttribution`, `GrowthAttribution`) nárok nevytváří sama; grant vzniká přes billing workflow. Záměr: dokud nárok nevznikne, UI nesmí bonus prezentovat jako platný. |
| Osobní (uživatelské) předplatné                     | nárok je na firmě (uživatel může být ve víc firmách, každá jiný tarif). Rozšíření by bylo `UserEntitlement` s explicitním pravidlem skládání — nikdy záměna za firemní nárok.             |
| Zápisové CTA vypnuté na každé stránce v `read_only` | server zápisy blokuje a klient dostane konkrétní českou hlášku; `features` se navíc serverově zúží, takže role-gated CTA zmizí. Ruční projití ~40 stránek zůstává follow-up.              |
| Přepínač firem na mobilu                            | mobil nemá multi-company přepínač (token nese jednu firmu). Až vznikne, musí volat `TenantCacheRegistry.clearAll()` + refetch `/me` jako web.                                             |
| Retence `billing_events`                            | bez objemu není co mazat; purge job podle skutečného provozu.                                                                                                                             |

## 13. Sekvence nasazení (zkráceně)

```
1. záloha + ověřený restore
2. deploy backendu s Entitlements__Enforce=false
3. migrace (auto při startu / dle deploy procesu) → zkontrolovat backfill SQL
4. 24–72 h sledovat "Entitlement shadow" v logu
5. opravit nálezy (kód / granty)
6. Entitlements__Enforce=true + restart
7. deploy webu a mobilu (gating + upsell + hlášky)
8. smoke checklist + qa-checklist
9. (později, po ověření) DefaultPlanForMissingSubscription=free
```

Krok 6 nikdy nespouštěj, dokud krok 4 neproběhl čistě.

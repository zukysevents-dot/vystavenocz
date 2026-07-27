# Migrace a rollout modulového vynucení (web + mobil)

Navazuje na `docs/billing/migration-and-rollout.md` (backend). Tady je navíc to, co přidala parita
s mobilem: klient už nedělá fail-open, takže **chyba v datech firmy se projeví jako zamčená
aplikace, ne jako tichá tolerance**. Proto se nesmí zapnout tvrdé vynucení dřív, než data sedí.

## Co se změnilo v riziku

Do 2026-07-26 platilo: prázdný seznam modulů = klient odemkne všechno. Nově je mobil fail-closed
(`ModuleGates.normalize` vrací jen `core`) a web má stejné pravidlo pro API režim. Důsledek:

- firma bez řádků v `company_modules` **musí** dostat moduly z tarifu (resolver to dělá:
  prázdná volba = `ProductModules.DefaultEnabled`),
- firma bez `CompanySubscription` dostane `Entitlements:DefaultPlanForMissingSubscription`,
- jakýkoli výpadek `/me` = uživatel vidí jen `core`, ne prázdné obrazovky s 403.

## Postup

1. **Inventář** — `SELECT c.id, c.name, s.plan_id, s.status, array_agg(m.module_id)` přes
   `companies ⟕ company_subscriptions ⟕ company_modules`. Ulož jako výchozí snímek.
2. **Mapování** — pro každou firmu urči cílový tarif podle toho, co reálně používá
   (POS prodeje → Provoz, rezervace/CRM → Růst, jen faktury → Základ).
3. **Backfill** — doplň `CompanySubscription` (tarif, status, období) a případné
   `CompanyEntitlement` granty pro doplňky. `company_modules` needituj za zákazníka — samostatný
   grant je aktivní i bez volby.
4. **Audit rozdílů** — porovnej efektivní moduly z resolveru s modulem, který firma skutečně
   používala za posledních 30 dní (audit log + doklady). Rozdíl = kandidát na grant, ne na zamčení.
5. **Shadow mód** — `Entitlements:Enforce=false`. Server jen loguje
   `Entitlement shadow: firma … by dostala …`. Nechat běžet minimálně jeden fakturační cyklus.
6. **Vyhodnocení shadow logů** — každá firma s opakovaným `module_not_in_plan` na modulu, který
   běžně používá, se řeší **před** zapnutím (grant nebo změna tarifu).
7. **Zapnutí** — `Entitlements:Enforce=true`, `DefaultPlanForMissingSubscription` z `legacy_full`
   na `free` až po ověření. Klienti se dorovnají sami: web přes `vystaveno:entitlement-stale` →
   `reloadMe()`, mobil při app resume (`refreshEntitlements`) a po přepnutí firmy.
8. **Monitoring** — sleduj poměr 403 s `reason` k celkovým požadavkům, po modulech a po firmách.
   Skok u jedné firmy = špatný backfill.
9. **Rollback** — `Entitlements:Enforce=false` (okamžitý, bez migrace) a/nebo vrácení
   `DefaultPlanForMissingSubscription`. Stavy `GracePeriod`/`Expired` se nikam neukládají, počítají
   se z dat — rollback je změna konfigurace, ne datová oprava.
10. **Support postup pro omylem zamčenou firmu** — přidat `CompanyEntitlement` grant modulu
    (aktivní ihned, `EndsAt` např. +30 dní) a poprosit uživatele o restart/obnovení aplikace.
    Nezapisovat do `company_modules` cizí firmě — interceptor stampuje `CompanyId` z kontextu
    requestu a řádek by skončil u supportu.

## Klientská strana rolloutu

| Krok               | Web                                                           | Mobil                                                                        |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Vydání             | běžný deploy, snapshot přijde z `/me`                         | store release; starší build stále gatuje podle `modules`                     |
| Zastaralý snapshot | 403 s `reason` vyvolá `reloadMe()`                            | `refreshEntitlements()` při návratu do aplikace                              |
| Přepnutí firmy     | nové tokeny + zahození tenant cache + tvrdý přechod na `/app` | nové tokeny + `TenantCacheRegistry.clearAll()` + shell klíčovaný `companyId` |
| Odhlášení          | smaže session i tenant klíče                                  | smaže tokeny i cache                                                         |

## Kontrola před zapnutím

- [ ] `npm run audit:modules` — katalog backend/web/mobil sedí.
- [ ] `src/lib/module-parity.spec.ts` a `ScreenAccessTest` zelené.
- [ ] Shadow logy bez opakovaných `module_not_in_plan` u aktivních firem.
- [ ] Zálohovaná DB a ověřený rollback konfigurace.
- [ ] Support ví, jak vydat grant (bod 10).

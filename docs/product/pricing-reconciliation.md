# Sjednocení ceníku a billingového zdroje pravdy

**Roadmap bod:** `INV-06`  
**Stav:** rozhodovací a implementační podklad; ceny nejsou schválené

## Ověřený stav

- `src/lib/pricing.ts` obsahuje veřejný modulární ceník, ale jednotlivé ceny jsou označeny jako **orientační**.
- Stejný soubor obsahuje starší `PRO_PRICING` (159 Kč měsíčně / 1 200 Kč ročně).
- `PredplatnePage.vue` a paywall používají pouze `PRO_PRICING`; aktivace je lokální MVP mock bez platební autority.
- Veřejný ceník umí skládat moduly a balíček, ale nenastavuje skutečné entitlementy firmy ani billing.

Proto dnes nesmí marketing tvrdit, že si zákazník může koupit jednotlivý modul za zveřejněnou cenu, ani že tlačítko Aktivovat Pro založí placené předplatné.

## Rozhodnutí, které musí schválit obchod

Jedno explicitní rozhodnutí vyplní pro každý prodejný plán: název, měsíční cenu, roční cenu, zahrnuté moduly, limity, příplatkové jednotky, DPH text, trial a migraci stávajících zákazníků. Bez něj nelze bezpečně „snížit ceník“ ani přepnout billing.

Dokud není rozhodnutí, veřejný web může používat jen označení „orientační návrh“ nebo sběr zájmu; aplikace ukazuje trial jako ukázkový, ne jako aktivní placený produkt.

## Cílový kontrakt

1. Backend je jediný zdroj `PlanCatalog` a `CompanySubscription`: plán, cena, měna, billing interval, moduly, limity, trial a stav.
2. `GET /me` vrátí aktivní entitlementy. App shell je používá pro UI, ale server je autoritativně vynucuje.
3. Landing i aplikace čtou stejný katalog; `PRICING_MODULES` zůstane jen prezentační metadata (výsledek a popis), ne cena.
4. Checkout/provider po potvrzené platbě zapíše idempotentní subscription event. Redirect ani klientský localStorage plán neaktivuje.
5. Claim/referral benefit z `subscription-claims-referrals-v1.md` se aplikuje pouze do tohoto ledgeru.

## Akceptace

- jedna cena/plán se na landing, v aplikaci, invoice a provider checkoutu shoduje;
- změna ceníku je verzovaná, platí až od určeného data a nemění historickou fakturu;
- uživatel vidí, co mu plán přináší pro jeho obor, a kliknutím z modulu přejde na konkrétní plán;
- trial, aktivace, zrušení i refund vycházejí ze serverového stavu;
- žádný kód, referral ani URL parametr nemění tarif pouze na klientovi.

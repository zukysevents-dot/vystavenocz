# Standa — co dodat pro novou roadmapu Vystaveno

**Účel:** jediný předávací seznam pro backend/identity práci. Čti společně s `AGENTS.md`, `CLAUDE.md` a odkázanými kontrakty. Existující frontend se nepřepisuje; napojuje se na autoritativní API.

## Hranice

Standa vlastní serverový model rolí a oprávnění, multi-company kontext, webovou identitu/OAuth a autoritativní billing. Nativní Android/iOS a AI/MCP nejsou součástí tohoto seznamu. Žádný bod nesmí používat klientský `localStorage` jako zdroj oprávnění, firmy, předplatného nebo výhod.

## Pořadí realizace

| Pořadí | Balíček | Výstup | Co odemkne |
| --- | --- | --- | --- |
| A | Autorizační kontrakt + multi-company | bezpečný aktivní company context | `INV-02`, scope všech dalších API |
| B | Web identity | Google/Apple přihlášení vedle e-mailu | dokončení `INV-05` |
| C | CRM API | timeline, úkoly, další krok nad `Client` | `INV-08` |
| D | Subscription katalog a billing ledger | jeden zdroj ceny/entitlements | `INV-06`, `INV-07` |
| E | Claim/referral + analytika | chráněné kampaně a atribuce | `INV-07`, `INV-10–12` |
| F | Klientská zóna: platba faktury | idempotentní checkout/webhook | další krok `INV-09` |

## A — autorizační kontrakt a více firem

1. Dodat reálně vynucovaný serverový permission model podle `docs/backend/role-a-opravneni.md`; frontendové skrývání položek nestačí.
2. Rozlišit `Company` od `Location`: jeden účet má seznam dostupných firem, každá requestová operace má ověřený aktivní company context.
3. Přidat bezpečný přepínač kontextu (např. serverem vydaný short-lived context/token nebo explicitní header ověřený proti membership). Nikdy nepřijímat libovolné `companyId` jen od klienta.
4. `/me` musí vracet aktivní firmu, dostupné firmy, moduly/features a capabilities. Po změně kontextu se všechny company-scoped endpointy přepnou atomicky.
5. Scope pobočky se uplatní až uvnitř aktivní firmy. Cache, idempotency a audit nesmí přenést data mezi firmami.

**Akceptace:** cizí firma/pobočka vrací bezpečně 403/404; souběžné přepnutí nevydá data předchozí firmy; integrační test pokryje dva tenanty, dva uživatele a pobočkový scope.

## B — webová identita Google a Apple

1. Zachovat e-mail/heslo a přidat serverový OAuth/OIDC authorization-code flow s PKCE pro Google a Apple.
2. Uložit pouze provider subject, ověřený e-mail a vazbu na interního uživatele; žádné access/refresh tokeny poskytovatele do SPA nebo logů.
3. Ošetřit bezpečné propojení s existujícím účtem až po ověření e-mailu a explicitním potvrzení; nikdy nespojovat účty jen podle neověřeného e-mailu.
4. Redirect URI, state, nonce, PKCE, Apple client secret a rotace klíčů patří na server/vault. Dodat dev/sandbox konfiguraci a runbook proměnných bez skutečných tajemství.

**Akceptace:** login i registrace fungují pro e-mail, Google a Apple; replay state/nonce selže; návrat na onboarding zachová zamýšlený pokračovací krok; účty různých firem se nepropojí omylem.

## C — CRM MVP API

Implementovat přesně [`crm-mvp-v1.md`](./crm-mvp-v1.md): timeline a úkoly nad existujícím `Client`, ne nový kontakt/deal. Začít databázovým modelem, cursor endpointem timeline, CRUD úkolů, idempotency, auditem a serverovými filtry. Poznámky jsou interní a nikdy se nedostanou do klientské zóny.

## D — subscription katalog a billing ledger

Implementovat cíl z [`../product/pricing-reconciliation.md`](../product/pricing-reconciliation.md): `PlanCatalog`, `CompanySubscription`, verzované ceny, serverové entitlementy v `/me` a idempotentní subscription eventy.

**Nezačínat** ostrým checkoutem, dokud majitel neschválí názvy plánů, ceny, DPH, limity a migraci. Do té doby lze dodat model, API a admin konfiguraci se seed/dev katalogem jasně označeným jako neveřejný.

## E — claim/referral a analytika

Po existenci billing ledgeru implementovat [`subscription-claims-referrals-v1.md`](./subscription-claims-referrals-v1.md). Povinné jsou HMAC lookup kódů, rate limit, jedna atribuce na firmu, self-referral ochrana, idempotency, append-only benefit ledger, reversal a pseudonymní funnel události. Benefit se smí uplatnit až z potvrzené billingové události, nikdy z frontendového tlačítka.

## F — klientská zóna a online úhrada

Existující tokenová klientská zóna a schválení nabídky zůstávají. Pro online úhradu implementovat [`online-platba-faktur.md`](./online-platba-faktur.md) až po provider rozhodnutí z `docs/product/viva-payments-research.md`: serverově vytvořený checkout, jednorázová vazba na fakturu, ověření částky/měny, idempotentní webhook a refund. Redirect není potvrzení platby.

## Co neřešit v těchto balíčcích

- nepřepisovat hotové faktury, nabídky, klienty, sklad, POS nebo PWA;
- nevytvářet Android/iOS aplikaci, AI/MCP ani paralelní permission model;
- neaktivovat Pro, měsíce zdarma ani referral odměnu v klientovi;
- nemíchat subscription promo s POS akcemi nebo věrnostními body;
- nedávat veřejný endpoint, který prozradí majitele referral kódu, výdělek nebo detail cizí firmy.

## Předání po každém balíčku

Každý PR: aditivní migrace, API kontrakt, unit + PostgreSQL integrační testy, audit/tenant/scope testy, update `AGENTS.md` a `CLAUDE.md`, a krátký smoke postup pro frontend. Po merge stačí do roadmapy přidat commit/PR a označit dostupný endpoint; frontend naváže bez čekání na chat.

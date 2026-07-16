# Subscription claim kódy a referral V1

**Roadmap body:** `INV-07`, `INV-10`, `INV-11`, `INV-12`  
**Stav:** implementační kontrakt pro `vystaveno-api`; neimplementováno  
**Rozhodnutí:** oddělené od slev na pokladně, cenových hladin a věrnostních bodů.

## Cíl a hranice

Vystaveno musí bezpečně určit zdroj nového platícího zákazníka, dát mu kampaňovou výhodu a odměnit doporučujícího až po skutečné kvalifikační události. Příkladem může být kampaň „zadej kód do stanoveného data a získej dva fakturační cykly zdarma“, ale datum, délka ani cena nejsou napevno v kódu.

Toto **není** POS promo ani slevový kupon pro zákazníka provozovny. Nevolá `/promotions`, nepřepočítává cenu prodeje a nevstupuje do věrnostního ledgeru zákazníků. Je to serverová evidence nároku na předplatné společnosti.

V1 nezavádí vlastní platební bránu, předplatné ani oprávnění. Dokud není autoritativní billing provider, API smí nárok evidovat a ukázat jeho stav; nesmí klientovi lokálně prodloužit trial ani tvrdit, že je placený plán aktivní.

## Produktový model

| Pojem | Význam |
| --- | --- |
| Kampaň | Časově omezené pravidlo, zdroj a varianta funnelu; může mít více kódů. |
| Claim kód | Jednorázový nebo limitovaný neveřejný kód pro získání výhody nové společnosti. |
| Referral kód | Stabilní neveřejný odkaz/kód doporučující společnosti nebo schváleného ambasadora. |
| Atribuce | Neměnná vazba nově registrované společnosti na jednu kampaň nebo doporučujícího. |
| Nárok | Stav, zda byla výhoda přiznána, čeká na kvalifikaci, byla zrušena nebo spotřebována. |
| Odměna | Samostatný nárok doporučujícího; nepropisuje se přímo do ceny bez billingové události. |

Jedna nová společnost může mít nejvýše jednu akviziční atribuci. Kampaňový claim a referral se mohou zapsat společně jen pokud kampaň výslovně povoluje referral; jinak první platný serverový zápis uzamkne zdroj a další pokus vrátí vysvětlený konflikt. Výhody se nesčítají bez explicitního pravidla kampaně.

## Datový návrh

Vše je tenantově izolované a auditované podle stávajících vzorů API.

```text
SubscriptionCampaign
  id, key, name, status(Draft|Active|Paused|Ended|Revoked)
  startsAt, endsAt, variantKey, source, termsVersion
  benefitKind(FreeBillingPeriods|Credit|ManualReview)
  benefitValue, grantTrigger(ClaimAccepted|FirstPaidSubscription)
  maxClaims, maxClaimsPerReferrer, allowsReferral

SubscriptionCode
  id, campaignId, kind(Claim|Referral), codeLookupHash, displaySuffix
  referrerCompanyId?, ambassadorId?, status(Active|Revoked|Exhausted)
  maxRedemptions, redemptionCount, expiresAt

SubscriptionAttribution
  id, companyId [unique], campaignId, codeId?, referrerCompanyId?
  source, variantKey, capturedAt, claimedAt
  state(Captured|Accepted|Rejected|Qualified|Revoked), rejectionReason?

SubscriptionBenefitLedger
  id, companyId, attributionId, direction(Granted|Consumed|Reversed)
  kind, value, triggerEventId [unique], state(Pending|Available|Applied|Revoked)
  availableAt, expiresAt, note, createdAt
```

`codeLookupHash` je HMAC/SHA-256 normalizovaného kódu se serverovým tajemstvím, nikoli prostý hash ani čitelný kód v databázi. Kód se generuje kryptograficky náhodně s alespoň 128 bity entropie; server při zadání odstraní mezery a pomlčky a porovnává konstantním časem. Benefit používá append-only ledger s unikátním `triggerEventId`, takže retry, souběžný request ani duplicitní webhook nevytvoří druhý měsíc zdarma.

## API kontrakt V1

Přesné capability/role gate doplní Standa; veřejný kód sám o sobě není oprávnění.

### Zachycení a claim nového zákazníka

1. Veřejný odkaz `https://vystaveno.cz/registrace?ref=<code>` uloží frontend jen krátce do signed, httpOnly serverové cookie nebo do serverového registračního draftu. Nesmí být zdrojem pravdy v `localStorage`.
2. Po ověřené registraci a založení společnosti klient zavolá:

```http
POST /api/v1/subscription/claims
Idempotency-Key: <uuid>

{ "code": "VST-…", "termsVersion": "2026-07" }
```

Odpověď `201` vrátí bezpečné shrnutí, například:

```json
{
  "attributionId": "…",
  "state": "Accepted",
  "benefit": {
    "kind": "FreeBillingPeriods",
    "value": 2,
    "state": "Pending",
    "availableAfter": "FirstPaidSubscription"
  }
}
```

Neplatný, prošlý, vyčerpaný nebo odvolaný kód vrací stejnou obecnou `422` zprávu „Kód nelze použít“. Endpoint se rate-limituje podle IP, účtu a společnosti; loguje bezpečnostní událost bez plného kódu. Opakování stejného idempotency klíče a payloadu vrátí původní odpověď, změněný payload `409`.

`GET /api/v1/subscription/claim` vrací přihlášené společnosti pouze vlastní atribuci a stav nároku. Nikdy nevrací cizího ambasadora, počet jeho konverzí ani plný kód.

### Správa kampaní a billing callback

Interní/admin API vytvoří kampaň, náhodné kódy, limit, datum, variantu a benefit. Kód se při vytvoření zobrazí nejvýše jednou; následně je možné zobrazit jen suffix, stav a agregace. Ruční schválení ambasadora i benefit mají samostatný audit se jménem actoru a důvodem.

Billing provider později publikuje interní, idempotentní událost `FirstPaidSubscription(companyId, subscriptionId, eventId)`. V jedné transakci se ověří aktivní atribuce, její trigger a pravidla, zapíše benefit nového zákazníka i případná odměna doporučujícího. Server benefit předá billingové vrstvě; frontend stav pouze zobrazuje.

Storno/refund nebo prokazatelné zneužití publikuje kompenzační událost a vytvoří `Reversed` záznam, nikoli update nebo delete staré odměny.

## Ochrana proti zneužití

- odmítnout self-referral přes stejný účet, firmu, ověřený e-mail, billing customer a další silný identifikátor, který již systém legitimně má; neblokovat pouze podle domény e-mailu;
- jedna firma, účet a billing customer mají jeden aktivní akviziční nárok;
- první kvalifikovaná placená subscription musí být reálně zaplacená po minimální konfigurovatelné době; test/mock platba nekvalifikuje;
- kód nemění cenu objednávky, neopravňuje k přístupu a neprodlouží lokální trial;
- vysoký počet pokusů, rychlá storna nebo propojené platby se označí pro ruční review, automatická penalizace bez důkazu se nedělá;
- odvolání kódu nemaže audit a výslovně určí, zda dříve přiznané výhody zůstávají platné;
- veřejný endpoint nesmí potvrzovat, komu referral patří nebo kolik vydělal.

## Funnel a rozhodování

Do stávajícího analytického sinku se zapisují serverové nebo pseudonymní události `landing_ref_captured`, `registration_started`, `registration_completed`, `company_created`, `claim_submitted`, `claim_accepted`, `claim_rejected`, `trial_started`, `first_paid_subscription`, `benefit_applied`, `referrer_reward_available` a `benefit_reversed`.

Každá nese `campaignKey`, `variantKey`, `source`, čas a anonymizovaný identifikátor session/tenant. Dashboard porovnává konverzi a retention podle varianty, ne jen počet rozdaných kódů. Text kampaně, počet měsíců zdarma a datum se mění konfigurací, ne code deployem.

## Akceptace a další řez

- paralelní uplatnění posledního limitovaného kódu vydá benefit nejvýše jednou;
- replay idempotentního requestu je stabilní a změněný payload vrátí `409`;
- expired/revoked/exhausted/self-referral je odmítnut bez úniku informací;
- nový i doporučující benefit vznikne přesně jednou po kvalifikační billingové události;
- refund/storno vytvoří dohledatelný reversal bez mazání historie;
- rate limit, audit a tenantová izolace projdou integračními testy;
- mobilní web ukáže stav nároku po obnově stránky, ale bez tajného kódu v URL/logu/localStorage.

Implementace čeká na autoritativní subscription/billing kontrakt. Může ale začít datovým modelem, claim endpointem, auditem, ochranami a campaign konfigurací; `grantTrigger=FirstPaidSubscription` zůstane `Pending`, dokud billing událost neexistuje. Frontend pak smí přidat vstup kódu při registraci/onboardingu a stránku „Můj nárok“, nikdy lokální aktivaci placeného plánu.

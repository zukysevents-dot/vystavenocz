# Referral, partnerství a investorská analytika V1

## Co je hotové

V1 propojí doporučující firmu s novou firmou přes jednorázový kód platný 90 dní. Kód se v databázi ukládá jen jako SHA-256 hash. Nová firma může uplatnit právě jednu growth vazbu; self-referral a druhé uplatnění jsou odmítnuté.

| Cesta                                                         | Přístup                                    | Význam                                                         |
| ------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `POST /api/v1/growth/referrals`                               | JWT + `company.manage`                     | Vytvoří referral kód a vrátí plaintext jednou.                 |
| `POST /api/v1/growth/redeem`                                  | JWT + `company.manage` + `Idempotency-Key` | Zachytí vztah nová firma ↔ referral/partner.                   |
| `GET /api/v1/growth/referrals/me`                             | JWT + `company.manage`                     | Vrátí jen vlastní agregované počty.                            |
| `POST/GET /api/v1/growth/partner-profile`                     | JWT + `company.manage`                     | Partnerská přihláška a vlastní tracking.                       |
| `POST /api/v1/growth/partner-invitations`                     | JWT + `company.manage`                     | Kód až po schválení partnera.                                  |
| `GET /api/v1/growth/operations/dashboard`                     | `X-Growth-Operator-Key`                    | PII-free agregát pro interní investorský report.               |
| `POST /api/v1/growth/operations/partners/{companyId}/approve` | `X-Growth-Operator-Key`                    | Interní schválení partnera.                                    |
| `POST /api/v1/growth/operations/qualify-first-payment`        | `X-Growth-Operator-Key`                    | Důvěryhodný billing adapter kvalifikuje první úspěšnou platbu. |

## Pravidla a bezpečnost

- Referral: nová firma i doporučující firma mají nárok na jeden měsíc až po prvním ověřeném billing eventu nové firmy.
- Partner: profil začíná ve stavu `Candidate`; až interní schválení dovolí partnerovi vytvářet kódy. Při kvalifikaci se vznikne jen návrh provize: 20 % čistého předplatného na 12 měsíců, nejdříve 30 dní po inkasu. Žádné peníze se tím nevyplácejí.
- Operační klíč je `Growth:OperatorKey` v deployment secret store. Pokud není nastaven, všechny interní operace vrací 503; klíč se nikdy nesmí poslat do klientského frontend bundle.
- Dashboard obsahuje jen agregované počty a first-party eventy bez e-mailů, názvů firem nebo plaintext kódů.
- `GrowthAttribution.BillingEventId` je unikátní. Replayed qualification je no-op, proto adapter nemůže vytvořit dva nároky/provize.

## Go-live

1. Nastavit silný `GROWTH_OPERATOR_KEY` pouze v deployment secret store; Docker jej předá API jako `Growth__OperatorKey`.
2. Backoffice po kontrole schválí partnera interním endpointem.
3. Budoucí subscription/billing adapter po první **ověřené** úspěšné platbě volá `qualify-first-payment`; návrat z checkoutu ani klientský požadavek k tomu nikdy nestačí.
4. Až bude schválený ceník a billing, adapter podle kvalifikovaného záznamu skutečně připíše měsíc zdarma a připraví payout report. V1 tyto finance záměrně neprovádí lokálně.

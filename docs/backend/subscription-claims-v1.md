# Akviziční a claim kódy V1

## Účel a hranice

`INV-07` eviduje nárok firmy z partnerské nebo akviziční nabídky. Není to platební systém: uplatnění kódu **nesmí** samo zapnout tarif, prodloužit zkušební dobu, vytvořit slevu v POS ani změnit cenu. Tyto kroky smí provést až autoritativní billing systém.

## HTTP kontrakt

| Endpoint                                  | Přístup                | Výsledek                                                                                   |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `POST /api/v1/subscription-claims/redeem` | JWT + `company.manage` | Přijme `{ code, termsVersion }` a povinný `Idempotency-Key`; vrací `201` se stavem nároku. |
| `GET /api/v1/subscription-claims/me`      | JWT + `company.manage` | Vrátí stav nároku aktuální firmy, nebo `204`, pokud žádný nemá (designový prázdný stav).                            |

Tenant je vždy firma z JWT. Jedna firma může mít právě jeden attribution; opakování se stejným idempotency klíčem vrátí stejný výsledek, jiný klíč vrátí `409`.

## Bezpečnost a integrita

- Kód se normalizuje a v databázi hledá pouze přes SHA-256 `LookupHash`; plaintext se neukládá, nevrací ani neaudiuje.
- Kampaň i kód musí být aktivní, v časovém okně, pod limitem a se shodnou verzí podmínek.
- `SubscriptionAttribution` je tenant entita s unikátním `CompanyId` a snapshotem kampaně, varianty, podmínek i benefitu. Pozdější změna kampaně tak nepřepisuje dřívější nárok.
- Audit `SubscriptionClaimAccepted` obsahuje jen klíč kampaně, variantu, verzi podmínek a stav.
- Současné uplatnění chrání unikátní index; po DB konfliktu se vrací jen identický idempotentní výsledek.

## Provozní postup

Kampaně a jejich hashované kódy jsou platformová konfigurace, nikoli nastavení zákaznické firmy. V1 proto neotevírá správu kampaní běžným uživatelům; před distribucí kódu je musí vytvořit interní provozní postup. Napojení na billing má číst snapshotovaný attribution a změnit benefit z `Pending` až po skutečném ověření předplatného.

## Ověření

- platný kód je možné uplatnit jednou pro konkrétní firmu;
- stejné opakování je idempotentní;
- prošlý, odvolaný, vyčerpaný nebo cizí kód vrátí validaci;
- jiná firma neuvidí nárok první firmy;
- audit ani API neobsahují plaintext kód;
- pro ostrý billing je nutné samostatné adapterové a end-to-end ověření.

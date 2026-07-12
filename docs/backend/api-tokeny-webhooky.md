# Backend zadání: API tokeny + webhooky (Public API V1)

**Stav: HOTOVO na backendu** (vystaveno-api, větev `feat/public-api-webhooks`) — tento dokument je
FE↔BE kontrakt pro stránku `Nastavení firmy → API a webhooky`. Integrátorská dokumentace
(podpis webhooku, retry, event katalog) je v backend repu `docs/verejne-api.md`.

## Cíl

Firma propojí Vystaveno s e-shopem/CRM/automatizací bez ručních exportů: API tokeny pro
read-only čtení dat přes `api/public/v1/*` a webhook subscriptions s podepsanými notifikacemi.
V1 je jen čtení; zápisy jsou plánované jako V2. Secrety žijí výhradně na backendu — token
i signing secret se FE zobrazí JEN JEDNOU při vytvoření a nikdy víc.

## Frontend

Stránka `/app/nastaveni/api-webhooky` (`ApiWebhookyPage.vue`, modul `integrations`, UI gate
Owner/Admin) + composables `useApiTokens`/`useWebhooks` přes `http` (jen API režim).
Sdílený `SecretRevealDialog.vue` pro jednorázové zobrazení hodnoty.

## Endpointy (správa, JWT, oprávnění `integrations.api` = jen Owner/Admin)

1. `GET /api/v1/api-tokens` → `ApiToken[]` (bez hodnoty tokenu)

```jsonc
[
  {
    "id": "…",
    "name": "E-shop Shoptet",
    "tokenPrefix": "vst_abcd1234", // prvních 12 znaků — jen identifikace v UI
    "scopes": ["products.read", "sales.read"],
    "expiresAt": null, // ISO | null
    "lastUsedAt": "2026-07-12T06:00:00Z", // | null (stamp max 1×/5 min)
    "createdAt": "…",
  },
]
```

2. `POST /api/v1/api-tokens` — `{ name, scopes[], expiresAt? }` → `201` + navíc
   `"token": "vst_…"` (plaintext JEN teď). Chyby: `422` (název/scopes/expirace v minulosti/cap
   20 aktivních tokenů), `403` (role/modul).
3. `DELETE /api/v1/api-tokens/{id}` → `204`; token okamžitě neplatný. `404` cizí/neexistující.

4. `GET /api/v1/webhook-subscriptions` → `WebhookSubscription[]` (bez secretu)

```jsonc
[
  {
    "id": "…",
    "url": "https://muj-system.cz/webhooky",
    "events": ["invoice.paid", "sale.completed"],
    "isEnabled": true,
    "createdAt": "…",
    "updatedAt": "…",
  },
]
```

5. `POST /api/v1/webhook-subscriptions` — `{ url, events[], isEnabled }` → `201` + navíc
   `"secret": "whsec_…"` (plaintext JEN teď). Chyby: `422` (http:// URL, user:pass v URL,
   neznámý event, cap 10 subscriptions), `503` (chybí `Integrations__SecretEncryptionKey`
   na serveru — vault fail-closed), `403` (role/modul).
6. `PUT /api/v1/webhook-subscriptions/{id}` — `{ url, events[], isEnabled }` → `200`
   (secret se NEMĚNÍ ani nevrací).
7. `DELETE /api/v1/webhook-subscriptions/{id}` → `204` (historie doručení zůstává).
8. `POST /api/v1/webhook-subscriptions/{id}/test` → `202` `{ "eventId": "…" }` — zařadí `ping`;
   doručí ho nejbližší tick workeru (~30 s), výsledek je v historii doručení.
9. `GET /api/v1/webhook-subscriptions/{id}/deliveries?page=&pageSize=` → paged envelope

```jsonc
{
  "items": [
    {
      "id": "…",
      "eventId": "…",
      "eventType": "sale.completed",
      "status": "Succeeded", // Pending | Succeeded | Failed (terminální po 6 pokusech)
      "attemptCount": 1,
      "lastHttpStatus": 200, // | null
      "lastError": null, // zkrácený NE-citlivý popis ("HTTP 500"), nikdy secret/tělo
      "nextAttemptAt": null, // ISO | null — další pokus u Pending
      "lastAttemptAt": "…",
      "createdAt": "…",
    },
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
}
```

## Rozhodnutí (uzavřená)

- V1 read-only; zápisové scopes = V2.
- Správa tokenů/webhooků JEN Owner/Admin (`integrations.api`): token čte data celé firmy,
  location-scoped Manager by si jím rozšířil přístup.
- Eventy V1: `invoice.created/issued/paid/cancelled`, `sale.completed/cancelled`,
  `customer.created/updated`, `product.created/updated/deleted`, `stock.level.changed`
  (import prodejů a skladové transfery eventy negenerují).

## Pozn.

- FE typy: `src/composables/useApiTokens.ts`, `src/composables/useWebhooks.ts`.
- E2E: `e2e/api-webhooky.spec.ts` (mockované API routes).

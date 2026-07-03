# Backend zadání: Online platba faktur (Klientská zóna)

Cíl: zákazník zaplatí fakturu kartou přímo z **Klientské zóny** (veřejný portál
`/klient/:token`, bez přihlášení). **V projektu není žádný platební kód** — je to celé nové a
**jádro je backend** (platební brána + webhook). Secrets brány MUSÍ žít na backendu, nikdy ve FE.

**Frontend:** tlačítko „Zaplatit online" u faktury ve stavu `issued`/`overdue` + redirect na
checkout + návratová stránka. Doplním, jakmile budou endpointy.

## Endpointy (veřejné přes portálový token, BEZ Authorization)

### 1. `POST /public/client/:token/invoices/:id/checkout`

Založí platební session u brány, vrátí URL k přesměrování:

```jsonc
{ "redirectUrl": "https://…brána…/checkout/…" }
```

### 2. Webhook `POST /webhooks/payments` (server-to-server, od brány)

Po úspěšné platbě: ověřit podpis, označit fakturu `paid` (+ `paidAt`), idempotentně.

### 3. Návrat z brány

Success/cancel URL → přesměrovat zpět do portálu se stavem (FE ukáže „zaplaceno / zrušeno").

## Rozhodnutí pro tebe

- **Brána:** Stripe (globální, snadné) vs česká **GoPay / Comgate** (lepší pro CZ zákazníky,
  bankovní převod, Apple/Google Pay). Doporučení: pro český SMB trh spíš GoPay/Comgate.
- **Levná varianta MVP:** místo karetní brány jen **SPAYD QR platba** (QR kód s částkou/VS na
  faktuře — zákazník zaplatí v bankovní appce). Bez brány, bez poplatků, ale bez automatického
  potvrzení (párování podle VS). Chceš tuhle mezicestu jako první krok?

## Pozn.

Faktura má `variableSymbol`/`iban` (viz `src/lib/invoice.ts`) → SPAYD QR jde vygenerovat i čistě
na FE bez brány, kdyby ses rozhodl pro QR variantu.

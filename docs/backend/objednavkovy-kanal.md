# Backend zadání: Vlastní objednávkový kanál (Rozvoz & výdej)

Cíl: zákazník si přes **veřejný odkaz** `/objednavka/:slug` (bez přihlášení) projde menu, dá do
košíku a odešle objednávku — ta naskočí provozovně do **KDS (kuchyně)**, bez provizí Wolt/Uber.
Vzor = veřejná rezervace (`/public/:slug/...`, `http.getPublic/postPublic`, striktně bez auth).

**Frontend:** `PublicOrderPage` + `usePublicOrders` po vzoru `usePublicBooking`; veřejná route
`/objednavka/:slug` načte menu, drží košík a odešle pickup/delivery objednávku bez JWT.
Menu i cena = **server je zdroj pravdy**.

## Endpointy (veřejné, BEZ Authorization)

### 1. `GET /public/:slug/menu`

Vrátí aktivní nabídku provozovny pro veřejné menu:

```jsonc
{
  "categories": [ { "id", "name", "sortOrder" } ],
  "products":   [ { "id", "name", "categoryId|null", "priceWithVat", "vatRate", "available": true } ]
}
```

(Jen položky vhodné k prodeji/objednání. Slug identifikuje provozovnu — stejně jako u rezervací.)

### 2. `POST /public/:slug/orders`

Vytvoří objednávku **bez stolu** (takeaway/rozvoz) → pošle do KDS:

```jsonc
{
  "items": [ { "productId", "quantity" } ],
  "customerName": "…",
  "customerPhone": "…|null",
  "note": "…|null",
  "fulfillment": "pickup" | "delivery",
  "address": "…|null"           // jen u delivery
}
```

Server: **přepočítá ceny sám** (nevěří klientovi), založí Order, zařadí do kuchyňské fronty
(objeví se jako bon v `KuchynePage`). Odpověď: potvrzení (id / číslo objednávky, příp. odhad času).

## Rozhodnutí pro tebe

- Platba: jen **na místě / při převzetí** (MVP), nebo rovnou online (pak se to potká s
  [`online-platba-faktur.md`](./online-platba-faktur.md))?
- Notifikace provozovně o nové objednávce (zvuk v KDS / e-mail)? — MVP může stačit, že bon naskočí.

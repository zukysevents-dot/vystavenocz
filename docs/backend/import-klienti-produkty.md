# Backend zadání: Import klientů a produktů (F9)

**Frontend hotový** — `src/pages/ImportPage.vue` + wizard (`src/import/`, řízený configy
`clientsConfig` / `productsConfig` v `src/import/configs.ts`). Uživatel nahraje CSV/XLSX,
namapuje sloupce, wizard zvaliduje + najde duplicity a v kroku „commit" zapíše záznamy.

## Dobrá zpráva: nový endpoint NENÍ potřeba

Import **nevolá žádný `/import` endpoint** (to `/imports` → 404 nikoho netrápí, FE ho nepoužívá).
Commit běží přes **standardní CRUD** existujících composable — po jednom řádku:

- `useClients().create()` → `POST /clients`, „přepsat duplicitu" → `PUT /clients/{id}`
- `useProducts().create()` → `POST /products`, „přepsat duplicitu" → `PUT /products/{id}`
- před náhledem `ops.load()` → `GET /clients?pageSize=100` / `GET /products?pageSize=100` (kvůli dedupu)

Takže **úkol = zajistit, že tyhle běžné endpointy přijmou celý sadu polí, kterou FE posílá, a
vrátí uloženou entitu se serverovým `id`.** `GET /clients` i `GET /products` už vrací `200`
(ověřeno na živém VPS 2026-07-04). Zbývá potvrdit/doplnit `POST` a `PUT`.

> Zápis `POST` jsem proti produkci netestoval (nechci zakládat data do ostré DB) — proto níže
> uvádím přesný očekávaný tvar; potvrď prosím, že to sedí, nebo doplň.

## `POST /clients` — payload (přesně z FE, `Client` v `src/lib/types.ts`)

```jsonc
{
  "id": "<uuid z klienta>", // server MÁ ignorovat a přidělit vlastní id
  "name": "Firma s.r.o.", // povinné
  "ico": "27074358 | null",
  "dic": "CZ27074358 | null",
  "email": "…@… | null",
  "phone": "+420… | null",
  "street": "… | null",
  "city": "… | null",
  "zip": "… | null",
  "country": "CZ", // FE posílá vždy string (default „CZ")
  "defaultPaymentDays": 14, // number
  "notes": "… | null",
  "createdAt": "ISO", // server-managed → ignorovat z klienta
  "updatedAt": "ISO", // server-managed → ignorovat z klienta
}
```

**Odpověď:** kompletní `Client` včetně serverového `id`, `createdAt`, `updatedAt`.
(FE si serverové `id` uloží — klientské UUID zahazuje.)

## `POST /products` — payload (přesně z FE, `Product` v `src/lib/types.ts`)

```jsonc
{
  "id": "<uuid z klienta>", // server MÁ ignorovat a přidělit vlastní id
  "name": "Produkt", // povinné
  "sku": "IMP-001", // string (může přijít prázdný "")
  "ean": "8590… | null",
  "salePrice": 121, // number — prodejní cena VČETNĚ DPH
  "vatRate": 21, // number (%)
  "purchasePrice": 80, // number | null
  "minQuantity": 0, // number
  "categoryId": "… | null", // import kategorii neplní → chodí null
}
```

**Odpověď:** kompletní `Product` se **serverovým `id`** — je to zdroj pravdy, POS na produkt
odkazuje. Vrácené `id` FE ukládá.

## `PUT /clients/{id}` a `PUT /products/{id}`

Volá se, když uživatel u duplicity zvolí „přepsat". Tělo = stejná pole jako `POST` (u klienta
navíc `updatedAt`). Vrací aktualizovanou entitu.

## Pozn. / na co si dát pozor

- **Idempotence není na serveru** — dedup řeší FE (podle IČO/e-mailu/názvu u klientů,
  SKU/EAN/názvu u produktů) proti už načteným záznamům. Uniqueness constraint na serveru je
  vítaná pojistka, ale ne nutnost pro MVP.
- **Dedup vidí jen prvních 100 existujících** — `ops.load()` čte jednu stránku (`pageSize=100`).
  U velkých katalogů to znamená, že FE nemusí duplicitu poznat. Řešení je na FE (přepnout na
  `listAll`) — **zmiň prosím, jestli chceš, ať to doladím**, ať se to potká s tím, co backend unese.
- **Validace:** `name` povinné, ceny/čísla ≥ 0. Prosím vracej `422` s poli chyb (RFC9110 problem
  details, jak už to backend dělá) — FE chyby řádku ukáže a řádek přeskočí, ostatní dojedou.

## Otázky / rozhodnutí (potřebuju od tebe)

1. **Přijímají `POST/PUT /clients` a `/products` už teď celou sadu polí výše?** Pokud ne, co chybí?
2. **Chceš bulk endpoint?** Import jede po jednom řádku = u velkého CSV klidně stovky requestů.
   Není to blocker (funguje to), ale kdybys chtěl výkon, dá se doplnit `POST /clients/bulk`
   (pole objektů → pole výsledků). Rozhodnutí nechávám na tobě — FE pak přepnu, ať to volá.
3. **Uniqueness na serveru** (IČO u klientů, SKU u produktů) — ano/ne? Ovlivní, jak agresivně
   má FE dedupovat.

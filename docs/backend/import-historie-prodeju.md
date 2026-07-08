# Backend + FE návrh: Import historie prodejů z POS (F9)

**Stav: ROZPRACOVÁNO.** Frontend základ existuje v `/app/import?entity=sales`:
`src/lib/sales-import.ts` připraví dávku z CSV/XLSX a `src/composables/useSalesImport.ts`
volá `POST /sales/import`. Backend endpoint/migrace jsou navazující práce. Tento dokument
je kontrakt pro backend i finální FE flow. Navazuje na hotový **katalog import**
(`src/import/adapters/pos-products.ts` — Dotykačka / Storyous / iKelp) a na
roadmapu `docs/product/modular-business-roadmap.md` (řádek 150: _„Remaining work:
sales history…"_).

## 1. Cíl a scope

**Cíl:** naimportovat **historické účtenky/prodeje** z konkurenčního POS, aby
manažerská analytika (`Provozní přehled`, `Konsolidace`) měla data **od dne 0
podnikání**, ne až od nasazení Vystaveno. Bez historie vypadá první měsíc jako
propad tržeb.

**Ve scope (MVP):** účtenka (datum, platba, pobočka, součty) + její položky
(produkt/název, množství, cena, DPH). Idempotentní dávkový import z CSV/XLSX.

**Mimo scope:** live POS sync, modifikátory, spropitné rozpad, provize/zaměstnanci,
cenové hladiny, zpětný zápis Z-reportů. (Stejná dělicí čára jako u katalog importu.)

## 2. Klíčová rozhodnutí — proč historie ≠ živý prodej

Živé `POST /sales` (viz `SaleService.PersistSaleAsync`) dělá 3 věci, které
historický import dělat **NESMÍ**:

1. **Stock:** volá `ApplySaleIssueAsync` → záporný `StockMovement` typu `Sale`
   (+ receptury). Historický prodej už reálně odešel ze skladu v původním POS →
   opakovaný odpočet = **dvojitý výdej**. → **Import NEVYTVÁŘÍ stock movements.**
   Reálný stav skladu se srovná zvlášť (počáteční množství z katalog importu,
   případně inventura).
2. **Uzávěrka:** advisory-lock guard — prodej do dne, který už má `DayClose`
   řádek, vrátí **409**. Historie navíc **nesmí zpětně přepisovat Z-reporty**. →
   Prodej spadající do **už uzavřeného** obchodního dne se **přeskočí** (nikdy
   nepřepíše uzavřený Z-report). Historie se projeví jen v `pos-reports/*`
   (agregace podle data), ne jako nový/změněný Z-report.
3. **Datum:** živý prodej dostane `CreatedAt = NOW()`. Historie musí nést
   **původní datum účtenky** — `CreatedAt` je klíč, podle kterého Z-report i
   `pos-reports` řadí prodej do obchodního dne (`CreatedAt >= startUtc &&
< endUtc`, přepočet na `Europe/Prague`). Špatné datum → historie spadne do
   dneška a rozbije dnešní čísla.

Čtvrté rozhodnutí je vlastní importu:

4. **Idempotence:** re-import stejného souboru nesmí duplikovat prodeje →
   dedup přes `(ExternalSource, ExternalId)`.

## 3. Datový model — rozšíření `Sale`

`Sale` dnes nemá žádné pole pro původ/import. Přidat (migrace):

```csharp
public string?   ExternalSource { get; set; }  // "dotykacka" | "storyous" | "ikelp"
public string?   ExternalId     { get; set; }  // číslo účtenky ze zdroje
public DateTime? ImportedAt     { get; set; }  // kdy naimportováno (audit), UTC
```

- **Partial unique index** `(CompanyId, ExternalSource, ExternalId)
WHERE ExternalId IS NOT NULL` — DB pojistka idempotence, živé prodeje
  (`ExternalId = NULL`) neomezuje.
- `ExternalSource != NULL` zároveň slouží jako příznak „importovaný prodej" pro
  případné budoucí odlišení v UI/reportech.
- `CreatedAt` se plní **historickým** časem účtenky (viz níže), `ImportedAt`
  reálným časem importu.

## 4. Endpoint: `POST /sales/import`

Vzor je `POST /invoices/import` (historické faktury — zachová číslo/stav, obejde
živé vytvoření). Zde totéž pro prodeje.

- **Permission:** `pos.import` (nové) nebo omezit na Owner/Admin — import mění
  historická čísla, je citlivý. (Otázka §7.)
- **Dávka** (jako invoice import), per-item výsledek — jeden špatný řádek
  neshodí celý soubor.

**Request** (dávka):

```jsonc
{
  "source": "dotykacka",
  "sales": [
    {
      "externalId": "2024-000431", // číslo účtenky ze zdroje (idempotence)
      "soldAt": "2024-03-01T18:42:00", // PŮVODNÍ datum/čas (lokální, Europe/Prague)
      "locationId": "…|null", // mapovaná pobočka; null = celofiremní
      "paymentMethod": "Cash", // Cash | Card (zbytek se mapuje na tyto)
      "status": "Completed", // Completed | Cancelled
      "items": [
        {
          "productId": "…|null", // namapováno na katalog; null → jen popis
          "description": "Pivo 0,5l", // fallback, když produkt nedohledán
          "quantity": 2,
          "unitPrice": 55, // cena VČETNĚ DPH (konzistentní s POS)
          "vatRate": 21,
        },
      ],
      "totalNet": 90.91, // převzít ze zdroje (§7 — nebo dopočítat)
      "totalVat": 19.09,
      "total": 110,
    },
  ],
}
```

**Chování serveru per prodej:**

- `CreatedAt = soldAt` (převedené na UTC), `ImportedAt = NOW()`,
  `ExternalSource = source`, `ExternalId = externalId`.
- **NEVYTVÁŘÍ** `StockMovement` (žádné `ApplySaleIssueAsync`).
- **Idempotence:** existující `(source, externalId)` → nevytvářet, vrátit
  `skipped` s odkazem na existující `saleId`.
- **Uzavřený den:** pokud existuje `DayClose` pro `(businessDate, locationId)`
  spadající pod `soldAt` → `skipped` s důvodem `day_closed` (nikdy nepřepsat).
- **Součty:** převzít ze zdroje (neměnnost účtenky) — viz otázka §7 o dopočtu.
- **Audit:** `AuditActions.SalesImported` (append-only), 1 záznam na dávku
  (count + source), bez citlivých polí.

**Response:**

```jsonc
{
  "results": [
    { "externalId": "2024-000431", "status": "created", "saleId": "…" },
    { "externalId": "2024-000432", "status": "skipped", "reason": "duplicate", "saleId": "…" },
    { "externalId": "2024-000440", "status": "skipped", "reason": "day_closed" },
    { "externalId": "2024-000441", "status": "failed", "reason": "invalid_vat_rate" },
  ],
}
```

## 5. Frontend flow — napodobit invoice import

Účtenka je hierarchická (hlavička + řádky), stejně jako faktura → **vlastní
flow**, ne generický řádkový wizard (přesně jako `src/import/invoices/`):

- **Adaptéry:** `src/import/adapters/pos-sales.ts` — parse účtenkových
  CSV/XLSX exportů Dotykačka / Storyous / iKelp (detekce podle hlaviček, aliasy
  názvů sloupců — stejný vzor jako `pos-products.ts`). Vzorky exportů viz §7.
- **Composable:** `src/import/sales/useSalesImport.ts` — `upload → náhled →
commit`. Commit volá nové `useSales.importSales(batch)` → `POST /sales/import`.
  Batch se zapíše do `useImportLedger` pro rollback (maže `createdIds`).
- **Mapování položek na katalog:** podle `sku`/`ean`/`name` (reuse dedup logiky);
  nedohledaný produkt → `description` fallback (report food-cost ho pak nezná —
  přijatelné pro MVP).
- **UI:** rozšířit import stránku o entitu „Historie prodejů" (`ImportEntity`
  rozšířit o `'sales'`) + prázdný stav vysvětlí, že import needituje sklad ani
  Z-reporty, jen doplní analytiku.

## 6. Edge cases / rizika

| Riziko                      | Mitigace v návrhu                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| Dvojitý odečet skladu       | Import **nevytváří** stock movement; sklad řeší katalog import / inventura                          |
| Přepis uzavřeného Z-reportu | Prodej do dne s `DayClose` → `skipped: day_closed`                                                  |
| Špatný obchodní den (TZ)    | `soldAt` lokální → server převede na UTC dle `Europe/Prague`                                        |
| Duplicitní re-import        | Partial unique `(CompanyId, ExternalSource, ExternalId)` + skip                                     |
| Prodej bez pobočky          | `locationId=null` → jen celofiremní report, ne per-pobočka/Z-report; FE nabídne mapování na pobočku |
| Neexistující produkt        | `description` fallback; marže/food-cost ho ignoruje (MVP)                                           |
| Víc plateb (stravenka…)     | Mapovat na `Cash`/`Card`; jemnější rozpad je mimo MVP                                               |

## 7. Otevřené otázky (pro Standu + Patrika)

1. **Vzorky exportů:** máme reálné **účtenkové** exporty (ne katalog) z
   Dotykačka / Storyous / iKelp? Bez nich nejdou napsat adaptéry (neznáme sloupce).
2. **Součty:** převzít `totalNet/Vat/total` ze zdroje, nebo dopočítat z položek
   přes `SaleCalculator`? (Riziko nesouladu, když zdroj zaokrouhluje jinak.)
3. **Uzávěrka historie:** má import **jen** plnit `pos-reports` (doporučeno), nebo
   i zpětně vytvářet `DayClose`/Z-reporty pro historické dny (aby „Uzávěrka"
   ukázala historii)? Doporučuji **ne** — Z-report je živý účetní doklad, ne
   rekonstrukce.
4. **Zaměstnanci/provize:** importovat `employeeId` (mapování jmen), nebo nechat
   `null`? (Ovlivní report `Výkon obsluhy`.)
5. **Permission:** nové `pos.import`, nebo stačí Owner/Admin?

## 8. Doporučené pořadí realizace

1. BE: migrace `Sale` (3 pole + partial unique index) — malé.
2. BE: `POST /sales/import` (bez stocku, idempotence, guard uzavřeného dne, audit).
3. FE: `pos-sales` adaptéry (podle vzorků z §7.1) + `useSalesImport` + UI entita.
4. Ověření: naimportovaný týden se objeví v `Provozní přehled`/`Konsolidace`,
   **nezmění** sklad ani dnešní `Uzávěrku`, re-import neduplikuje.

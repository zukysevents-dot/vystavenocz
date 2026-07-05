# Backend zadání: Uzávěrka dne / Přehled tržeb

**Kontext:** Modul „Uzávěrka" (`/app/uzaverka`, FE). **Fáze 1** (read-only přehled dneška) je čistě na
frontendu z `GET /sales` + `GET /sales/summary` — backend na ni NIC nepotřebuje. Tenhle dokument je
**Fáze 2 + 3**, které backend potřebuje. Rozhodnutí uživatele: **den se zavírá PER POBOČKA** (každá
pobočka svůj Z-report), ne globálně.

Frontend dnes umí: prodeje (`POST /sales`, `GET /sales?pageSize=50`, `GET /sales/summary`,
`POST /sales/{id}/storno`), `DailySalesSummary = { date, count, totalNet, totalVat, total, cashTotal, cardTotal }`.

---

## ⚠️ Kritické (integrita peněz — bez toho zámek dne nedává smysl)

1. **`POST /day-close` musí být idempotentní a odolné souběhu** — `UNIQUE(businessDate, locationId)` +
   celé v **DB transakci se zámkem** na `(businessDate, locationId)` (select-for-update / advisory lock):
   spočítat agregáty → insert DayClose → commit. Dva POS terminály nesmí zavřít stejný den 2× (dvojitý
   odvod hotovosti, duplicitní číslo Z-reportu). Druhý pokus → **409 Conflict**.
2. **Po zavření dne backend ODMÍTÁ** nové `POST /sales` i `POST /sales/{id}/storno`, jejichž
   obchodní den spadá do zavřeného `(businessDate, locationId)` → **409**. Jinak se zafixovaná Z-report
   čísla rozejdou s realitou (nevratná ztráta integrity).
3. **Hranici obchodního dne vlastní backend** (jedno místo pravdy). FE dnes počítá „dnešek" lokálně
   (Europe/Prague) — pro Z-report to nestačí. Rozhodni: půlnoc Europe/Prague, nebo posun (např. 05:00)
   kvůli nočnímu provozu, ať prodeje po půlnoci padnou do správného dne. `GET /sales/summary?date` i
   `day-close` musí používat stejnou hranici.

## Otázky, na které potřebuju odpověď (ať doladím FE)

1. Umí `GET /sales` **stránkovat + filtrovat** podle data a pobočky (`?from=&to=&locationId=&page=`)?
   Dnes vrací jen 50 posledních → FE neunese ani rušný dnešek, historii vůbec. (Blokuje i přesnost Fáze 1.)
2. Jaká je **hranice obchodního dne** (viz kritické #3)?
3. Existuje dnes **kasa fond / pohyby hotovosti** (počáteční hotovost, vklady/výběry/odvody), nebo je to
   nová entita? (Blokuje hotovostní uzávěrku — Fáze 3.)
4. `Sale.employeeId` se zatím **neplní** — začne backend plnit, kdo prodej udělal? (Blokuje tržby po číšnících.)
5. Má se `categoryId`+název kategorie **snapshotovat do `SaleItemLine`** při vzniku prodeje? Jinak se
   historický report po kategoriích zpětně mění, když se produkt přeřadí/přejmenuje.

---

## Fáze 2 — historie + „Zavřít den" (Z-report + zámek)

### `GET /sales/summary?date=YYYY-MM-DD&locationId=<uuid>`

Rozšíření stávajícího (agregace v DB = přesné, nezávislé na paginaci). Response (rozšířený souhrn):

```jsonc
{
  "date": "2026-07-04",
  "locationId": "…",
  "count": 128,
  "avgSale": 245.5,
  "totalNet": 0,
  "totalVat": 0,
  "total": 0,
  "cashTotal": 0,
  "cardTotal": 0,
  "tipTotal": 0,
  "discountTotal": 0,
  "cancelledCount": 3,
  "cancelledTotal": 0,
  "vatBreakdown": [
    { "vatRate": 12, "net": 0, "vat": 0, "gross": 0 },
    { "vatRate": 21, "net": 0, "vat": 0, "gross": 0 },
  ],
}
```

Bez `date` = dnešek (zpětná kompatibilita). Tržby jen ze `status='Completed'`; `cancelled*` ze `Cancelled`.

### Entita `DayClose` (nová)

```
id                  uuid
businessDate        date            -- obchodní den (hranici určuje BE)
locationId          uuid            -- PER POBOČKA
status              'Open'|'Closed' -- implicitně Open, když řádek neexistuje
closedAt            timestamptz
closedByUserId      uuid            -- audit: kdo zavřel
zReportNumber       int             -- pořadové číslo Z-reportu per pobočka, roste o 1 (neresetovat)
-- zafixovaná čísla (snapshot v okamžiku zavření) --
saleCount           int
totalNet, totalVat, total           numeric(12,2)
cashTotal, cardTotal                numeric(12,2)
tipTotal, discountTotal             numeric(12,2)
cancelledCount int, cancelledTotal  numeric(12,2)
vatBreakdown        jsonb           -- [{ vatRate, net, vat, gross }]
productBreakdown    jsonb           -- [{ productId|null, name, quantity, revenueGross }] — prodané produkty za den (inventura), snapshot
-- hotovostní uzávěrka (Fáze 3, viz níže) --
cashOpening, cashPayIns, cashPayOuts, cashDrop, cashExpectedClosing, cashCountedClosing, cashDifference  numeric(12,2)|null

UNIQUE(businessDate, locationId)
```

### `GET /day-close/{date}?locationId=<uuid>`

Stav dne + zafixovaná čísla, pokud zavřeno. Když ještě ne: `{ status: 'Open', date, locationId }`.
FE podle `status` ukáže buď tlačítko „Zavřít den", nebo hotový Z-report.

### `GET /day-close?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>&locationId=<uuid>&page=&pageSize=&sort=`

Stránkovaný seznam pouze uzavřených Z-reportů pro účetní a měsíční export. FE používá rozsah podle
vybraného měsíce a provozovny na stránce `Uzávěrka`. Backend respektuje tenant i location scope:
scoped uživatel bez filtru vidí jen svoji provozovnu, cizí `locationId` vrací 403.

### `POST /day-close`

```jsonc
{
  "date": "YYYY-MM-DD",
  "locationId": "…",
  "cashOpening": null,
  "cashCountedClosing": null,
  "cashDrop": null,
}
```

Chování: idempotence + zámek (viz kritické #1); nelze zavřít budoucí den; vrátí vytvořený `DayClose`
vč. `zReportNumber` a všech zafixovaných čísel. Autorizace: role Owner/Manager (serverově, ne jen FE).

### Z-report tisk/export

CSV/PDF udělá FE z dat `GET /day-close/{date}` a měsíční účetní CSV z `GET /day-close?from=&to=`.
Serverový PDF jen pokud chceš archivaci na BE.

---

## Fáze 3 — per-číšník + hotovostní uzávěrka

### `GET /sales/report/by-employee?date=&locationId=`

```jsonc
[
  {
    "employeeId": "…",
    "employeeName": "…",
    "saleCount": 0,
    "revenueGross": 0,
    "tipTotal": 0,
    "avgSale": 0,
  },
]
```

Blokuje: backend musí plnit `Sale.employeeId` (viz otázka 4).

### Hotovostní uzávěrka

Pole `cash*` na `DayClose` (výše). `cashExpectedClosing = cashOpening + cashTotal + payIns − payOuts − drop`;
`cashDifference = cashCountedClosing − cashExpectedClosing` (manko/přebytek). Vstupy (opening/counted/drop)
vloží obsluha při zavírání dne. Pokud chceš granularitu pohybů během dne → nová entita `CashMovement`
(`type: Opening|PayIn|PayOut|Drop, amount, note, createdAt, createdByEmployeeId`) — jinak stačí pole na DayClose.

---

## Pozn. k zaokrouhlení

VAT rozpad: součet net+vat po sazbách se kvůli zaokrouhlení na řádcích může o haléře lišit od `total`.
Zdroj pravdy je `Sale.total` — případný haléřový rozdíl dopočítat, ne prezentovat vlastní součet jako autoritativní.

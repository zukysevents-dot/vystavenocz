+# Mobilní inventura V1 — sken, pokračování a bezpečný retry

## Rozsah

Řez rozšiřuje existující `POST /api/v1/inventory/stocktake`; nevytváří druhý sklad, paralelní inventurní tabulky ani nový ledger. Finální inventura dál atomicky zapisuje jeden `Stocktake` a korekční `StockMovement` typu `Stocktaking`.

Frontend v `Zásoby → Inventura` přidává:

- první slepé počítání bez předvyplněného systémového množství;
- ruční zadání, HW EAN čtečku a kamerový skener;
- automatické uložení rozpracovaného průběhu pro firmu, uživatele a pobočku;
- druhý nezávislý přepočet pouze položek, které se v prvním kole liší;
- inventurní protokol se serverovým stavem před zápisem, realitou a rozdílem;
- export protokolu do CSV a tisk / PDF.

Nativní Android/iOS aplikace není součástí tohoto řezu. Jde o responzivní web/PWA použitelnou v mobilním prohlížeči. Oprávnění a role jsou mimo tento řez.

## API kontrakt

`POST /api/v1/inventory/stocktake` přijímá původní pole a nové volitelné `idempotencyKey` typu UUID:

```json
{
  "locationId": "11111111-1111-1111-1111-111111111111",
  "note": "Inventura",
  "items": [
    {
      "productId": "22222222-2222-2222-2222-222222222222",
      "countedQuantity": 12
    }
  ],
  "idempotencyKey": "33333333-3333-3333-3333-333333333333"
}
```

- Prázdný UUID je validační chyba `422`.
- Bez klíče zůstává zachováno původní chování.
- První požadavek s klíčem vytvoří inventuru a korekční pohyby v jedné transakci.
- Stejná firma + stejný klíč + stejná pobočka, normalizovaná poznámka a položky vrátí stejný inventurní doklad; nevznikne druhý pohyb.
- Pořadí položek fingerprint nemění.
- Stejný klíč s jiným obsahem vrací `409 Conflict`.
- Souběžné retry serializuje transakční advisory lock a databázový unikátní index.
- Odpověď `StocktakeResponse` vrací `idempotencyKey`.

Pokud inventura překročí schvalovací limit, klíč se použije také jako `RelatedEntityId` žádosti. Stejný retry vrátí tutéž čekající žádost `202`; změněný payload se stejným klíčem vrátí `409`. Po schválení se původní normalizovaný snapshot provede přes stejné idempotentní jádro.

## Lokální rozpracovaný průběh

Rozpracovaná inventura je V1 uložena do `localStorage` pod verzovaným klíčem odděleným podle `companyId + userId + locationId`. Obsahuje katalogový snapshot, obě kola počítání a stabilní UUID pro finální retry.

- Průběh přežije zavření dialogu a obnovu stránky ve stejném prohlížeči.
- Po sedmi dnech expiruje.
- Při neplatném obsahu nebo změně katalogu se zahodí fail-closed.
- Po síťové/serverové chybě zůstane zachován se stejným UUID.
- Smaže se až po přijatém `201`, zařazení do schválení `202` nebo výslovném `Zahodit průběh`.
- Nejde o serverovou ani mezizařízení synchronizaci. Pokračování na jiném telefonu/počítači je navazující samostatný řez.

Systémový stav uložený v lokálním snapshotu slouží k určení rozdílů pro druhé kolo. Při finálním zápisu server znovu načte aktuální stav a inventurní protokol vrací autoritativní hodnotu před korekcí.

## Skenování a fail-closed pravidla

- HW čtečka posílá EAN přes vstup a Enter; každý úspěšný scan přičte jeden kus.
- Kamera používá sdílený `CameraScanner` a stejnou EAN logiku.
- Neznámý EAN se nezapočítá.
- Duplicitní EAN v katalogu se nezapočítá a vyžádá ruční výběr.
- Ve druhém kole lze skenovat jen produkty s rozdílem z prvního kola.
- Finální odeslání není dostupné, dokud není vyplněno první kolo a všechny požadované přepočty.

## Ověření

Backend:

- validace prázdného UUID;
- sekvenční replay = stejný doklad a jediný korekční pohyb;
- stejný klíč s jiným payloadem = `409`;
- souběžný retry = jediný doklad a jediný pohyb;
- migrace bez pending model changes.

Frontend:

- izolace a expirace lokálního draftu;
- obnovení se stejným UUID;
- druhý přepočet jen rozdílů;
- API request s `idempotencyKey`;
- mobilní E2E na 390 × 844: slepé počítání, EAN, zavření/obnovení, druhé kolo, protokol, CSV, odstranění draftu, bez horizontálního overflow a bez závažné axe chyby.

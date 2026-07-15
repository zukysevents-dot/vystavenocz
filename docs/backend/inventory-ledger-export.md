# Skladová karta a kontrolní export

Tento dokument popisuje první doplnění skladového hospodářství v rámci roadmapy INV-16. Vystaveno už má skladový ledger, příjmy, výdeje, korekce, přesuny, inventury, stavy po pobočkách, příjemky, čárové kódy a výrobní dávky. Tento krok je neduplikuje: zpřístupňuje úplnou a čitelnou historii pohybů pro běžnou provozní kontrolu a CSV export.

## API kontrakt

`GET /api/v1/inventory/movements`

Podporované query parametry:

- `page`, `pageSize` — stránkování;
- `productId` — jeden produkt;
- `type` — jeden typ skladového pohybu;
- `from`, `to` — včetně zadaných dnů v časové zóně Europe/Prague;
- `locationId` — konkrétní pobočka/sklad;
- `stockLotId` — jedna skladová šarže;
- `sort` — výchozí je nejnovější pohyb první; při shodném čase rozhoduje ID pohybu.

Odpověď zachovává všechny vazby ledgeru a navíc vrací `productName`, `productSku`, `locationName`, `createdBy` a `lotAllocations`. Názvy a SKU jsou aktuální popisky z katalogu, nikoli historické snapshoty. Autoritativní stopou pro dohledání jsou stabilní `id`, `productId`, `locationId`, ID šarže a příslušná `related*Id`.

`GET /api/v1/inventory/movement-filters` vrací tenantový/scoped seznam produktů, poboček a šarží, které se v ledgeru vyskytují, včetně příznaku archivace produktu/pobočky. Historickou položku proto lze vybrat přímo, i když není na aktuální stránce nebo v aktuálním měsíci.

Uživatel omezený na jednu pobočku vždy vidí jen svou pobočku. Pokus vyžádat jinou pobočku skončí `403`. Uživatel bez pobočkového omezení může pobočku vybrat; neexistující pobočka skončí `422`.

## Chování webu

Panel `Zásoby` → `Pohyby` nabízí filtr období, produktu, šarže, typu pohybu a pobočky. Výchozí období je od prvního dne aktuálního měsíce do dneška.

Po změně filtru zůstává export vypnutý, dokud uživatel nepoužije `Použít filtry` a nové načtení úspěšně neskončí. Starý výsledek proto nelze omylem stáhnout pod nově zvoleným rozsahem.

Web při otevření nebo změně stránky načte jen jednu serverovou stránku po 100 záznamech. Celý vyfiltrovaný ledger se načítá až po výslovném stisknutí `Export CSV`, takže běžné otevření karty nezatěžuje prohlížeč tisíci řádků.

Při exportu web:

1. načte všechny stránky po 100 záznamech;
   další stránky načítá v omezených dávkách po čtyřech požadavcích;
2. odstraní případné duplicity podle ID;
3. znovu ověří první stránku a celkový počet;
4. při změně ledgeru během načítání skončí bezpečně chybou a vyzve uživatele k opakování, místo aby vytvořil neúplný export.

CSV obsahuje čas, produkt, SKU, pobočku, typ, změnu pohybu, číslo/expiraci/změnu/ID šarže, stav po pohybu, zdroj, zdrojové ID, poznámku, ID pohybu, produktu, pobočky a autora. Pohyb rozdělený přes více šarží vytvoří více řádků; množství rodičovského pohybu je uvedeno jen na prvním, aby se při součtu neduplikovalo. Uživatelský text je chráněný proti spuštění tabulkového vzorce po otevření v Excelu nebo podobném programu. Číselné hodnoty zůstávají čísly.

Rozhraní zobrazuje nejvýše 100 pohybů na serverovou stránku, aby velká historie nevytvářela tisíce řádků současně v desktopové tabulce i mobilních kartách. CSV dál obsahuje celý úspěšně načtený výřez.

Živé skladové stavy se kvůli úplnému katalogu produktů načítají přes všechny serverové stránky. Backend používá stabilní řazení s `ProductId` jako posledním kritériem a web ověřuje neměnný celkový počet i počet unikátních produktů; při souběžné změně raději vyžádá nové načtení, než aby chybějící produkt zobrazil jako nulový stav.

## Hranice tohoto kroku

- Ledger zůstává append-only; staré pohyby se nepřepisují.
- Základ ledgeru migraci nepotřeboval; navazující šarže přidávají vlastní aditivní migraci popsanou v `stock-lots-expiry-v1.md`.
- Tento krok netvrdí shodu s PML ani jiným zákonným režimem.
- Šarže, expirace a FEFO jsou hotový navazující řez INV-16; inventura skenerem a další rozšíření zůstávají později.
- Nativní Android/iOS aplikace a matice oprávnění jsou mimo tento krok.

## Regrese

- Unit: `src/composables/useInventory.spec.ts`, `src/lib/inventory-export.spec.ts`, `src/lib/csv-export.spec.ts`.
- E2E: `e2e/stock-ledger-export.spec.ts` včetně 102 řádků, filtrů, staženého CSV, mobilní šířky 390 px a axe.
- Backend: `InventoryTests.Movements_history_filters_location_and_returns_readable_metadata` a `InventoryTests.Movements_history_scoped_member_cannot_request_another_location`.

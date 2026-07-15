+# Skladové ocenění V1

## Rozsah

`GET /api/v1/inventory/stock-valuation` vrací serverově vypočtený souhrn a stránkované produktové řádky pro období, pobočku a volitelné hledání. Endpoint používá stávající `inventory.read` a location scope. Nevzniká nový skladový stav ani databázová migrace; množství se vždy odvozuje ze stejného append-only `StockMovement` ledgeru.

Filtry:

- `from`, `to` — obchodní dny v časové zóně Europe/Prague, výchozí posledních 30 dní, nejvýše 3 660 dní;
- `locationId` — konkrétní pobočka, jinak celá firma;
- `search` — název nebo SKU včetně archivovaných produktů s historií;
- `page`, `pageSize`, `sort` — `stockValue`, `cogs`, `loss` nebo `name`, se záporným prefixem pro sestupné řazení.

## Metoda ocenění

V1 používá **periodický vážený průměr** nákupních cen z příjemek do konce zvoleného období:

1. při filtru pobočky její úplně oceněné příjemky;
2. pokud pobočka přijala zásobu převodem a vlastní cenový základ nemá, celofiremní průměr;
3. pokud neexistují příjemky s cenou, katalogová nákupní cena produktu;
4. jinak je zdroj `Missing`.

`costSource` vždy sděluje použitý zdroj. `isCostComplete=false`, pokud je v relevantní historii alespoň jedna příjemka bez jednotkové ceny. Dílčí známý průměr může zůstat viditelný jako diagnostický odhad, ale všechny peněžní hodnoty založené na neúplné bázi jsou `null`, nikdy zavádějící nula.

Nákupní hodnota období vychází přímo z cen na příjemkách. Jediná neoceněná položka způsobí `purchaseValue=null` pro produkt i souhrn.

## Kategorie výkazu

- skladová hodnota = množství k počátku nebo konci × jednotkový náklad;
- COGS = prodej minus storno prodeje;
- ostatní spotřeba = běžný výdej, personální spotřeba, výroba, materiál zakázky po odečtení vratek a vyskladnění rezervace;
- ztráty = odpis, rozbití a expirace;
- inventurní rozdíl = korekce a inventurní pohyby se znaménkem;
- přesuny mezi pobočkami nejsou COGS ani spotřeba, ale ovlivní stav konkrétní pobočky.

Množstevní hranice období používají čas ledger pohybu `CreatedAt`. Nákupní doklad používá obchodní datum `ReceivedOn`. Odpověď nese měnu firmy a `dataVersion`; frontend při vícestránkovém CSV exportu verzi znovu ověří a při souběžné změně export ukončí.

## Úplnost a hranice V1

`summary.isComplete` je pravda jen tehdy, když žádnému relevantnímu produktu nechybí úplný nákladový základ a žádné příjemce v období nechybí cena. Počty chyb jsou v `missingCostProductCount` a `missingPurchaseCostProductCount`.

V1 je provozní skladové ocenění, ne tvrzení o zákonné účetní metodě. Neobsahuje FIFO finanční vrstvy, kapitalizaci výrobního BOM, vedlejší pořizovací náklady, kurzové přepočty ani účetní uzamčení období. Tyto body vyžadují další samostatný řez a účetní potvrzení.


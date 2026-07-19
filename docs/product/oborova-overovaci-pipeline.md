# Oborová ověřovací pipeline

Aktualizováno: 19. července 2026  
Účel: ověřit, že firma může dokončit **celý pracovní den**, nejen otevřít jednotlivé obrazovky. Tento dokument je kontrolní seznam pro produkt, vývoj i investora. Stav `ověřeno ve zdroji` znamená, že existuje konkrétní API a obrazovka; není to náhrada automatizovaného end-to-end testu v ostrém prostředí.

## Jak se pipeline používá

Každý obor se kontroluje v tomto pořadí:

1. **Nastavení** – firma, role, moduly, provozovna/sklad, katalog a zákazník.
2. **Běžný den** – pracovní úkon, který mění provozní nebo finanční data.
3. **Propojení** – důkaz, že změna přejde do navazujícího modulu, ne jen do obrazovky, kde vznikla.
4. **Výjimka** – nedostatek zásob, storno, oprava, neplatná role nebo neúplná data.
5. **Dohledatelnost** – číslo, stav, čas, uživatel, sklad/pobočka a audit.
6. **Laický návod** – člověk bez znalosti systému ví, co stisknout a co výsledek znamená.

Značky: **Zelená** = existuje celý uživatelský tok; **Žlutá** = základ funguje, ale chybí část nutná pro samostatný prodej; **Červená** = není implementováno nebo by bylo zavádějící to prodávat jako hotové.

## 1. Prodejna: pokladna + sklad

| Kontrolní bod | Stav | Důkaz / význam |
|---|---|---|
| Katalog, SKU/EAN, prodejní cena a zásoba | Zelená | Produkty, pokladna a `inventory/stock-levels`; zásoba je vedena i po pobočkách. |
| Prodej na pokladně odečte sklad | Zelená | Prodej vytváří skladový pohyb; při nedostatku zásoby server odmítne záporný stav. |
| Storno a uzávěrka | Zelená | Prodejní a denní uzávěrkové API, oprávnění a audit. |
| Příjem více položek od dodavatele | Zelená | Existuje příjemka s dodavatelem, cenou a položkami; nový obecný doklad ji postupně sjednocuje. |
| Výdejka/dodací list pro odběratele | Žlutá | Skladové doklady mají obrazovku, koncept/potvrzení, PDF, přílohy a audit. Chybí věcná vazba konkrétní výdejky nebo dodacího listu na fakturu. |
| Cenovky, fiskální periferie, ostrý platební terminál | Žlutá | Základ POS je; konkrétní tiskárna/terminál vyžaduje samostatně prověřeného poskytovatele a zařízení. |

**Akceptační scénář:** založit produkt se stavem 10 ks → přijmout 5 ks → prodat 2 ks na konkrétní pobočce → zkusit prodat více než zůstatek → uzavřít den → ověřit pohyby a audit. Prodejna je použitelná, pokud tento scénář projde na reálné roli Obsluha/Vedoucí bez ručního zásahu do databáze.

## 2. Samostatný sklad: bez pokladny

| Kontrolní bod | Stav | Důkaz / význam |
|---|---|---|
| Zapnutí pouze `core + stock` | Žlutá | Backend modulový katalog podporuje samostatný sklad; onboarding a navigace se nyní rozšiřují o profil `Samostatný sklad`. |
| Katalog, stavy, minima, historie, inventura | Zelená | `inventory/*`: hladiny, pohyby, minima, nákupní doporučení, zrcadlo a inventury. |
| Příjem, výdej, korekce a přesun | Zelená | API provádí atomické pohyby; nelze skončit se zápornou zásobou. |
| Víceřádková příjemka | Zelená | Příjemka s dodavatelem, externím číslem a náklady. |
| Číslované výdejky/převodky/výdej pro zákazníka/vratky | Žlutá | `stock-documents` má UI, koncept/potvrzení, číslo, atomické víceřádkové pohyby, PDF, přílohy a audit. Čeká reálný browser průchod a účetní/fakturační vazba. |
| Dodavatel → objednávka → částečná příjemka | Žlutá | API i obrazovka existují: objednávka se odesílá, z ní vzniká koncept příjemky se skutečným množstvím a potvrzení atomicky doplní přijaté řádky. Zelená až po integračním a browser testu na reálných rolích. |
| Pozice, šarže, expirace, skenerové pickingové vlny | Červená | WMS vrstva není implementována; nelze ji slíbit regulovaným skladům ani velkoobchodu. |

**Akceptační scénář:** bez modulu POS vytvořit položku → založit příjemku → potvrdit ji → vydat více položek na zakázku/odběratele → převést mezi dvěma sklady → provést inventuru → dohledat každý krok podle čísla a uživatele.

## 3. Terénní řemeslo / instalatér: telefon → nabídka → zakázka → materiál → faktura

| Kontrolní bod | Stav | Důkaz / význam |
|---|---|---|
| Zákazník, ceník práce, nabídka | Zelená | Klienti, `service-items`, nabídky s položkami, DPH a stavy. |
| Přijetí nabídky a převod na zakázku | Zelená | Nabídka se převádí na zakázku; ochrana proti druhému převodu. |
| Pracovní list z mobilu | Zelená | Zakázka má práci, materiál, checklist, časovou osu a přílohy; rozhraní je responzivní, ale musí projít fyzickým testem na cílových telefonech. |
| Materiál na zakázce odečte sklad | Zelená | Přidání materiálu je navázáno na skladový pohyb; odebrání jej vrací. |
| Předání a faktura ze zakázky | Zelená | Předávací protokol a vytvoření jednoho konceptu faktury ze zakázky. |
| Odeslání nabídky/faktury zákazníkovi | Žlutá | Klientský portál umí nabídku a PDF faktury; konkrétní e-mailová doručitelnost a platební poskytovatel se ověřují samostatně. |
| Elektronický podpis s právním účinkem | Červená | Existuje příprava obálky; živý poskytovatel a právní posouzení nejsou součástí hotové funkce. |
| Docházka = čas na konkrétní zakázce | Červená | Docházka a zakázky existují, ale dnes se automaticky nepropojí do výkazu práce na zakázce. |

**Akceptační scénář:** technik na telefonu založí nebo otevře zakázku → zapíše práci a materiál → přiloží fotku → změní stav na hotovo → vedoucí vytvoří fakturu → zákazník vidí dokument v portálu. Zvlášť se ověří role: technik nesmí vystavit fakturu, pokud nemá právo fakturace.

## 4. Sklad s docházkou a fakturací

| Propojení | Stav | Co přesně dnes funguje |
|---|---|---|
| Sklad ↔ pobočka | Zelená | Stavy, pohyby a přístup se filtrují podle provozovny. |
| Docházka ↔ pobočka | Zelená | Přihlášení/odhlášení, přestávky, směny a opravy mají pobočkový kontext a role. |
| Faktura ↔ klient/DPH/PDF/portál | Zelená | Fakturace, klienti, PDF, klientský portál a stav úhrady. |
| Skladová výdejka ↔ konkrétní faktura | Červená | Dokladový model se vytváří, ale automatická vazba výdejky/dodacího listu na fakturu zatím není implementována. |
| Docházka ↔ výkon zakázky/středisko | Červená | Je nutný timesheet s volbou zakázky/střediska; běžná docházka to nenahrazuje. |
| Faktura ↔ online úhrada | Žlutá | V aplikaci je provider-neutral platební tok a Viva adaptér; ostré spuštění závisí na účtu poskytovatele, klíčích, webhooku a akceptačním testu. |

## 5. Další obory: hranice pravdivého prodeje

| Obor | Využitelný základ dnes | Co nesmí být označeno jako hotové |
|---|---|---|
| Služby/salon | rezervace, klienti, faktury, směny/docházka | balíčky, zálohy, no-show a spotřební sklad vyžadují samostatné ověření konfigurace |
| Gastro | pokladna, stoly, kuchyně, menu, receptury, sklad, uzávěrka | napojení konkrétní platební/hardware infrastruktury se testuje na místě |
| Velkoobchod | klienti, faktury, víceskladový základ, dodavatelé, objednávka a částečný příjem | EDI, cenové podmínky, picking, dopravci a vazba výdeje na fakturu |
| E-shop | katalog, sklad, veřejné API/webhook základ | rezervace zásob, fulfillment, marketplace a dopravci |
| Výroba | sklad, kusovníkový/recepturový základ a výrobní dávky | plánování, rozpracovanost, jakost, šarže a normy spotřeby |
| Regulované zboží | auditovatelný obecný skladový základ | šarže, expirace, karanténa, traceability a oborová regulace |
| Půjčovna | produktový katalog a klienti | rezervace položek, předání, kauce, sériová čísla, škody a servis |

## Povinné automatické důkazy před označením scénáře jako zeleného

1. API integrační test ověří oprávnění, izolaci firmy a stav po úspěchu i chybě.
2. Test souběhu ověří, že dvě potvrzení nedají stejnému dokladu číslo ani nevytvoří záporný sklad.
3. Browser test projde laickou cestu v UI na desktopu i telefonu, včetně prázdného a chybového stavu.
4. Test role ověří, že technik/obsluha nevidí ani neprovede vedoucí/účetní akci.
5. Test modulu ověří, že `stock` funguje bez `pos` a že vypnutý modul API odmítne i při ručním volání.
6. Manuál popíše krok, očekávaný výsledek, opravu chyby a hranici, kde je nutný účetní/právní/provider krok.

## Prioritizovaná implementační fronta

1. Dokončit **Skladové doklady V1 včetně UI, PDF/tisku, příloh, vazeb a testů**.
2. Přidat onboarding/navigaci pro **Samostatný sklad** a ověřit `core + stock` bez POS na reálném účtu.
3. Doplnit **timesheet na zakázku/středisko**; teprve potom prohlašovat propojení docházky a zakázek.
4. Přidat **vazbu dodací list/výdejka ↔ faktura**, dodavatelský katalog/balení a automatické objednací návrhy.
5. Po dokončení základních dokladů vytvářet oborové balíčky (obchod, velkoobchod, e-shop, výroba) vždy s vlastní sadou důkazů výše.

## Aktuální důkazy ověření

| Kontrola | Výsledek | Poznámka |
|---|---|---|
| Zdrojový audit oborových toků | Hotovo | Tato pipeline mapuje obchod, sklad, řemesla, docházku, fakturaci a hranice dalších oborů. |
| Frontend typy, lint a produkční build | Zelená | `npm run lint` a `npm run build` prošly 19. 7. 2026. Build vydal pouze známé neblokující poznámky externí knihovny `@vueuse`. |
| Frontend jednotkové testy | Zelená | `npm run test -- --run`: 60 souborů, 543 testů. |
| API skladových dokladů a nákupních objednávek | Zelená | .NET 10 build bez varování, 375 unit testů a integrační PostgreSQL scénář dodavatel → objednávka → částečná příjemka → potvrzení → úplné převzetí včetně odmítnutí nadměrného množství prošly 19. 7. 2026. Migrace `AddPurchaseOrdersV1` je aditivní. |
| Browser test nové obrazovky | Čeká na nástroj | Lokální server se rozběhl, ale v tomto prostředí není dostupný příkaz `agent-browser`; před nasazením proveďte průchod přihlášeným skladem. |

Tato tabulka je záměrně součástí výstupu: dokud neprojde poslední browserový průchod na přihlášeném účtu, skladové doklady ani nákupní objednávky se nesmí označit jako plně zelené ani nasazovat do ostrého provozu.

## Laický slovník

- **Koncept:** rozepsaný doklad. Nic na skladu ještě nemění.
- **Potvrdit:** definitivně zapsat fyzický pohyb. Systém mu dá číslo a uloží stopu.
- **Pobočka/sklad:** místo, kde zásoba skutečně je. U terénního technika může být pobočkou i auto.
- **Výdejka:** potvrzení, že zboží opustilo sklad; sama o sobě není faktura.
- **Docházka:** kdy byl člověk v práci. **Výkaz na zakázku** je jiný záznam: říká, na které práci tento čas strávil.

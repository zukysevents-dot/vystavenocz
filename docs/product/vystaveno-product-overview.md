# Vystaveno: co aplikace umí

> Uživatelský přehled produktu z pohledu skutečného zákazníka. Popisuje, co v aplikaci vidíte, co s tím uděláte a jaký to má pro váš provoz smysl. Není to technická dokumentace ani marketing — u každé funkce se snaží poctivě říct, zda je ostrá, připravená k napojení, nebo teprve plánovaná.
>
> Dokument vznikl reálným průchodem aplikace přihlášeným uživatelem — naposledy **proti běžícímu serveru (API) s demo firmou a rokem provozních dat** (viz [Ověření produktu](#ověření-produktu) na konci). Doplňkové ruční příručky ke konkrétním oblastem najdete v `docs/product/` (např. `kompletni-uzivatelsky-manual.md`, `gastro-user-manual.md`, `sluzby-zakazky-manual.md`, `opakovane-faktury-manual.md`).

---

## 1. Co je Vystaveno

Vystaveno je **modulární provozní systém pro malé a střední provozy** — jeden systém místo pěti aplikací. Cílem je nahradit papíry, Excely a ruční přepisování jedním místem, kde spolu jednotlivé části mluví: prodej, kuchyně, sklad, uzávěrka i fakturace pracují se stejnými daty.

**Pro koho to je největší přínos:**

- **Restaurace, kavárny a bary** — mapa stolů, otevřené účty, bony do kuchyně a na bar, receptury a food cost, uzávěrky.
- **Salony a služby** (kadeřnictví, kosmetika, masáže, studia) — rezervace s hlídáním kolizí, evidence klientů, docházka týmu.
- **Řemesla a servisy** (instalatéři, elektrikáři, autoservisy, výjezdy) — nabídky, zakázky od poptávky po fakturu, přehled neuhrazených dokladů.
- **Obchody a prodejny** — dotyková pokladna, sklad s příjemkami a inventurou, tržby a marže v denním přehledu.
- **Samostatné sklady** — příjem, výdej, převody, inventury a minima zásob bez pokladny a gastra.

**Hlavní problém, který řeší:** roztříštěnost. Místo pokladny od jednoho dodavatele, skladu od druhého, fakturace ve třetí aplikaci a docházky v tabulce dostane provoz jeden systém, kde si **zapne a platí jen moduly, které opravdu používá**.

**Co získáte během prvních dnů:** založíte firmu, vyberete obor, systém vám zapne odpovídající moduly a nabídne doporučený start. Hned můžete vést klienty, katalog položek a vystavovat faktury (včetně náhledu daňového dokladu a QR platby). Provozní moduly (pokladna, gastro, sklad, docházka, rezervace) běží proti serveru a byly ověřeny s ostrými daty — od prodeje na pokladně přes bony v kuchyni po denní uzávěrku.

---

## 2. Jak začít

Uživatelská cesta nového zákazníka:

1. **Registrace / přístup.** Veřejná online registrace zatím není otevřená pro každého — provoz běží v režimu _early access_ s osobním nasazením (na webu tlačítka „Chci demo" a „Zapsat se do early access"). Přihlášení i registrační obrazovky (`/prihlaseni`, `/registrace`) v aplikaci existují.
2. **Založení firmy.** Po prvním přihlášení vás aplikace vede do **onboardingu** (`/app/onboarding`): vyberete **typ podnikání** — Samostatný sklad, Gastro, Služby, Řemesla a zakázky, nebo Obchod.
3. **Nastavení údajů firmy.** Vyplníte název, IČO, DIČ, sídlo a **režim DPH** (neplátce / identifikovaná osoba / plátce). Tyto údaje se propíšou na všechny faktury. Nastavíte i **veřejný slug** pro online objednávky, QR stoly a veřejné rezervace.
4. **Výběr oboru = sada modulů.** Podle zvoleného profilu se zapnou moduly (např. Gastro zapne pokladnu, stoly, kuchyni, sklad, docházku, rezervace, reporty). Moduly lze kdykoli doladit v `Nastavení → Moduly`.
5. **První klient.** V `Klienti` (`/app/klienti`) přidáte odběratele ručně, nebo je hromadně **naimportujete z CSV**.
6. **První produkt/služba.** V `Produkty` (`/app/sklad`) založíte skladovou/prodejní položku; u služeb a zakázek slouží **Ceník služeb** (`/app/cenik-sluzeb`).
7. **První doklad.** Vystavíte **fakturu** (`/app/faktury` → _Nová faktura_) s živým náhledem daňového dokladu, nebo vytvoříte **nabídku** (`/app/nabidky`) a převedete ji na zakázku či fakturu. Gastro/obchod začne prodejem na **pokladně**.

Aplikace má vestavěného **Průvodce** (`/app/pruvodce`) — kartičky podle běžných situací („Prodávejte na pokladně", „Obsloužte stůl v restauraci", „Dokončete zakázku od nabídky po fakturu") s vysvětlením a tlačítkem, které vás vezme rovnou na správnou obrazovku.

---

## 3. Přehled funkcí podle business přínosu

Legenda stavů:

- **Ostré** — funguje v aplikaci a bylo ověřeno průchodem proti běžícímu serveru. U provozních funkcí uvádíme „běží proti serveru": v ostrém provozu server vždy je; jen offline ukázka bez serveru je nemá.
- **Ostré\*** — obrazovka, data a dialogy ověřeny proti serveru, ale **finální nevratný krok** (dokončení platby, zavření dne, storno, inventura, vystavení dobropisu) nebyl v tomto průchodu záměrně proveden — testovací zásada „neměnit nevratně data". Tyto kroky kryjí automatizované testy projektu mimo tento běh.
- **Připraveno k napojení** — obrazovka a logika existují, ostrý provoz vyžaduje externího poskytovatele (smlouva, credentials, adaptér).
- **Plánováno** — zatím není, je na roadmapě.

### 3.1 Peníze a fakturace

| Funkce                                    | Komu slouží                | Co uděláte                                                                                  | Přínos                                                                     | Kam kliknout                                   | Stav                                                                                                                               |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Faktury, zálohové faktury, dobropisy**  | OSVČ, firmy                | Vystavíte doklad, přidáte položky, uvidíte živý náhled daňového dokladu, vytvoříte dobropis | Plnohodnotné české doklady s DPH, číslováním a splatností                  | `Faktury` → _Nová faktura_                     | Ostré\* (seznam, filtry dle typu a editor ověřeny proti serveru; vystavení dobropisu a konverze proformy v tomto běhu neprováděny) |
| **QR platba na faktuře**                  | kdokoli fakturuje          | QR kód se generuje na dokladu                                                               | Zákazník zaplatí naskenováním, méně chyb ve VS                             | v editoru/PDF faktury                          | Ostré (statický QR, ne platební brána)                                                                                             |
| **Export dokladů (PDF, ISDOC, XML, CSV)** | účetní, majitel            | V `Účtárna` stáhnete ISDOC/CSV po období, u faktury jednotlivě ISDOC                        | Předání účetní bez přepisování                                             | `Export pro účetní` (`/app/uctarna`)           | Ostré                                                                                                                              |
| **Přehled DPH**                           | plátci DPH                 | Filtr období, daň na výstupu z vystavených faktur                                           | Orientační podklad k přiznání (nenahrazuje přiznání ani kontrolní hlášení) | `Přehled DPH` (`/app/dph`)                     | Ostré                                                                                                                              |
| **Pohledávky a upomínky (cashflow)**      | majitel, fakturant         | Vidíte kdo dluží, stáří pohledávek, „Připomenout"                                           | Peníze pod kontrolou, méně nedoplatků                                      | `Pohledávky a peníze` (`/app/cashflow`)        | Ostré (upomínka se otevře jako předvyplněný e-mail ve vašem poštovním programu — aplikace ji sama neodesílá)                       |
| **Opakované faktury**                     | předplatné, nájmy, paušály | Šablona + interval, systém generuje doklady                                                 | Pravidelná fakturace bez ruční práce                                       | `Opakované faktury` (`/app/opakovane-faktury`) | Ostré                                                                                                                              |
| **Import faktur (Fakturoid)**             | migrující zákazníci        | Nahrajete XML export z Fakturoidu                                                           | Rychlý přechod ze staré aplikace                                           | `Faktury` → _Import z Fakturoidu_              | V aplikaci (nahrání souboru funguje, posílá na server); import s reálným exportem z Fakturoidu v tomto běhu neověřen               |
| **POHODA / Money export**                 | účetní                     | Stáhnete Generic CSV nebo POHODA XML                                                        | Import do účetního programu                                                | `Účtárna` / `Nastavení → Integrace`            | Generic CSV a POHODA XML ostré; Money/SuperFaktura plánováno                                                                       |
| **Cizí měny + kurz ČNB**                  | export, e-shopy            | Doklad v cizí měně                                                                          | Fakturace do zahraničí                                                     | —                                              | Plánováno (editor zatím vystavuje v CZK; cizí měny v aplikaci nejsou)                                                              |

### 3.2 Klienti, nabídky a zakázky

| Funkce                                                     | Komu             | Co uděláte                                                               | Přínos                                | Kam                                  | Stav                                             |
| ---------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| **Klienti a historie**                                     | všichni          | Evidence odběratelů, IČO/DIČ, import/export CSV                          | Klient jednou, pak jen vybrat         | `Klienti` (`/app/klienti`)           | Ostré                                            |
| **CRM (poznámky, úkoly, timeline)**                        | růst, obchod     | Poznámky a úkoly nad klientem, timeline dokladů, neuhrazené doklady      | Vztah se zákazníkem na jednom místě   | `CRM` (`/app/crm`)                   | Ostré (modul `crm`, běží proti serveru)          |
| **Nabídky**                                                | řemeslo, služby  | Cenová nabídka s prací i materiálem, převod na zakázku/fakturu           | Od poptávky k dokladu bez přepisování | `Nabídky` (`/app/nabidky`)           | Ostré                                            |
| **Zakázky / pracovní list / materiál / předání / přílohy** | řemeslo, servisy | Vedete zakázku od nabídky přes materiál a checklist po předání a fakturu | Celý výjezd na jednom místě           | `Zakázky` (`/app/zakazky`)           | Ostré (detail zakázky + dokumenty proti serveru) |
| **Ceník služeb**                                           | služby, zakázky  | Definujete služby a ceny                                                 | Rychlé vkládání do nabídek a zakázek  | `Ceník služeb` (`/app/cenik-sluzeb`) | Ostré                                            |

### 3.3 Provoz firmy

| Funkce                                  | Komu              | Co uděláte                                                              | Přínos                                  | Kam                                          | Stav                                                                                                                |
| --------------------------------------- | ----------------- | ----------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Provozní přehled (výsledky provozu)** | majitel, manažer  | Tržby, marže, výkon obsluhy, ztráty skladu, ležáky                      | Rozhodování podle čísel                 | `Výsledky provozu` (`/app/provozni-prehled`) | Ostré (běží proti serveru)                                                                                          |
| **Konsolidace / porovnání poboček**     | majitel řetězce   | Srovnání provozoven                                                     | Přehled napříč pobočkami                | `Porovnání poboček` (`/app/konsolidace`)     | Ostré (běží proti serveru)                                                                                          |
| **Denní uzávěrka a Z-report**           | pokladní, manažer | Uzavřete den, kontrola hotovosti, provozní předávka, DPH rozpad, export | Uzávěrka bez slepých míst               | `Denní uzávěrka` (`/app/uzaverka`)           | Ostré\* (běží proti serveru vč. měsíčních účetních CSV exportů; samotné zavření dne v tomto běhu neprovedeno)       |
| **Pobočky a vedení**                    | majitel, admin    | Založíte provozovny, přiřadíte lidi                                     | Sklad, uzávěrky a oprávnění per pobočka | `Pobočky` (`/app/pobocky`)                   | Ostré                                                                                                               |
| **Schvalování**                         | admin, manažer    | Limity + fronta storen, odpisů a inventur ke schválení                  | Kontrola nad citlivými kroky            | `Schvalování` (`/app/schvalovani`)           | Ostré\* (nastavení limitů a fronta ověřeny proti serveru; schválení reálného storna/odpisu v tomto běhu nevyvoláno) |
| **Historie změn (audit)**               | majitel, admin    | Kdo co změnil                                                           | Dohledatelnost                          | `Historie změn` (`/app/audit`)               | Ostré (běží proti serveru)                                                                                          |

### 3.4 Gastro a pokladna

| Funkce                               | Komu             | Co uděláte                                                                                                                               | Přínos                               | Kam                                       | Stav                                                                    |
| ------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------- |
| **Pokladna (POS)**                   | prodejny, gastro | Dotykový prodej dlaždicemi, sken EAN (čtečka i kamera), platba hotově/kartou, účtenka, spropitné, cenové hladiny, sleva, zákazník s body | Rychlý prodej, tržby hned v přehledu | `Pokladna` (`/app/pokladna`)              | Ostré\* (běží proti serveru; dokončení platby v tomto běhu neprovedeno) |
| **Stoly a objednávky**               | restaurace       | Mapa stolů podle sekcí, otevřený účet na stůl, rozdělení účtu mezi hosty                                                                 | Číšník s tabletem místo bloku        | `Stoly a objednávky` (`/app/restaurace`)  | Ostré (běží proti serveru)                                              |
| **Kuchyně / bar (KDS)**              | kuchyně          | Bon letí na kuchyňský displej (i z QR a online objednávek), změny stavu, historie                                                        | Žádné papírky, žádný křik přes pas   | `Kuchyňské objednávky` (`/app/kuchyne`)   | Ostré (běží proti serveru)                                              |
| **Mapa stolů + QR**                  | restaurace       | Rozmístíte stoly tažením, QR pro objednání ke stolu                                                                                      | Host si objedná mobilem              | `Nastavení stolů` (`/app/mapa-stolu`)     | Ostré (běží proti serveru)                                              |
| **Volby k produktům (modifikátory)** | gastro           | Přílohy, propečení, mléko apod.                                                                                                          | Přesná objednávka i účtenka          | `Volby k produktům` (`/app/modifikatory`) | Ostré (běží proti serveru)                                              |
| **Receptury a food cost**            | gastro           | Prodej odečte suroviny podle receptury                                                                                                   | Marže a food cost pod kontrolou      | přes produkty/sklad                       | Ostré (běží proti serveru; food cost vidíte ve Výsledcích provozu)      |
| **Účtenky a kuchyňské bony (tisk)**  | provoz           | Fronta tiskových jobů + token pro lokálního tiskového agenta                                                                             | Tisk na ESC/POS a síťové tiskárny    | integrace                                 | Připraveno k napojení (chybí desktopový agent)                          |

### 3.5 Sklad

| Funkce                              | Komu                  | Co uděláte                                                    | Přínos                    | Kam                                          | Stav                                                                                 |
| ----------------------------------- | --------------------- | ------------------------------------------------------------- | ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Produkty a kategorie**            | sklad, obchod, gastro | Katalog položek, skladový/čárový kód, kategorie               | Základ pro sklad i prodej | `Produkty` (`/app/sklad`), `Kategorie`       | Ostré                                                                                |
| **Stav skladu, pohyby, minima**     | skladník, majitel     | Zásoby per pobočka, historie pohybů, upozornění pod minimum   | Vždy víte, co máte        | `Stav skladu` (`/app/zasoby`)                | Ostré (běží proti serveru)                                                           |
| **Příjemky (naskladnění)**          | sklad                 | Příjemka zvýší zásobu, uchová dodavatele, datum, nákupní cenu | Nákup dohledatelný        | `Příjemky` (`/app/naskladneni`)              | Ostré (běží proti serveru)                                                           |
| **Skladové doklady**                | sklad                 | Výdeje, převody, odpisy, inventura                            | Sklad, který sedí         | `Skladové doklady` (`/app/skladove-doklady`) | Ostré\* (běží proti serveru; potvrzení dokladu a inventura v tomto běhu neprováděny) |
| **Dodavatelé a nákupní objednávky** | nákup                 | Evidence dodavatelů, objednávky, doporučené doobjednání       | Nákup bez chaosu          | `Dodavatelé`, `Nákupní objednávky`           | Ostré (běží proti serveru; e-mail objednávky vyžaduje SMTP na serveru)               |
| **Skladové zrcadlo a inventury**    | majitel               | Má být vs. je vs. rozdíl (v kusech i Kč)                      | Odhalí ztráty             | tab `Zrcadlo` ve `Stav skladu`               | Ostré (běží proti serveru)                                                           |

### 3.6 Lidé a směny

| Funkce                           | Komu          | Co uděláte                                                                      | Přínos                         | Kam                          | Stav                       |
| -------------------------------- | ------------- | ------------------------------------------------------------------------------- | ------------------------------ | ---------------------------- | -------------------------- |
| **Docházka (píchačka)**          | zaměstnanci   | Příchody, odchody, pauzy, přehled hodin; manažer má opravy a výjimky            | Podklad pro mzdy, konec papírů | `Docházka` (`/app/dochazka`) | Ostré (běží proti serveru) |
| **Plán směn**                    | manažer       | Týdenní plánovač per pobočka, šablony, publikace týdne, plánovaný mzdový náklad | Provoz obsazený bez zmatků     | `Směny` (`/app/smeny`)       | Ostré (běží proti serveru) |
| **Export docházky a mezd (CSV)** | mzdová účetní | Stáhnete odpracované hodiny a mzdové podklady                                   | Import do mezd                 | z docházky / plánu směn      | Ostré (běží proti serveru) |

### 3.7 Rezervace

| Funkce                                   | Komu               | Co uděláte                                      | Přínos                          | Kam                                             | Stav                                                             |
| ---------------------------------------- | ------------------ | ----------------------------------------------- | ------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| **Rezervace (kalendář, služby, zdroje)** | salony, restaurace | Termíny se službami/zdroji, hlídání kolizí      | Konec papírového diáře          | `Rezervace` (`/app/rezervace`)                  | Ostré (běží proti serveru)                                       |
| **Veřejné online rezervace**             | zákazník           | Rezervuje přes veřejný odkaz `/rezervace/:slug` | Rezervace i mimo otevírací dobu | veřejný odkaz (vyžaduje nastavený veřejný slug) | V aplikaci připraveno; veřejný tok nebyl v tomto průchodu ověřen |

### 3.8 Věrnost a marketing

| Funkce                           | Komu           | Co uděláte                 | Přínos                 | Kam                              | Stav                    |
| -------------------------------- | -------------- | -------------------------- | ---------------------- | -------------------------------- | ----------------------- |
| **Věrnost a návraty zákazníků**  | obchod, gastro | Věrnostní program, body    | Vracející se zákazníci | `Věrnost` (`/app/vernost`)       | Ostré (modul `loyalty`) |
| **Akce a ceny / cenové hladiny** | obchod         | Akční ceny, cenové hladiny | Flexibilní cenotvorba  | `Akce a ceny` (`/app/akce-ceny`) | Ostré                   |

### 3.9 Přehledy a rozhodování

Dashboard „Dnes ve firmě" (`/app`) shrnuje fakturováno / uhrazené / po splatnosti, tržby za posledních 6 měsíců, POS tržby a nejlepší pobočku, poslední faktury a klienty. Hlubší analytiku dávají **Provozní přehled**, **Konsolidace** a **DPH/Cashflow** (viz výše).

### 3.10 Integrace a nastavení

| Funkce                                           | Komu                         | Co uděláte                                                                                                                                                           | Přínos                            | Kam                                                                  | Stav                                                                                                                 |
| ------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Nastavení firmy a modulů**                     | majitel, admin               | Údaje, DPH režim, logo, číslování, zapínání modulů                                                                                                                   | Systém přesně na míru             | `Nastavení` (`/app/nastaveni`)                                       | Ostré                                                                                                                |
| **Propojení pro vývojáře (API klíče, webhooky)** | e-shopy, automatizace        | Vytvoříte API klíč (čtecí i zápisové scopes — klienti, zákazníci, produkty, faktury vč. vystavení), nastavíte webhook s výběrem událostí, testem a historií doručení | Napojení dalších systémů          | `Nastavení → Propojení pro vývojáře` (`/app/nastaveni/api-webhooky`) | Ostré (majitel/admin + modul Integrace, běží proti serveru)                                                          |
| **Nahrát data (import)**                         | migrace                      | Import klientů, produktů, faktur z CSV                                                                                                                               | Rychlý rozjezd                    | `Nahrát data` (`/app/import`)                                        | Ostré (klienti/produkty); Fakturoid viz §3.1                                                                         |
| **Ověřené podpisy (add-on)**                     | smlouvy, předávací protokoly | Vytvoříte podpisovou obálku, evidujete stav                                                                                                                          | Doklady k podpisu na jednom místě | `Podpisy` (`/app/podpisy`)                                           | Připraveno k napojení — **ostrý podpis (vč. BankID) až po napojení poskytovatele; zatím příprava obálek a evidence** |
| **Předplatné a tarify**                          | majitel                      | Zvolíte tarif, aktivace                                                                                                                                              | Platíte jen za to, co používáte   | `Předplatné` (`/app/predplatne`)                                     | Ostré UI — **platební brána zatím není (aktivace ukázková)**                                                         |

---

## 4. Typické scénáře

**A) Řemeslník vystaví fakturu klientovi.**
`Klienti` → _Nový klient_ (nebo import). `Faktury` → _Nová faktura_ → vyberu klienta, přidám položky (práce, materiál), zkontroluji živý náhled daňového dokladu, uložím. Na faktuře je QR platba. Přes `Účtárna` později stáhnu ISDOC pro účetní.

**B) Restaurace otevře účet u stolu a pošle objednávku do kuchyně.**
`Nastavení stolů` → rozmístím stoly a vygeneruji QR. `Stoly a objednávky` → otevřu účet na stůl, přidám položky s volbami (příloha, propečení). Bon jde na **Kuchyňský displej** (`Kuchyně`). Po jídle rozdělím účet mezi hosty, přijmu platbu, na konci dne udělám **Uzávěrku** se Z-reportem.

**C) Majitel zkontroluje tržby a sklad.**
Dashboard „Dnes ve firmě" pro rychlý přehled → `Výsledky provozu` pro marže a výkon → `Stav skladu` pro zásoby a položky pod minimem → `Skladové zrcadlo` pro rozdíl „má být vs. je".

**D) Manažer naplánuje směny.**
`Směny` → naplánuji obsazení týmu; docházka (`Docházka`) pak zaznamená skutečné příchody/odchody a dá podklad pro mzdy (CSV export).

**E) Provozovna přijme rezervaci.**
Provozovna založí termín v `Rezervace` (kalendář, služby, zdroje). Zákazník může rezervovat i přes veřejný odkaz `/rezervace/:slug` — tento veřejný tok nebyl v posledním průchodu ověřen.

**F) Firma vytvoří nabídku → zakázku → fakturu.**
`Nabídky` → _Nová nabídka_ (práce + materiál) → převod na **Zakázku** (`/app/zakazky`, pracovní list, materiál, checklist, předání, přílohy) → po dokončení převod na **Fakturu**.

**G) Účetní exportuje doklady.**
Pozvaná účetní otevře `Účtárna` → filtr období → _Export CSV_ nebo ISDOC po dokladech; případně **POHODA XML** z Integrací.

**H) Majitel nastaví pobočku, členy a oprávnění.**
`Pobočky` → založím provozovny → přiřadím členy firmy a role (Owner/Admin/Manager/Accountant/Employee). Citlivé akce lze poslat do fronty **Schvalování**; vše se zapisuje do **Historie změn**.

---

## 5. Role, moduly a oprávnění

**Proč různí lidé vidí různé části aplikace.** Vystaveno kombinuje dvě věci:

1. **Moduly** — co má firma zapnuté a zaplacené (jádro, fakturace, pokladna, gastro, sklad, docházka, rezervace, zakázky, reporty, věrnost, AI asistent, integrace, ověřené podpisy, CRM). Vypnutý modul se v menu neukáže.
2. **Role** — co smí konkrétní člověk.

**Co typicky vidí kdo (podle skutečného skrývání položek v aplikaci):**

| Role                       | Typicky vidí                                                                                | Typicky nevidí                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Owner (majitel)**        | vše zapnuté — dashboard, finance, provoz, sklad, tým, pobočky, audit, nastavení, předplatné | —                                                                 |
| **Admin**                  | skoro vše jako majitel včetně poboček, auditu, schvalování                                  | (jen věci vyhrazené výhradně majiteli)                            |
| **Manager (vedoucí)**      | provoz, uzávěrky, směny, výsledky provozu, schvalování, ceník služeb                        | Pobočky, Historie změn (vyhrazené Owner/Admin)                    |
| **Accountant (účetní)**    | fakturace, DPH, cashflow, účtárna, klienti                                                  | provozní/skladové operace, směny, mapa stolů                      |
| **Employee (zaměstnanec)** | provozní obrazovky (pokladna, stoly, docházka, rezervace)                                   | dashboard, faktury, klienti, reporty, nastavení, sklad-management |

**Důležité: skutečné zabezpečení vynucuje server, ne jen skryté menu.** Skrytí položek v menu a přesměrování v aplikaci je pohodlí pro uživatele. Ostré vynucení oprávnění, tenant izolace (data jedné firmy jsou oddělená od druhé), validace a finanční součty jsou na backendu. V demo/ukázkovém režimu bez serveru je kontrola rolí „fail-open" (nic neblokuje) — v ostrém provozu ji vynucuje API.

**Jak se dostat k funkci, kterou nemáte aktivní.** Když modul není zapnutý, aplikace vás z jeho adresy vrátí na Přehled. Modul si zapne majitel/admin v `Nastavení → Moduly` (může znamenat úpravu tarifu). Pokud jde o roli, požádáte majitele/admina o vyšší oprávnění.

---

## 6. Mobilní aplikace a PWA

- **Web funguje na počítači, tabletu i mobilu.** Rozhraní je responzivní — na mobilu je horní lišta s hamburger menu, rychlé akce (Nový klient, Nová faktura) a stránky se přeskládají do jednoho sloupce. Ověřeno na šířce 375 px.
- **PWA:** web běží jako progresivní webová aplikace a jde nainstalovat na plochu telefonu/tabletu; podle roadmapy „už dnes běží vše v prohlížeči (PWA)".
- **Vhodné na telefon/tablet:** pokladna a obsluha stolů (číšník s tabletem), docházka (píchačka), rychlé nahlédnutí do dashboardu, vystavení faktury na cestě.
- **Vhodnější na desktop:** nastavení stolů (editor tažením), reporty a konsolidace, hromadné importy, účetní exporty, správa modulů a poboček.
- **Nativní aplikace (Android + iOS):** staví se v Kotlinu / Compose Multiplatform (sdílený modul `:composeApp`, tenký iOS wrapper) nad stejným API jako web. **Zatím není vydaná v obchodech** — roadmapa uvádí „Mobilní aplikace — Q4 2026". Do té doby je doporučená cesta pro mobil právě PWA v prohlížeči.

> Stav nativních aplikací uvádíme jen podle ověřeného stavu v repozitáři (projekt existuje a vyvíjí se), nikoli jako hotový produkt v App Store / Google Play.

---

## 7. Co je zatím omezené nebo připravené k napojení

Tato část je záměrně poctivá. **Netvrdíme, že produkt umí ostré platby, BankID podpis nebo automatické napojení účetnictví, pokud to není v daném prostředí skutečně zapnuté.**

**Vyžaduje běžící server:** pokladna (POS), stoly a objednávky, kuchyně (KDS), docházka, rezervace, provozní přehled, audit, sklad, uzávěrky, konsolidace, schvalování a CRM běží výhradně proti serveru — v ostrém provozu to je vždy splněno a všechny tyto obrazovky byly v tomto průchodu **ověřeny proti reálnému API s daty**. Jen offline ukázka bez serveru je nemá (korektně hlásí nedostupnost, nespadne).

**Vyžaduje externího poskytovatele nebo konfiguraci:**

- **Platební terminál (karta):** backend drží životní cyklus platby, ale výsledek zatím **potvrzuje obsluha ručně**. Reálný poskytovatel terminálu se doplní bez změny pokladny.
- **Tisk účtenek a kuchyňských bonů:** existuje fronta tiskových jobů a tokenový kontrakt pro lokálního agenta; **chybí desktopový tiskový agent** pro ESC/POS a síťové tiskárny.
- **Účetnictví:** ostré jsou **ISDOC XML + CSV** a **POHODA XML + Generic CSV**. Money/SuperFaktura a přímý účetní konektor jsou plánované; automatické odesílání do účetního systému zatím není (stahujete a importujete ručně).
- **Ověřené podpisy / BankID:** samostatný placený add-on. **Ostré podepisování se zapne až po dokončení napojení poskytovatele a smlouvy.** Do té doby jde o přípravu podpisových obálek a evidenci jejich stavů — ne o právně ostrý podpis.

**Zatím bez ostrého napojení / plánované:**

- **Platební brána pro předplatné:** aktivace tarifu je zatím **ukázková** („Platební brána není v MVP"). QR platba na faktuře je statický QR kód, nikoli platební brána.
- **Veřejné API a webhooky:** fungují — API klíče (`vst_…`) s čtecími i zápisovými scopes (klienti, zákazníci, produkty, faktury vč. konceptu a vystavení; prodeje a sklad jen čtení) a webhooky s podpisem, retry a historií doručení. Klíč i webhook secret se zobrazí jen jednou při vytvoření. V testovacím prostředí existují reálně použité tokeny se zápisovými scopes (viz Ověření produktu); kompletní zápisový tok přes token nebyl v tomto běhu znovu vyvolán. Širší partnerský program (provize) je ve fázi přihlášek.
- **E-maily:** aplikace sama neposílá nic bez **SMTP nakonfigurovaného na serveru** (pozvánky, nákupní objednávky, rezervační e-maily); bez SMTP se doručení nesimuluje. **Odeslání faktury e-mailem přímo z aplikace zatím není dostupné** — fakturu stáhnete jako PDF a pošlete sami. **Upomínka pohledávky** se otevře jako předvyplněný e-mail ve vašem poštovním programu (mailto) — server ji neodesílá; automatická sekvence upomínek není.
- **AI asistent:** zatím **bez jakékoli obrazovky nebo funkce v aplikaci** — existuje jen jako připravený modul v systému modulů. Žádnou AI funkci teď nelze používat.
- **Veřejná online registrace:** zatím neotevřená (early access s osobním nasazením).
- **EET 2.0:** plánováno, až bude evidence tržeb znovu legislativně aktuální.

**Nedostupné pro ukázkový (demo) režim bez serveru:** viz první odstavec — provozní moduly se plně projeví až proti běžícímu API. Demo účet proti serveru má naopak všechny moduly včetně add-onů (ověřené podpisy, CRM).

---

## 8. Nejčastější otázky

**Pro koho je Vystaveno?** Pro restaurace, kavárny a bary, salony a služby, řemesla a servisy, obchody a samostatné sklady — malé a střední provozy, které chtějí jeden systém místo pěti.

**Umí faktury, nabídky a zakázky?** Ano. Faktury (i zálohové a dobropisy) s DPH, QR platbou a exportem jsou ostré (detailní stav vč. výhrad „Ostré\*" viz tabulky v §3). Nabídky a jejich převod na zakázku a fakturu také. Zakázky vedou práci, materiál, checklist, předání i přílohy.

**Umí gastro a pokladnu?** Ano — mapa stolů, účty na stůl, rozdělení účtu, bony do kuchyně (KDS), pokladna s platbou hotově/kartou, spropitné, uzávěrky a Z-reporty. Ověřeno proti serveru s reálnými daty (finální nevratné kroky viz „Ostré\*" v §3); offline ukázka bez serveru tyto obrazovky nemá.

**Umí více poboček?** Ano. Pobočky určují sklad, uzávěrku, reporting i oprávnění; máte konsolidaci a porovnání provozoven.

**Umí sklad?** Ano — produkty, kategorie, příjemky, výdeje, převody, inventury, minima, dodavatelé, nákupní objednávky, skladové zrcadlo a u gastra receptury s food costem.

**Umí docházku a směny?** Ano — píchačka, přehled hodin, manažerské opravy a výjimky, export pro mzdy a týdenní plánovač směn se šablonami a publikací.

**Umí rezervace?** Ano — kalendář služeb a zdrojů s hlídáním kolizí; veřejné online rezervace přes odkaz jsou v aplikaci připravené (veřejný tok nebyl v posledním průchodu ověřen).

**Co mohu dělat z mobilu?** Prakticky vše přes responzivní web / PWA — obsluhu stolů a pokladnu na tabletu, docházku, rychlý přehled i vystavení faktury. Nativní appka pro Android/iOS se připravuje (roadmapa Q4 2026).

**Jak fungují role a oprávnění?** Firma si zapíná moduly; lidé mají role (Owner, Admin, Manager, Accountant, Employee). Menu se podle toho skrývá, ale skutečné vynucení dělá server (tenant izolace, validace, finanční součty).

**Kde najdu exporty?** Fakturační exporty v `Účtárna` (ISDOC, CSV) a u faktury; účetní XML (POHODA) v Integracích; docházku jako CSV z `Docházka`; dlužníky z `Cashflow`.

**Co je potřeba nastavit před ostrým provozem?** Údaje firmy a DPH režim, veřejný slug (pokud chcete QR stoly / online objednávky a rezervace), zapnuté moduly podle oboru, pobočky a role lidí; pro platby terminálem a tisk příslušného poskytovatele/agenta; pro ostré podpisy napojení poskytovatele.

**Které integrace jsou skutečně aktivní?** Ostré: ISDOC/CSV a POHODA XML/Generic CSV export, QR platba na faktuře, veřejné API klíče (čtení + zápis) a webhooky. Manuální krok / poskytovatel: platební terminál (obsluha potvrzuje výsledek ručně), tisk účtenek a bonů (chybí desktopový agent), e-maily (vyžadují SMTP na serveru). Plánované/připravené: přímý účetní konektor (Money/SuperFaktura), platební brána předplatného, ostrý BankID podpis, ostré online platby (ČSOB/NFCTRON/Comgate/SumUp/GP webpay jsou katalog „Připraveno k napojení"). Vždy ověřte podle svého konkrétního prostředí.

---

## 9. Doporučený první týden

- **Den 1 — Firma a pobočka.** Založte firmu, vyplňte údaje a DPH režim, vyberte obor (onboarding), zapněte moduly, přidejte pobočku/provozovnu a nastavte veřejný slug.
- **Den 2 — Klienti a produkty.** Naimportujte nebo založte klienty a katalog položek (produkty/služby, kategorie, u služeb ceník služeb).
- **Den 3 — Fakturace nebo nabídky.** Vystavte první fakturu (zkontrolujte náhled daňového dokladu a QR), nebo vytvořte nabídku a převeďte ji na zakázku/fakturu.
- **Den 4 — Provozní workflow.** Podle oboru: gastro — stoly, mapa stolů a QR, kuchyně, uzávěrka; obchod — pokladna a příjem zboží; služby — rezervace a docházka; řemeslo — zakázka od nabídky po fakturu.
- **Den 5 — Přehledy a oprávnění.** Projděte dashboard a Výsledky provozu, přidejte členy firmy s rolemi, pozvěte účetní a vyzkoušejte export (ISDOC/CSV, případně POHODA XML). Nastavte, co má chodit přes schvalování.

---

## Ověření produktu

- **Datum testu:** 2026-07-21 (navazuje na mock průchod z téhož dne; tento běh **proti reálnému API**).
- **Testovací prostředí:** frontend `vystavenocz` (Vue 3 + Vite, port 5173) v **API režimu** (`VITE_API_URL` → lokální backend `vystaveno-api`, .NET, port 5176, PostgreSQL, DB `vystaveno_e2e` s idempotentním demo seedem `seed-demo`). Demo firma „Vystaveno Demo Gastro": ~rok historie prodejů, 3 pobočky, 14 faktur, otevřené kuchyňské bony, směny, věrnostní zákazníci. Prohlížeč: Browser pane (Chromium) + Playwright audit suite (`npm run test:e2e:audit`), desktop i mobilní šířka (375 px).
- **Přihlášený typ uživatele:** vlastník (Owner) demo účtu, přihlášení provedeno přes UI (žádná manipulace s tokeny). Všech 14 modulů zapnuto (core, invoicing, pos, gastro, stock, attendance, booking, jobs, reporting, loyalty, ai, integrations + add-ony verified_signing a crm).
- **Počet prošlých rout:** Playwright audit prošel **42 přihlášených rout** (kompletní mapa z `e2e/audit/helpers.ts`) + login, navigaci, modulové průchody, simulované chybové stavy, responsivitu a axe — **128 testů: 125 prošlo, 2 selhaly, 1 přeskočen**. Obě selhání (`04-moduly` › „nabídky a ceník služeb se načtou" a „akce a ceny: hladiny + pravidla") byla HTTP 429 z rate limitu backendu při 4 paralelních workerech; při opakování celého spec souboru s 1 workerem prošlo všech 28 testů. Rate limit je reálné chování backendu pod souběžnou zátěží — pro běžného uživatele v UI se neprojevil. Interaktivně ručně ověřeno ~20 klíčových obrazovek včetně POS (přidání položky na účtenku, cenové hladiny, spropitné), restauračního kokpitu (mapa stolů, sekce, otevřené účty), KDS (bony ze stolů i QR/online objednávek, historie), uzávěrky (živý den, provozní předávka, měsíční exporty), docházky, rezervací, výsledků provozu (marže, food cost, ležáky, ztráty, výkon obsluhy), konsolidace poboček (tržby, marže a ztráty per pobočka), plánu směn, skladu (stav per pobočka, zrcadlo), CRM, věrnosti, schvalování, auditu, API/webhooků, podpisů, poboček, nastavení a předplatného.
- **Počet prošlých modulů:** 13 ze 14 — modul `ai` nemá zatím žádnou obrazovku ani funkci (jen připravený záznam v systému modulů), není co procházet.
- **Evidence zápisového API:** v prostředí existují API tokeny se zápisovými scopes (klienti/zákazníci/produkty zápis, faktury vč. vystavení) vytvořené a reálně použité 20. 7. 2026 (viditelné „Naposledy použit" u tokenů a záznamy `ApiTokenCreated`/`ClientCreated`/`InvoiceDraftCreated` v Historii změn). Kompletní zápisový tok tokenem nebyl v tomto běhu znovu spouštěn.
- **Neověřené oblasti:** veřejné toky bez přihlášení (QR objednávka hosta `/objednavka/:slug`, veřejné rezervace `/rezervace/:slug`), skutečné odeslání e-mailu serverem (vyžaduje SMTP), tisk přes desktopového agenta, ostré platby/podpisy (vyžadují poskytovatele), nativní mobilní aplikace, kolizní scénář rezervací (dvojitá rezervace zdroje), tablet šířka 768–1024 px (ověřen desktop + 375 px), import reálného Fakturoid exportu, detailní správnost čísel konsolidace a CSV exportů proti ručnímu přepočtu. Záměrně neprovedeny nevratné akce: zavření dne, dokončení POS platby, storno, inventura, vystavení dobropisu/konverze proformy, mazání dat — v tabulkách značeno „Ostré\*".
- **Nalezené chyby:** žádné chyby konzole ani neočekávané 4xx/5xx při ručním průchodu; audit suite čistá až na zmíněný 429 rate limit při paralelním běhu (P3, prostředí). Ošetřené očekávané stavy: 403 z docházky pro Ownera bez záznamu zaměstnance, 404 growth/claim endpointů jako prázdný stav.
- **Odkazy na bezpečné screenshoty / trace:** Playwright HTML report a trace v gitignorovaném `test-results/audit-report` (bez přihlašovacích údajů; session v gitignorovaném `e2e/audit/.auth/`). Screenshoty z ručního průchodu nebyly do repozitáře ukládány. Přihlašovací heslo ani citlivé údaje nejsou v tomto dokumentu ani v žádném commitovaném výstupu.

> Poznámka k pravdivosti: stavy „Ostré (běží proti serveru)" v tomto dokumentu znamenají ověřeno proti reálnému API s daty. „Připraveno k napojení" znamená, že chybí externí poskytovatel, smlouva nebo konfigurace (platební brána, BankID, SMTP, tiskový agent, účetní konektor) — nic z toho dokument nevydává za ostrý provoz.

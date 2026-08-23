# Kompletní katalog funkcí Vystaveno

> **Aktualizace 2026-07-26 (odpoledne):** po dopoledním auditu byly opraveny nalezené chyby a doplněny webové mezery (větve/PR čekající na merge): P0 platba Obsluhy, 500 u user-bound API tokenů, pobočky pro provozní role (N2), pozvánka bez SMTP (N3), **webová správa Týmu vč. PINů, pracovníka bez e-mailu a pozvánek s odkazem `/pozvanka/:token`**, role Kuchyně/Skladník v navigaci, **přepínání firem**, **odeslání faktury e-mailem z webu**, **generování odkazu klientské zóny z webu**, **smazání účtu na webu** a **obnova zapomenutého hesla** (API + web). Záznamy níže označené ✚ jsou po této aktualizaci. **Vše bylo 2026-07-26 zmergováno do `main`** (vystaveno-api b9db0d4, vystavenocz ec0be92, vystaveno-mobile fd7dcd8) — „čeká na merge" u jednotlivých záznamů čtěte jako „v main, v produkci po příštím deployi".

> Pravdivý, detailní katalog všeho, co Vystaveno dnes skutečně nabízí uživatelům — a čeho zatím ne. Vznikl 2026-07-26 kombinací **živého průchodu přihlášeným uživatelem proti reálnému API**, běhu **Playwright audit suite (127 testů prošlo, 1 přeskočen, 0 selhalo — 42 rout)** a **zdrojového auditu** tří projektů (`vystavenocz` web, `vystaveno-mobile` Android/iOS, `vystaveno-api` backend). Metodika a čísla: [Ověření produktu](#ověření-produktu) na konci.
>
> Doplňkové příručky: `vystaveno-product-overview.md`, `kompletni-uzivatelsky-manual.md`, `gastro-user-manual.md`, `sluzby-zakazky-manual.md`, `opakovane-faktury-manual.md`.

---

## Co je Vystaveno

Vystaveno je **modulární provozní systém pro malé a střední provozy** — jeden systém místo pěti aplikací. Firma si zapne jen moduly, které používá, a všechny části (prodej, kuchyně, sklad, docházka, fakturace, přehledy) pracují se stejnými daty.

**Komu pomáhá nejvíc:**

- **Restaurace, kavárny, bary** — mapa stolů, otevřené účty, bony do kuchyně a na bar, receptury a food cost, denní uzávěrky.
- **Salony a služby** — rezervace se službami a zdroji, evidence klientů, docházka týmu.
- **Řemesla a servisy** — nabídka → zakázka → pracovní list → předání → faktura.
- **Obchody a prodejny** — dotyková pokladna se čtečkou EAN, sklad, marže a přehledy.
- **Samostatné sklady** — příjem, výdej, převody, inventury a minima bez pokladny.

**Hlavní řešený problém:** roztříštěnost — místo pokladny od jednoho dodavatele, skladu od druhého a fakturace ve třetí aplikaci jeden systém s jedněmi daty.

### Jak číst tento katalog

**Stavy:**

- **Ostré** — funguje a bylo ověřeno proti běžícímu serveru s daty.
- **Ostré\*** — obrazovka, data i dialogy ověřeny; finální **nevratný** krok (zavření dne, dokončení platby, storno, inventura, dobropis) nebyl v tomto průchodu záměrně proveden — kryjí ho automatizované testy projektu.
- **Omezené** — funguje jen zčásti, jen na některé platformě, nebo vyžaduje serverovou konfiguraci (typicky SMTP).
- **Připravené k napojení** — obrazovka a logika existují, ostrý provoz vyžaduje externího poskytovatele (smlouva, credentials, adaptér, klíče).
- **Plánované** — zatím neexistuje.

**Ověření:** `Playwright` = kryto Playwright testy (audit/persona/mock e2e) a/nebo dnešním živým průchodem proti reálnému API; `zdrojový audit` = ověřeno čtením kódu všech tří projektů; `neověřeno` = bez důkazu.

**Dostupnost:** Web = responzivní webová aplikace; PWA = tentýž web nainstalovaný na plochu (plnohodnotné od produkčního buildu); Android/iOS = nativní aplikace (Kotlin/Compose Multiplatform) — **hotová, ale zatím nevydaná v obchodech**. Pokud u funkce není řečeno jinak, PWA = Web.

**Role:** Majitel (Owner), Admin, Vedoucí (Manager — omezen na svou pobočku), Účetní (Accountant), Obsluha (Employee), Kuchyně (Kitchen), Skladník (Stockkeeper). Skutečné vynucení oprávnění dělá vždy server; skrývání menu je jen pohodlí.

---

## Funkce podle oblasti

## 1. Účet, registrace a přihlášení

### Registrace e-mailem a heslem

**Pro koho:** nový uživatel / zakladatel firmy
**Kde ji najdete:** `/registrace` (web), mobilní app „Nemám účet — registrovat se"
**Co umožňuje:** založit účet (jméno, e-mail, heslo min. 8 znaků, souhlas s podmínkami); po registraci automatické přihlášení a onboarding firmy
**Praktický přínos:** start bez karty — „14 dní bez karty. Plné funkce."
**Hlavní akce uživatele:** vyplnit formulář → Vytvořit účet zdarma
**Dostupnost:** Web / PWA / Android / iOS
**Oprávnění a moduly:** bez přihlášení
**Omezení nebo podmínky:** veřejný web registraci nepropaguje — všechny CTA na landingu jsou mailto „Chci demo / early access"; duplicitní e-mail → srozumitelná chyba
**Stav:** Ostré
**Ověření:** Playwright (persona „nový uživatel", desktop i mobil)

### Přihlášení e-mailem a heslem

**Pro koho:** všichni
**Kde ji najdete:** `/prihlaseni`, mobilní app
**Co umožňuje:** přihlásit se, session s obnovou tokenu; mobil ukládá tokeny šifrovaně (EncryptedSharedPreferences / iOS Keychain)
**Praktický přínos:** bezpečný vstup do firmy
**Hlavní akce uživatele:** e-mail + heslo → Přihlásit se
**Dostupnost:** Web / PWA / Android / iOS
**Oprávnění a moduly:** —
**Omezení nebo podmínky:** rate-limit 10/min na IP; ✚ obnova zapomenutého hesla existuje (`/zapomenute-heslo` → e-mail s odkazem → `/reset-hesla`; bez enumerace účtů, jednorázový token 1 h, po změně se odhlásí všechna zařízení) — vyžaduje SMTP na serveru, bez něj poctivá hláška
**Stav:** Ostré (obnova hesla ✚: čeká na merge; ostrý běh vyžaduje SMTP)
**Ověření:** Playwright (audit `01-auth` + dnešní živý průchod)

### Přihlášení přes Google a Apple

**Pro koho:** uživatelé mobilní aplikace
**Kde ji najdete:** mobilní app — „Pokračovat přes Google / Apple"; **web tato tlačítka nemá**
**Co umožňuje:** Google přes prohlížeč (obě platformy), Apple nativně na iOS (`ASAuthorizationController`), na Androidu přes prohlížeč; propojení s existujícím účtem po ověření heslem
**Praktický přínos:** přihlášení bez hesla
**Hlavní akce uživatele:** klepnout na tlačítko poskytovatele, potvrdit v prohlížeči/systému
**Dostupnost:** — / — / Android / iOS (backend hotový i pro web, web UI chybí)
**Oprávnění a moduly:** —
**Omezení nebo podmínky:** **vyžaduje operátorské kroky**: Google Cloud OAuth klient + redirecty, Apple Services ID + `.p8`, `assetlinks.json` s release SHA-256 — bez nich se tlačítka nezapnou; za běhu na zařízení dosud neověřeno (device QA neproběhla)
**Stav:** Připravené k napojení
**Ověření:** zdrojový audit (kompletní implementace + 15 unit testů OAuth)

### PIN přihlášení obsluhy a sdílený terminál

**Pro koho:** provozy se sdílenou pokladnou (rychlé střídání obsluhy)
**Kde ji najdete:** zatím nikde v UI
**Co umožňuje:** backend má hotové: PIN login člena firmy, správu PINů (`PUT /members/{id}/pin`), provozního pracovníka **bez e-mailu**, limity slev per člen a nízkoprivilegovaný **terminálový token** (terminál umí jen PIN-login a menu). ✚ **Správa PINů, limitů slev a pracovníků bez e-mailu je nově na webu ve stránce Tým** (`/app/tym`)
**Praktický přínos:** žádný silný token neleží na sdíleném zařízení; obsluha se střídá PINem
**Hlavní akce uživatele:** ✚ nastavit/zrušit PIN a limit slevy členovi, založit pracovníka bez e-mailu; samotné PIN přihlášení na pokladně (lock-screen, přepínání obsluhy) zatím nemá obrazovku
**Dostupnost:** správa ✚ Web; použití PINu — (jen API)
**Oprávnění a moduly:** správa PINů `company.manage`
**Omezení nebo podmínky:** lock-screen a přepínání obsluhy PINem na pokladně chybí (web M4d / mobil M5b–M5e)
**Stav:** správa ✚ čeká na merge; PIN login UI Připravené k napojení (backend Ostré)
**Ověření:** ✚ živě (nastavení PINu přes Tým proti reálnému API) + zdrojový audit

### Onboarding nové firmy

**Pro koho:** zakladatel firmy po prvním přihlášení
**Kde ji najdete:** `/app/onboarding` (vynucený, dokud účet nemá firmu)
**Co umožňuje:** výběr typu podnikání — **Samostatný sklad / Gastro / Služby / Řemesla a zakázky / Obchod** — každý zapne odpovídající sadu modulů a ukáže „Doporučený start" (číslované kroky s odkazy); vyplnění názvu, IČO, DIČ, sídla, banky a číslování faktur
**Praktický přínos:** systém přednastavený podle oboru během minut
**Hlavní akce uživatele:** vybrat profil → vyplnit firmu → Uložit a pokračovat (přejde na první doporučený krok)
**Dostupnost:** Web / PWA / Android / iOS (mobil má jednodušší založení firmy)
**Oprávnění a moduly:** přihlášený uživatel bez firmy
**Omezení nebo podmínky:** lze Přeskočit; moduly jdou později změnit v Nastavení
**Stav:** Ostré
**Ověření:** Playwright (`onboarding.spec`, persona „nový uživatel")

### Průvodce systémem

**Pro koho:** noví i stávající uživatelé
**Kde ji najdete:** tlačítko `Průvodce` v patičce menu → `/app/pruvodce`
**Co umožňuje:** kartičky podle situací („Prodávejte na pokladně", „Obsloužte stůl v restauraci", „Dokončete zakázku od nabídky po fakturu"…) s vysvětlením pojmů, kroky a tlačítkem přímo na správnou obrazovku; filtruje se podle role a zapnutých modulů
**Praktický přínos:** nový člověk se zorientuje bez školení
**Hlavní akce uživatele:** vybrat kartu → Vysvětlit a ukázat postup → otevřít obrazovku
**Dostupnost:** Web / PWA (mobil nemá — má jednodušší strukturu)
**Oprávnění a moduly:** modul `core`
**Stav:** Ostré
**Ověření:** Playwright (audit + `pruvodce.spec`) + živý průchod

### Odhlášení

**Pro koho:** všichni
**Kde ji najdete:** ikona v patičce menu (web), Nastavení → Odhlásit se (mobil, s potvrzením)
**Co umožňuje:** ukončit session (server zneplatní refresh token), vyčistit lokální data
**Dostupnost:** Web / PWA / Android / iOS
**Stav:** Ostré
**Ověření:** Playwright + živý průchod

### Smazání účtu

**Pro koho:** uživatel, který chce odejít (povinnost pro Google Play / App Store)
**Kde ji najdete:** mobilní app Nastavení → **Smazat účet**; web má veřejnou stránku `/smazani-uctu` s postupem (v aplikaci nebo e-mailem)
**Co umožňuje:** nevratné smazání osobních údajů s okamžitým odhlášením všude; vystavené doklady firmy se ze zákona archivují bez vazby na účet; poslední majitel firmy s členy musí nejdřív předat roli (409)
**Hlavní akce uživatele:** potvrdit heslem (OAuth účty bez hesla pole nechají prázdné)
**Dostupnost:** ✚ Web (Nastavení → Účet → Smazat účet) / Android / iOS + infostránka `/smazani-uctu`
**Omezení nebo podmínky:** poslední majitel firmy s členy musí nejdřív předat roli (409)
**Stav:** Ostré (web in-app smazání ✚: čeká na merge)
**Ověření:** zdrojový audit + backendové testy (`AccountDeletionTests`); web UI build/lint/unit

### Více firem na jednom účtu

**Pro koho:** majitelé více provozů
**Co umožňuje:** backend umí členství ve více firmách i přepnutí (`POST /companies/{id}/switch`), `/me` vrací seznam firem. ✚ **Web má přepínač firem v levém menu** (zobrazí se jen účtům s více firmami; po přepnutí server vydá nové tokeny a aplikace se načte v nové firmě)
**Dostupnost:** ✚ Web / PWA (mobil zůstává ve firmě z přihlášení)
**Stav:** ✚ čeká na merge (backend Ostré); mobil Plánované
**Ověření:** zdrojový audit + build/lint/unit (živě neověřeno — demo účet má jen jednu firmu)

### Role, moduly a oprávnění

**Pro koho:** majitel/admin (nastavuje), všichni (podléhají)
**Kde ji najdete:** projeví se skrytím menu a chováním obrazovek; moduly v menu `Přidat moduly`
**Co umožňuje:** 7 rolí (Majitel, Admin, Vedoucí, Účetní, Obsluha, Kuchyně, Skladník) × 14 modulů; Vedoucí je datově omezen na svou pobočku; Obsluha záměrně nemá storno bez schválení, neomezené slevy ani nákupní ceny; **server vynucuje vše** (403), menu jen skrývá
**Praktický přínos:** číšník nevidí finance, účetní nesahá na sklad
**Omezení nebo podmínky:** ✚ web nově zná i role Kuchyně a Skladník — mají vlastní zúženou navigaci (Kuchyně: KDS + Docházka; Skladník: sklad + Docházka) a z Přehledu je aplikace pošle rovnou do jejich workflow; mobil totéž po commitnutí oprav
**Stav:** Ostré (web pro Kitchen/Stockkeeper ✚: čeká na merge)
**Ověření:** Playwright (persona suite 8 rolí, desktop + mobil) + zdrojový audit obou klientů

### Správa členů týmu a pozvánky

**Pro koho:** majitel/admin
**Kde ji najdete:** ✚ web: `Tým` (`/app/tym`, sekce Tým v menu); mobil: Nastavení → Přístupy → Tým
**Co umožňuje:** seznam členů s rolí, pobočkou, limitem slevy a stavem PINu; změna role a pobočky; odebrání z firmy; **pozvánka e-mailem s rolí a pobočkou** — odpověď nese jednorázový odkaz `/pozvanka/{token}` (✚ web ho zobrazí vždy; při nedoručeném e-mailu poctivě upozorní „předejte odkaz sami" — funguje i bez SMTP); čekající pozvánky lze zrušit; ✚ **pracovník bez e-mailu** (jméno + role, přihlašuje se jen PINem); ✚ pozvat jde i role **Kuchyně** a **Skladník**. ✚ Pozvaný přijme pozvánku na veřejné stránce `/pozvanka/:token` (nový účet si zvolí jméno+heslo)
**Praktický přínos:** tým s rolemi bez sdílení hesla; provozní personál bez e-mailu
**Dostupnost:** ✚ Web / PWA / Android / iOS
**Oprávnění a moduly:** `company.manage` (Owner/Admin), modul `core`
**Omezení nebo podmínky:** e-mail pozvánky vyžaduje SMTP — bez něj se pozvánka vytvoří a odkaz předáte ručně (opraveno, dřív 503 zahodilo token — nález N3)
**Stav:** ✚ čeká na merge (mobil Ostré)
**Ověření:** ✚ živě end-to-end proti reálnému API (pozvánka bez SMTP → odkaz → přijetí novým účtem → člen v seznamu → odebrání) + `e2e/tym.spec.ts`

---

## 2. Firma a pobočky

### Nastavení firmy

**Pro koho:** majitel, admin
**Kde ji najdete:** `Nastavení` (`/app/nastaveni`) — jedna stránka se sekcemi
**Co umožňuje:** název, jméno OSVČ, IČO, DIČ, **režim DPH** (plátce / identifikovaná osoba / neplátce — propisuje se na doklady), sídlo, bankovní spojení (účet, IBAN, SWIFT), **logo** (PNG/JPEG/WebP do 512 KiB), **číselná řada faktur** (prefix, formát `{prefix}{year}{seq}`, náhled příští faktury), výchozí splatnost
**Praktický přínos:** doklady s správnými náležitostmi bez ručního vypisování
**Hlavní akce uživatele:** vyplnit → Uložit nastavení
**Dostupnost:** Web / PWA / Android / iOS (mobil: základní údaje + ARES)
**Oprávnění a moduly:** čtení všechny role, zápis `company.manage` (Owner/Admin); modul `core`
**Stav:** Ostré
**Ověření:** Playwright (audit + `nastaveni.spec` — údaje se propíší do nové faktury) + živý průchod

### Načtení firmy z ARES

**Pro koho:** kdo zakládá klienta nebo vyplňuje firmu
**Kde ji najdete:** pole IČO v dialogu klienta (web), u firmy a klienta (mobil)
**Co umožňuje:** po zadání IČO předvyplní název a adresu z registru ARES
**Dostupnost:** Web / PWA / Android / iOS
**Stav:** Ostré
**Ověření:** Playwright (`import-klienti` fixture s ARES) + zdrojový audit (`GET /ares/{ico}`)

### Veřejný slug a veřejné odkazy

**Pro koho:** provozy s online objednávkami, QR stoly, veřejnými rezervacemi
**Kde ji najdete:** `Nastavení → Veřejné odkazy`
**Co umožňuje:** nastavit adresu firmy pro `/objednavka/:slug`, `/rezervace/:slug` a QR odkazy stolů; normalizace na malá písmena/čísla/pomlčky
**Stav:** Ostré
**Ověření:** Playwright + dnešní živý průchod (slug `vystaveno-demo` použit pro reálnou objednávku i rezervaci)

### Zapínání modulů

**Pro koho:** majitel, admin
**Kde ji najdete:** menu `Přidat moduly` (`/app/moduly`)
**Co umožňuje:** zapnout/vypnout 12 modulů (Jádro je vždy zapnuté); vypnutý modul zmizí z menu a přímá adresa přesměruje na Přehled
**Omezení nebo podmínky:** doplňky **CRM** a **Ověřené podpisy** v přepínačích nejsou — zapínají se na straně serveru (obchodní add-on); modul **AI asistent** je viditelný, ale nic nedělá („Připravujeme")
**Stav:** Ostré
**Ověření:** Playwright (`dashboard-modules`, `klienti-modules`, `crm-modules`) + živý průchod

### Pobočky (provozovny)

**Pro koho:** majitel, admin
**Kde ji najdete:** `Pobočky` (`/app/pobocky`)
**Co umožňuje:** CRUD provozoven (název, adresa, aktivní) — pobočka je základ pro sklad, uzávěrku, reporting a pobočkové role
**Omezení nebo podmínky:** stránka se jmenuje „Pobočky & vedení", ale **správa lidí v ní není** (ta je v mobilním Týmu); role bez `company.read` (Účetní, Obsluha, Kuchyně, Skladník) pobočky nevidí ani přes API — sklad pak ukládá do „Nezařazeno" (nález N2)
**Stav:** Ostré
**Ověření:** Playwright + živý průchod (3 demo pobočky)

### Předplatné a tarify

**Pro koho:** majitel
**Kde ji najdete:** `Předplatné` (`/app/predplatne`)
**Co umožňuje:** zobrazit tarif firmy, co je v ceně, co lze přidat (včetně ceny modulu z ceníku) a cestu ke změně
**Omezení nebo podmínky:** **„Platební brána není v MVP — tarif nastavuje podpora po domluvě."** Stav tarifu je serverový (`/me` → `entitlement`), z prohlížeče se aktivovat NEDÁ. Fakturace a klienti jsou podle ceníku zdarma navždy, takže po skončení předplatného fakturovat jde dál — placené moduly zůstávají jen ke čtení a exportu. Vystavení faktury zavře jen ručně pozastavený přístup
**Stav:** Omezené (UI Ostré, billing Plánované)
**Ověření:** Playwright (`predplatne.spec`, `paywall.spec`) + živý průchod

### Akviziční kód (nárok na předplatné)

**Pro koho:** firmy s kódem z kampaně/partnera
**Kde ji najdete:** `Nastavení → Nabídka a doporučení`
**Co umožňuje:** uplatnit kód — server idempotentně **zaznamená nárok** (Pending); kód se nikdy nezobrazí zpět
**Omezení nebo podmínky:** kód sám neaktivuje tarif ani platbu (poctivě uvedeno v UI)
**Stav:** Ostré (zaznamenání nároku)
**Ověření:** živý průchod + zdrojový audit (`/subscription-claims`)

### Doporučení a partnerský program

**Pro koho:** spokojení zákazníci, partneři (účetní, agentury)
**Kde ji najdete:** `Nastavení → Doporučení a partnerství`, karta i v Průvodci
**Co umožňuje:** vytvořit jednorázový referral kód (platí 90 dní, zobrazí se jen jednou), uplatnit cizí kód (idempotentně), odeslat partnerskou přihlášku; přehled stavu (aktivní / čeká na platbu / kvalifikováno / dostupné měsíce)
**Omezení nebo podmínky:** odměna (měsíc zdarma) se kvalifikuje **až po první ověřené platbě** nové firmy — a protože billing zatím neběží, k výplatě reálně nedochází; provize 20 % je „návrh", schvalování partnerů jde přes operátorský endpoint s deployment klíčem
**Stav:** Ostré (mechanika kódů), navazující odměny čekají na billing
**Ověření:** živý průchod + zdrojový audit (`/growth`)

### Historie změn (audit log)

**Pro koho:** majitel, admin
**Kde ji najdete:** `Historie změn` (`/app/audit`)
**Co umožňuje:** append-only záznam citlivých akcí (storno, slevy, uzávěrka, změny cen, publikace směn, vystavení dokladů, API tokeny…), filtr podle akce, stránkování, aktér + čas + entita
**Dostupnost:** Web / PWA (mobil nemá)
**Oprávnění a moduly:** `company.manage` (Owner/Admin), modul `core`
**Stav:** Ostré
**Ověření:** Playwright audit + živý průchod

---

## 3. Fakturace a finance

### Faktury

**Pro koho:** OSVČ, firmy, účetní
**Kde ji najdete:** `Faktury` (`/app/faktury`), editor `/app/faktury/editor`
**Co umožňuje:** koncept → vystavení (číselná řada) → úhrada/storno; položky s množstvím, MJ, cenou a DPH; klient výběrem nebo rychlým založením; **živý náhled daňového dokladu**; hledání, filtr stavu i typu dokladu; mazat jde jen koncept (vystavená se stornuje)
**Praktický přínos:** plnohodnotné české doklady bez účetního softwaru
**Hlavní akce uživatele:** Nová faktura → klient + položky → Uložit koncept → (Vystavit) → PDF / Uhrazeno / Stornovat
**Dostupnost:** Web / PWA / Android / iOS (mobil: koncept, vystavení, PDF, platby, storno s důvodem)
**Oprávnění a moduly:** `invoices.read/write` (Obsluha nemá), modul `invoicing`
**Omezení nebo podmínky:** jen CZK (cizí měny a kurz ČNB neexistují); peníze a DPH počítá výhradně server
**Stav:** Ostré\*
**Ověření:** Playwright (audit, `faktura-doklady`, `faktura-duplicita`, persona Účetní) + živý průchod

### Zálohové faktury (proforma)

**Co umožňuje:** nedaňový doklad z vlastní řady; je vyloučena z DPH, pohledávek, obratu i účetního exportu; daňový doklad vznikne akcí **Převést na fakturu**
**Kde:** editor `Typ dokladu → Zálohová`; převod v seznamu faktur
**Stav:** Ostré\* (konverze kryta e2e)
**Ověření:** Playwright (`faktura-doklady`)

### Dobropisy

**Co umožňuje:** k vystavené/uhrazené faktuře jedním klikem **Vystavit dobropis** — vytváří ho server se zápornými částkami, vzniká rovnou vystavený z vlastní řady a nejde editovat; v DPH a účetním exportu nettuje záporně
**Kde:** `Faktury` → akce na řádku; filtr `Dobropisy`
**Omezení:** dobropis nejde vytvořit ručně v editoru (záměr); webhook událost pro dobropis neexistuje
**Stav:** Ostré\*
**Ověření:** Playwright (`faktura-doklady`) + živý průchod (demo obsahuje dobropisy)

### PDF a QR platba na dokladu

**Co umožňuje:** PDF faktury (web render z náhledu, mobil `GET /invoices/{id}/pdf`); na dokladu **statický QR kód platby** (číslo účtu, částka, VS)
**Omezení:** QR je statický platební příkaz, ne platební brána
**Stav:** Ostré
**Ověření:** Playwright + živý průchod

### Platby a úhrady faktur

**Co umožňuje:** označit **Uhrazeno** (idempotentní `mark-paid`), na mobilu i **částečné platby** (částka, způsob, datum, poznámka) a přehled plateb; po splatnosti se faktury automaticky označují `Po splatnosti` (serverový job)
**Stav:** Ostré
**Ověření:** Playwright + zdrojový audit (`OverdueInvoiceJob`)

### Odeslání faktury e-mailem (s PDF)

**Pro koho:** fakturant
**Kde ji najdete:** web: tlačítko `Odeslat` v editoru faktury (✚ příjemce předvyplněný z klienta); mobil: detail faktury → **Odeslat e-mailem**
**Co umožňuje:** server odešle e-mail s PDF přílohou, přepne stav `Vystaveno → Odesláno`, zapíše audit; ✚ web koncept před odesláním uloží a vystaví; po odeslání se stav v editoru obnoví
**Omezení nebo podmínky:** vyžaduje **SMTP na serveru** — bez něj poctivá hláška „Odesílání e-mailů není na serveru nastavené. Stáhněte PDF a pošlete fakturu sami." (nic se nepředstírá); v ukázkovém režimu bez serveru zůstává PDF fallback
**Dostupnost:** ✚ Web / PWA / Android / iOS
**Stav:** ✚ čeká na merge (funkční s SMTP; backend + mobil Ostré)
**Ověření:** zdrojový audit (`POST /invoices/{id}/send`) + živý průchod (503 bez SMTP)

### Opakované faktury

**Pro koho:** paušály, nájmy, předplatné
**Kde ji najdete:** `Opakované faktury` (`/app/opakovane-faktury`), mobil Finance → Opakované faktury
**Co umožňuje:** šablona (klient, den v měsíci s ošetřením konce měsíce, splatnost, položky bez DPH) → systém v den splatnosti bezpečně vygeneruje doklad **bez duplicit** (idempotence per období); výchozí je koncept ke kontrole, auto-vystavení je opt-in; Pozastavit/Obnovit, **Vygenerovat teď**, odkazy na vytvořené doklady
**Stav:** Ostré
**Ověření:** Playwright (`recurring-invoices`) + zdrojový audit jobu

### Přehled DPH

**Pro koho:** plátci DPH, účetní
**Kde ji najdete:** `Přehled DPH` (`/app/dph`)
**Co umožňuje:** po sazbách základ daně, daň, počet dokladů, DPH k odvedení za období; čísla počítá server (`vat-summary`) — proforma vyloučena, dobropis nettuje
**Omezení:** orientační podklad — „Nenahrazuje daňové přiznání ani kontrolní hlášení."
**Stav:** Ostré
**Ověření:** Playwright (`dph-api`) + živý průchod

### Pohledávky a peníze (cashflow, upomínky)

**Pro koho:** majitel, fakturant
**Kde ji najdete:** `Pohledávky a peníze` (`/app/cashflow`)
**Co umožňuje:** kdo kolik dluží, stáří pohledávek (buckety), export dlužníků CSV, **Připomenout** — otevře předvyplněný e-mail ve vašem poštovním programu (mailto)
**Omezení:** upomínku server neodesílá a žádná automatická sekvence upomínek není
**Stav:** Ostré (s uvedeným omezením)
**Ověření:** Playwright + živý průchod

### Účetní exporty (ISDOC, CSV, POHODA XML)

**Pro koho:** účetní
**Kde ji najdete:** `Export pro účetní` (`/app/uctarna`) — CSV souhrn + ISDOC per faktura; `Nastavení → Integrace a exporty` — **POHODA XML** a **Generic CSV** (prodeje / Z-reporty, období, pobočka)
**Praktický přínos:** předání účetní bez přepisování
**Omezení:** soubor pro ruční import („ne živá synchronizace"); **Money S3 / SuperFaktura zatím nemají renderer** (volba vrací chybu) — plánované; ISDOC generuje webová aplikace (mobil ISDOC nemá)
**Stav:** Ostré (ISDOC/CSV/Pohoda), Plánované (Money, SuperFaktura, přímý konektor)
**Ověření:** Playwright (`uctarna-api`, persona Účetní — reálná stažení) + živý průchod

### Import dat (migrace z jiných systémů)

**Kde ji najdete:** `Nahrát data` (`/app/import`) + `Faktury → Import z Fakturoidu`
**Co umožňuje:** klienti a produkty z CSV/XLSX (s deduplikací), **faktury z Fakturoid XML** (čísla, stavy, datumy; možnost vrátit import), **katalog z konkurenčních pokladen** (Dotykačka, Storyous/Teya, iKelp), **historické tržby** z pokladních exportů (dry-run kontrola, per-řádek chyby; nemění sklad ani Z-reporty — jen analytika)
**Oprávnění a moduly:** modul `integrations`; import tržeb jen v API režimu
**Stav:** Ostré (import s reálným ostrým exportem Fakturoidu neověřen — e2e používá fixture)
**Ověření:** Playwright (`import-*`) + zdrojový audit

### Klientská zóna (portál pro klienta) a online platba faktury

**Pro koho:** odběratelé vašich faktur
**Kde ji najdete:** veřejná stránka `/klient/:token` (bez přihlášení); odkaz pro klienta vygenerujete ✚ **na webu v Klientech** (ikona Klientská zóna na řádku klienta — odkaz se zobrazí jednou, nový nahrazuje starý, přístup jde zrušit) nebo v mobilní app (detail klienta → Klientský portál)
**Co umožňuje:** klient vidí své faktury a nabídky, stáhne PDF, **schválí/odmítne nabídku**, u faktury klikne **Zaplatit online** → přesměrování na hostovaný checkout (Viva Smart Checkout / Stripe); úhrada se zapíše **až po ověřeném webhooku + serverovém ověření transakce** — návrat do portálu není potvrzení platby
**Omezení nebo podmínky:** online platba je **fail-closed** — bez sandbox/produkčních údajů Viva ukáže „Online platba zatím není dostupná"; produkční aktivace = NO-GO do doby smlouvy a credentials (rozhodnutí v `viva-payments-go-no-go.md`)
**Stav:** zóna Ostré (✚ generování odkazu z webu čeká na merge); online platba Připravené k napojení (sandbox hotový)
**Ověření:** ✚ živě end-to-end (vygenerování odkazu v Klientech → veřejná zóna s fakturami, nabídkami, PDF a fail-closed tlačítkem Zaplatit online) + zdrojový audit (`VivaPaymentGateway`)

---

## 4. Klienti, CRM, nabídky a zakázky

### Klienti

**Pro koho:** všichni, kdo fakturují
**Kde ji najdete:** `Klienti` (`/app/klienti`), mobil Finance → Klienti
**Co umožňuje:** evidence odběratelů (firma/osoba, IČO s ARES, DIČ, kontakty, adresa, splatnost, poznámka), hledání, **import a export CSV**; mobil navíc: archivace/obnovení, faktury klienta, generování odkazu klientské zóny
**Oprávnění a moduly:** `invoices.read/write`, modul `invoicing` (klient je fakturační entita — bez modulu není v menu)
**Stav:** Ostré
**Ověření:** Playwright (audit, `import-klienti`, persona) + živý průchod

### CRM (poznámky, úkoly, timeline)

**Pro koho:** obchod, majitel („Růst" balíček)
**Kde ji najdete:** `CRM` (`/app/crm`)
**Co umožňuje:** u klienta neuhrazené doklady (počítá server), poznámky/záznamy hovorů, úkoly s termínem a prioritou (Dokončit/Zrušit), časová osa dokladů a aktivit
**Oprávnění a moduly:** `crm.read/manage`; **add-on modul `crm`** (mimo běžné profily, zapíná server); jen API režim
**Omezení:** mobilní aplikace CRM nemá; list-filtry/stránkování a fronta úkolů jsou vědomé V2
**Stav:** Ostré
**Ověření:** Playwright (`crm-modules`, audit) + živý průchod

### Nabídky

**Pro koho:** řemesla, služby, obchod
**Kde ji najdete:** `Nabídky` (`/app/nabidky`), mobil Finance → Nabídky
**Co umožňuje:** položky s rozlišením **práce/materiál**, DPH, platnost; stavy (přijatá/zamítnutá/expirovaná); **odeslání e-mailem**; **převod na zakázku** (idempotentní) nebo **na fakturu**; klient může schválit/odmítnout v klientské zóně
**Omezení:** e-mail vyžaduje SMTP; převod na fakturu na mobilu počítá klient (jediná povolená výjimka — server nemá endpoint)
**Stav:** Ostré
**Ověření:** Playwright (`services-jobs`, audit) + zdrojový audit

### Zakázky (od poptávky po předání)

**Pro koho:** řemesla, servisy, výjezdy
**Kde ji najdete:** `Zakázky` (`/app/zakazky`), detail `/app/zakazky/:id`; mobil Více → Zakázky
**Co umožňuje:** číslo `ZAK-{rok}-{seq}`, klient, adresa realizace, termín, technik, priorita, pobočka, stavy se stavovým automatem; **pracovní list** (práce z ceníku či volně + **materiál ze skladu, který se reálně odečítá a při smazání vrací**); kontrolní seznam; časová osa událostí; **předávací protokol** se snímkem práce a materiálu + odeslání k ověřenému podpisu (jen s modulem Podpisy); **přílohy** (PDF/obrázky do 10 MB)
**Praktický přínos:** celý výjezd na jednom místě, materiál dohledatelný ve skladu
**Oprávnění a moduly:** `jobs.read/manage`, modul `jobs`; Obsluha (technik) zakázky vidí i vede
**Stav:** Ostré
**Ověření:** Playwright (`services-jobs`, `job-documents`, audit) + živý průchod

### Fakturace zakázky

**Co umožňuje:** „Vytvořit fakturu" vytvoří koncept z pracovního listu (idempotentně — druhé kliknutí vrátí existující), přejde do editoru
**Omezení:** jen role s `invoices.write` — technik/Obsluha fakturu netvoří („Fakturaci provede vedení nebo účetní."); vyžaduje klienta na zakázce
**Stav:** Ostré
**Ověření:** Playwright (`services-jobs`)

### Ceník služeb

**Kde ji najdete:** `Ceník služeb` (`/app/cenik-sluzeb`)
**Co umožňuje:** sazby práce (název, cena bez DPH, aktivní) pro rychlé vkládání do nabídek a zakázek
**Oprávnění:** vedení (Owner/Admin/Manager); modul `jobs`
**Stav:** Ostré
**Ověření:** Playwright + živý průchod

---

## 5. Produkty, služby a sklad

### Produkty (katalog)

**Kde ji najdete:** `Produkty` (`/app/sklad`), mobil Více → Produkty
**Co umožňuje:** název, skladový kód, čárový kód (EAN, unikátní), typ **Běžný produkt / Polotovar**, nákupní a prodejní cena, sazba DPH, minimální zásoba, kategorie, **alergeny 1–14** (zobrazí se i v QR menu); u produktu přímo akce Receptura / Volby / Porce / Vyrobit polotovar
**Oprávnění:** čtení `catalog.read` (vč. Skladníka), správa `catalog.manage` (vedení); nákupní cena skrytá bez `catalog.cost_view` (Obsluha ji nevidí)
**Stav:** Ostré
**Ověření:** Playwright (audit, `import-produkty`) + živý průchod

### Kategorie produktů

**Kde:** `Kategorie produktů` (`/app/kategorie`) — CRUD, řazení dlaždic pokladny a menu
**Stav:** Ostré · **Ověření:** Playwright audit

### Varianty (porce a velikosti)

**Co umožňuje:** u produktu porce (malá/velká…) s vlastní cenou; výběr při účtování na pokladně, u stolu i ve veřejné objednávce; prodej ukládá **snapshot** — pozdější změna katalogu nezmění historickou účtenku ani vrácení skladu
**Stav:** Ostré · **Ověření:** Playwright + zdrojový audit

### Volby k produktům (modifikátory)

**Kde:** `Volby k produktům` (`/app/modifikatory`) — modul **gastro**
**Co umožňuje:** sdílené skupiny (Přílohy, Propečení…), jedna/více voleb, povinnost, max. počet, příplatky; přiřazení produktům v katalogu; vynucení při účtování obsluhou i v QR objednávce; rozpad na účtence a bonu
**Stav:** Ostré · **Ověření:** Playwright (`modifikatory`, `kuchyne-modifikatory`, `restaurace-modifikatory`)

### Receptury a food cost

**Co umožňuje:** receptura produktu (suroviny, čistá porce + % odpadu → efektivní spotřeba); prodej odečítá suroviny (i u plateb účtů), storno je vrací; dialog živě počítá náklad, marži a food cost; polotovary se vyrábějí **výrobní dávkou** (odečte suroviny, přičte polotovar)
**Kde:** akce u produktu v katalogu; food cost ve `Výsledky provozu`
**Stav:** Ostré · **Ověření:** Playwright + zdrojový audit (backend snapshoty)

### Stav skladu (zásoby, minima, pohyby)

**Kde:** `Stav skladu` (`/app/zasoby`) — taby Stav zásob / Pohyby / Zrcadlo / Podle poboček
**Co umožňuje:** zásoby **per pobočka** (výběr Pobočka skladu), upozornění pod minimum, historie pohybů s českými důvody, ruční **Příjem / Výdej / Korekce / Přesun mezi pobočkami**, **Inventura** (uloží celý stav, ne jen filtr)
**Omezení:** při „Všechny pobočky" jsou ruční operace zablokované (musí se vybrat konkrétní pobočka); odpisové typy výdeje podléhají schvalování/oprávnění `inventory.write_off`
**Stav:** Ostré (inventura a odpisy Ostré\* — nevratné kroky kryty testy)
**Ověření:** Playwright (audit, `stock-mirror-smoke`, persona Skladník s reálným +1/−1) + živý průchod

### Skladové zrcadlo

**Co umožňuje:** „**Stav má být / Realita / Rozdíl**" v kusech i Kč (vážený průměr nákupních cen), detail s výpočtem (otevření + příjem + storno − prodej − výdej), filtry den/pobočka/hledání
**Praktický přínos:** odhalí ztráty a manka
**Stav:** Ostré · **Ověření:** Playwright (`stock-mirror-smoke`) + živý průchod

### Příjemky (naskladnění)

**Kde:** `Příjemky` (`/app/naskladneni`)
**Co umožňuje:** atomický příjmový doklad (číslo, datum, dodavatel, řádky s nákupní cenou), sken čárového kódu, pobočkové filtrování; blok **K doobjednání** z návrhů nákupu s přidáním na příjemku jedním klikem
**Stav:** Ostré · **Ověření:** Playwright + živý průchod

### Skladové doklady

**Kde:** `Skladové doklady` (`/app/skladove-doklady`)
**Co umožňuje:** příjemka, výdejka, převodka, vratky, dodací list — **koncept nemění zásobu; jediná akce, která hýbe skladem, je Potvrdit**; PDF (provozní snapshot, ne faktura), přílohy dokladu
**Stav:** Ostré\* (potvrzení kryto testy)
**Ověření:** Playwright audit + zdrojový audit

### Dodavatelé a balení

**Kde:** `Dodavatelé` (`/app/dodavatele`)
**Co umožňuje:** nákupní adresář (oddělený od klientů); u dodavatele **Balení a ceny**: SKU dodavatele, karton, minimum, cena, dodací lhůta — návrhy objednávek pak zaokrouhlují na balení
**Stav:** Ostré · **Ověření:** Playwright audit + živý průchod

### Nákupní objednávky

**Kde:** `Nákupní objednávky` (`/app/nakupni-objednavky`)
**Co umožňuje:** tok **koncept → odeslání (číslo) → volitelný e-mail dodavateli → zápis skutečného příjmu → koncept příjemky → potvrzení ve Skladových dokladech → záznam přijaté faktury s porovnáním částky**; „Návrh podle skladu" předvyplní z minim a spotřeby pro daného dodavatele
**Omezení:** nic z toho nemění zásobu až do potvrzení dokladu; přijatá faktura nic neplatí ani neúčtuje; e-mail vyžaduje SMTP; **nikdy neobjednává automaticky**
**Stav:** Ostré
**Ověření:** Playwright audit + zdrojový audit

### Návrhy doobjednání

**Co umožňuje:** server doporučí co a kolik objednat podle skladu, minim, skutečné spotřeby a receptur (denní spotřeba, dny zásoby, odhad ceny)
**Kde:** blok v Příjemkách + `Návrh podle skladu` v objednávce; mobil „Návrhy nákupu" (read-only)
**Stav:** Ostré · **Ověření:** Playwright + živý průchod

### Centrální sklad (podle poboček)

**Co umožňuje:** matice produkt × pobočka (jen při >1 pobočce), sloupec „Nezařazeno", scoped vedoucí vidí jen svou pobočku
**Stav:** Ostré · **Ověření:** Playwright (persona location-scoped Manager) + živý průchod

---

## 6. Pokladna a gastro

### Pokladna (POS)

**Pro koho:** prodejny, kavárny, rychlý prodej
**Kde ji najdete:** `Pokladna` (`/app/pokladna`); mobil má vlastní POS
**Co umožňuje:** prodej dlaždicemi s kategoriemi a hledáním (název/SKU/EAN), množství, sleva na účet, **spropitné** (presety %), cenová hladina, zákazník s věrnostními body, platba **Hotově** (přijato/vráceno) / **Kartou** / Jiný způsob, účtenka s tiskem/PDF, denní tržby s historií prodejů; mobil navíc volná položka, výběr prodávajícího a pobočky a **idempotentní checkout** (výpadek sítě nevytvoří dvojitý prodej)
**Oprávnění a moduly:** `pos.operate` (Obsluha ano, Účetní jen čtení), modul `pos`; jen API režim
**Omezení nebo podmínky:** karta = fyzický terminál mimo systém, **výsledek potvrzuje obsluha ručně** („Terminál zatím není propojený"); ✚ P0 „Obsluha nedokončí platbu" je opravený — 403 z náhledu ceny už platbu neblokuje (výslednou cenu autoritativně počítá server), ověřeno dřív červeným persona testem číšníka (teď 20/20)
**Stav:** Ostré\* (dokončení platby kryto e2e testy)
**Ověření:** Playwright (audit, `pokladna-scan`, persona číšník — zde nalezen P0) + živý průchod

### Sken čárových kódů

**Co umožňuje:** HW/Bluetooth čtečka v režimu klávesnice (pole Sken/EAN) i **kamera telefonu/tabletu**; opakovaný sken navyšuje množství; neznámý/duplicitní EAN → srozumitelný toast
**Stav:** Ostré · **Ověření:** Playwright (`pokladna-scan`)

### Cenové hladiny a akční pravidla

**Kde:** `Akce a ceny` (`/app/akce-ceny`)
**Co umožňuje:** cenové hladiny (± %), akční pravidla (procentní/pevná sleva na účet, kategorii nebo produkt, minimální útrata, priorita), **serverový výpočet** promítnutý do pokladny i účtů; sandbox „Kontrola výsledné ceny"
**Oprávnění:** `loyalty.read/manage`, modul `loyalty`
**Stav:** Ostré · **Ověření:** Playwright audit + živý průchod

### Věrnostní program

**Kde:** `Věrnost` (`/app/vernost`); zákazník se vybírá v Pokladně i Restauraci
**Co umožňuje:** nastavení (Kč za bod, hodnota bodu, max bodů na prodej), zákazníci s kartotékou bodů (ledger), sbírání a **uplatnění bodů při platbě**, ruční úpravy, snapshot bodů na účtence
**Omezení:** split platba po osobách věrnost neuplatňuje (backend `pay-items` ji nemá); na mobilu je věrnost v POS **jen pro manažerské role** (záměr)
**Stav:** Ostré · **Ověření:** Playwright + zdrojový audit

### Storno prodeje a schvalování

**Co umožňuje:** storno vrací zboží na sklad (vč. receptur) a vypadává z uzávěrky; **nad limit** jde žádost do fronty Schvalování (obsluze se zobrazí „čeká na schválení managerem"), manažer schválí/zamítne; alternativně manažerský PIN override na místě (backend)
**Stav:** Ostré\* · **Ověření:** Playwright (`approval-requests-smoke`, `schvalovani`) + zdrojový audit

### Stoly a objednávky (restaurační kokpit)

**Kde:** `Stoly a objednávky` (`/app/restaurace`) — celoobrazovkový režim bez sidebaru
**Co umožňuje:** místnosti/patra, mapa stolů (na mobilu/tabletu kompaktní seznam + sticky lišta), otevřený účet na stůl, položky s **poznámkou a chodem** (Předkrm/Hlavní/Dezert), povinné modifikátory, **Odeslat na stanice** (kuchyň + bar), platba s ochranou „Nejdřív odeslat do kuchyně?", sleva/spropitné/hladina/zákazník na účtu, **rozdělení účtu po osobách s částečnou platbou**, **sloučení účtů**, **přesun na jiný stůl**, zrušení účtu; účet se každých 5 s obnovuje kvůli QR doobjednávkám hosta a před platbou se vynuceně načte aktuální stav; kolize s jiným terminálem hlásí srozumitelně
**Oprávnění a moduly:** `gastro.operate` (zrušení účtu `gastro.manage`), modul `gastro`
**Stav:** Ostré (platba účtu kryta gastro-pilot smoke e2e)
**Ověření:** Playwright (audit, `restaurace-*`, `gastro-pilot-smoke`, persona číšník) + živý průchod

### Kuchyně a bar (KDS)

**Kde:** `Kuchyňské objednávky` (`/app/kuchyne`)
**Co umožňuje:** bony podle účtu a stanice (Kuchyně/Bar), chody s oddělovači (posun předkrmu neposune hlavní chod), workflow Odesláno → Začít přípravu → Hotové → Vydáno, SLA barvy podle času, poznámky a modifikátory na bonu, **veřejné objednávky** (jméno + vyzvednutí/rozvoz) i QR objednávky ke stolu, **Historie** vydaných bonů, tisk bonu; souběh dvou terminálů řeší 409 + okamžitý refresh
**Oprávnění:** `gastro.kitchen` (role Kuchyně po mobilních opravách vidí jen KDS + docházku)
**Stav:** Ostré
**Ověření:** Playwright (audit, `kuchyne-*`, persona kuchař) + dnešní živý průchod (bon z veřejné objednávky dorazil)

### Mapa stolů a QR objednání

**Kde:** `Nastavení stolů` (`/app/mapa-stolu`)
**Co umožňuje:** místnosti, stoly (hranaté/kulaté) tažením, otočení, velikost, počet míst; pro každý stůl **QR kód + odkaz** — host si objedná mobilem a objednávka se připíše na účet stolu
**Stav:** Ostré · **Ověření:** Playwright (`mapa-stolu-qr`) + živý průchod

### Veřejné online objednávky (bez přihlášení)

**Kde:** `/objednavka/:slug` (+ `?table=` z QR stolu)
**Co umožňuje:** host prochází menu s alergeny a povinnými volbami, košík, **vyzvednutí nebo rozvoz**, jméno/telefon/poznámka → objednávka jde rovnou do kuchyně; ceny počítá výhradně server z katalogu; u QR stolu se přidá do otevřeného účtu
**Omezení:** bez online platby (hotově/kartou na místě); rate-limit 8/min na IP
**Stav:** Ostré
**Ověření:** **dnes ověřeno end-to-end** (objednávka 201 → bon v KDS) + Playwright (`public-order-table`)

### Denní uzávěrka a Z-report

**Kde:** `Denní uzávěrka` (`/app/uzaverka`)
**Co umožňuje:** živý den per pobočka (tržby, účtenky, průměr, spropitné, hotově/kartou, rozpad DPH, kategorie, kompletní prodané produkty, storna a slevy), **hotovostní uzávěrka** (počátek, vklady, výběry, spočítaná hotovost, odvod → rozdíl), **Zavřít den** (nevratné, Z-report s číslem; odmítne s otevřenými účty), **provozní předávka** (checklist + Předal/Převzal/Poznámka), exporty: čitelný CSV, účetní CSV, **měsíční účetní CSV** a **měsíční souhrn se řádkem CELKEM**
**Oprávnění:** `pos.close_day` (Owner/Admin/Manager)
**Stav:** Ostré\* (zavření dne kryto testy; demo obsahuje rok zavřených dnů)
**Ověření:** Playwright (audit, `uzaverka-export`, gastro-pilot) + živý průchod

---

## 7. Rezervace a služby

### Rezervační kalendář

**Kde:** `Rezervace` (`/app/rezervace`) — taby Kalendář / Služby / Zdroje; mobil Více → Rezervace
**Co umožňuje:** denní kalendář, rezervace (zdroj, služba, termín, zákazník, e-mail, poznámka), stavy **Čeká → Potvrzeno → Proběhlo / Zrušeno / Nedostavil se**
**Oprávnění a moduly:** `booking.read/manage`, modul `booking`
**Stav:** Ostré · **Ověření:** Playwright audit + živý průchod

### Služby a zdroje

**Co umožňuje:** služby (název, délka, cena, DPH, aktivní) a zdroje (křeslo, pracovník, místnost); mobil má i dostupnost/sloty
**Stav:** Ostré · **Ověření:** Playwright + živý průchod

### Dostupnost a kolize

**Co umožňuje:** server nabízí dostupnost (`GET /reservations/availability`) a hlídá obsazení zdroje
**Omezení:** kolizní scénář (dvojitá rezervace téhož zdroje) nebyl v žádném průchodu explicitně ověřen
**Stav:** Ostré (kolize: neověřeno)
**Ověření:** zdrojový audit

### Veřejné online rezervace (bez přihlášení)

**Kde:** `/rezervace/:slug`
**Co umožňuje:** zákazník vybere službu (s délkou a cenou), preferovaný termín a kontakt → **nezávazná žádost**, kterou firma potvrdí v kalendáři
**Stav:** Ostré
**Ověření:** **dnes ověřeno** (žádost 201 Created proti reálnému API)

### Potvrzení a připomínky rezervací

**Co umožňuje:** potvrzovací e-mail při založení (best-effort), **připomínkový job** s nastavitelným předstihem a kanálem (`/app` nastavení připomínek na mobilu; web `reservation-reminder-settings` přes API); idempotence — max. jedna připomínka
**Omezení:** e-mail vyžaduje SMTP; **SMS kanál nemá reálného poskytovatele** (jen log)
**Stav:** Omezené (e-mail s SMTP Ostré; SMS Připravené k napojení)
**Ověření:** zdrojový audit (`ReservationReminderJob`)

---

## 8. Lidé a provoz

### Docházka (píchačka)

**Kde:** `Docházka` (`/app/dochazka`); mobil má vlastní záložku (i pro role Kuchyně a Skladník)
**Co umožňuje:** Příchod / Odchod / **Pauza a konec pauzy**, aktuální stav, měsíční přehled hodin; uživatel bez záznamu zaměstnance se přidá sám („Přidat sebe")
**Oprávnění a moduly:** `attendance.write`, modul `attendance`
**Stav:** Ostré · **Ověření:** Playwright (audit, persona) + živý průchod

### Opravy a výjimky docházky

**Co umožňuje:** manažerské taby **Opravy** (úprava záznamu s auditem; vedoucí jen svou pobočku) a **Výjimky** (chybějící odchod, přesčas, rozdíl plán vs. realita)
**Oprávnění:** `attendance.manage` (Owner/Admin/Manager)
**Stav:** Ostré · **Ověření:** Playwright audit + zdrojový audit

### Zaměstnanci a mzdové údaje

**Kde:** `Docházka → Zaměstnanci`; mobil Více → Zaměstnanci
**Co umožňuje:** evidence (jméno, pozice, **hodinová sazba**), navázání na uživatelský účet („abych mohl/a píchat"), aktivní/neaktivní
**Omezení:** sazby vidí a mění jen role s `attendance.manage` (wage privacy — ostatním server sazbu nevrací)
**Stav:** Ostré · **Ověření:** Playwright + zdrojový audit

### Plán směn

**Kde:** `Směny` (`/app/smeny`); mobil Více → Směny
**Co umožňuje:** **týdenní plánovač** zaměstnanci × dny per pobočka, koncepty čárkovaně / publikované plně, **Publikovat týden** (audit), šablony týdne + použití, přepis sazby na směně, **plánovaný mzdový náklad**, Export plánu CSV; ne-manažer vidí jen publikované směny
**Oprávnění:** `attendance.manage`
**Stav:** Ostré · **Ověření:** Playwright (`smeny-planner`) + živý průchod

### Export docházky a mezd (CSV)

**Co umožňuje:** odpracované hodiny + mzdové podklady (`Export mezd CSV` v přehledu docházky; `GET /attendance/export`)
**Dostupnost:** Web / PWA (mobil export záměrně nemá)
**Stav:** Ostré · **Ověření:** Playwright + zdrojový audit

### Schvalování rizikových akcí

**Kde:** `Schvalování` (`/app/schvalovani`); mobil Více → Schvalování (inbox + limity)
**Co umožňuje:** limity v Kč pro **storno prodeje, výdej/odpis skladu a inventuru**; akce nad limit se neprovede a vytvoří žádost (obsluha vidí „čeká na schválení managerem"), fronta Čekající/Schválené/Zamítnuté s akcemi Schválit/Zamítnout; duplicitní žádosti blokuje server
**Oprávnění:** `approvals.manage` (Owner/Admin/Manager), modul `core`
**Stav:** Ostré\* (reálné schválení konkrétního storna v tomto běhu nevyvoláno)
**Ověření:** Playwright (`schvalovani`, `approval-requests-smoke`) + živý průchod

---

## 9. Přehledy a rozhodování

### Dashboard „Dnes ve firmě"

**Kde:** `/app` (Obsluhu přesměruje rovnou na Pokladnu)
**Co umožňuje:** fakturováno / uhrazené / po splatnosti, tržby za 6 měsíců, poslední faktury a klienti, rychlé akce; blok **Provoz** (POS tržby, prodeje, pobočky, nejlepší pobočka); bez modulu fakturace se fakturační část korektně skryje
**Stav:** Ostré · **Ověření:** Playwright (audit, `dashboard-modules`) + živý průchod

### Výsledky provozu (manažerský přehled)

**Kde:** `Výsledky provozu` (`/app/provozni-prehled`)
**Co umožňuje:** filtr období a provozovny; tržby po dnech, nejprodávanější položky; **Marže a nákladovost jídel** (hrubá marže, food cost %, mimo katalog, nejdražší produkty); **Výkon obsluhy** (tržby, účty, průměr, spropitné, % slev, % storen po zaměstnanci); **Ztráty skladu** (provozní vs. inventurní, důvody, největší položky v Kč); **Ležáky** (zásoby bez prodeje, hodnota)
**Oprávnění:** Owner/Admin/Manager (`pos.reports`, marže `reporting.margin`), modul `reporting`; jen API režim
**Stav:** Ostré · **Ověření:** Playwright audit + živý průchod

### Porovnání poboček (konsolidace)

**Kde:** `Porovnání poboček` (`/app/konsolidace`)
**Co umožňuje:** tržby po pobočkách (podíl, prodeje, spropitné) + **provozní srovnání** (marže, food cost, ztráty, mrtvý sklad, marže po ztrátách), CSV export
**Omezení:** u velkého objemu prodejů přiznaný strop („Zobrazeno prvních N prodejů"); detailní správnost čísel proti ručnímu přepočtu neověřena
**Stav:** Ostré · **Ověření:** Playwright audit + živý průchod

### Přehledy v mobilu (Statistiky)

**Co umožňuje:** Tržby (vývoj, platby, top produkty, DPH rozpad, průměrný účet, storna, slevy, spropitné), **Výkon zaměstnanců**, **Z-reporty**, **Přehled DPH**
**Dostupnost:** Android / iOS (role s reportingem)
**Stav:** Ostré (kód + unit testy; runtime na zařízení neověřen)
**Ověření:** zdrojový audit

> Uzávěrka dne viz oblast 6, Přehled DPH a Cashflow viz oblast 3 — jsou to tytéž funkce.

---

## 10. Integrace a pokročilé možnosti

### Veřejné API s přístupovými klíči

**Kde:** `Nastavení → Propojení pro vývojáře` (`/app/nastaveni/api-webhooky`)
**Co umožňuje:** klíče `vst_…` (zobrazí se jen jednou), volitelná expirace, **scopes čtení** (produkty, zákazníci, faktury, prodeje, sklad, klienti) i **zápisu** (klienti, zákazníci, produkty, faktury vč. vystavení); REST `api/public/v1/*`; volitelně **vazba klíče na konkrétního člena** (klíč pak dědí jeho roli a pobočku a přežívá jen dokud trvá členství); mazání přes API záměrně neexistuje
**Oprávnění:** `integrations.api` (jen Owner/Admin), modul `integrations`; limit 20 klíčů, rate-limit 120/min
**Omezení:** ✚ latentní bug user-bound klíčů (500 u `clients.read`/write scopes) je opravený vč. regresních testů (PR #267)
**Stav:** Ostré
**Ověření:** Playwright (`api-webhooky`) + živý průchod (reálně použité klíče) + zdrojový audit

### Webhooky

**Kde:** tamtéž
**Co umožňuje:** HTTPS endpoint + výběr z 12 událostí (faktura vytvořena/vystavena/uhrazena/stornována, prodej dokončen/stornován, zákazník, produkt, skladová hladina), podpis **HMAC-SHA256**, tajný klíč `whsec_…` jen jednou, testovací ping, **historie doručení** s retry (1 min → 12 h, 6 pokusů), SSRF ochrana
**Omezení:** událost pro dobropis a konverzi proformy neexistuje; převod mezi pobočkami negeneruje `stock.level.changed`
**Stav:** Ostré · **Ověření:** Playwright + zdrojový audit

### MCP server (napojení AI asistentů)

**Co umožňuje:** samostatný nástroj `vystaveno-mcp` (stdio, TypeScript) — ~20 nástrojů nad veřejným API (čtení: zákazníci, produkty, faktury, prodeje, sklad, klienti; zápis: klienti/zákazníci/produkty, koncept a vystavení faktury); autentizace API klíčem, oprávnění vynucuje backend
**Kde:** mimo aplikaci — napojíte do Claude/jiného MCP klienta (`claude mcp add vystaveno …`)
**Omezení:** vyžaduje vlastní API klíč; není součást aplikace ani obchodů
**Stav:** Ostré (ověřeno e2e proti lokálnímu API 2026-07-20)
**Ověření:** zdrojový audit + dřívější smoke testy

### Modul „AI asistent"

**Co umožňuje:** zatím nic — modul existuje jen jako položka v Nastavení s textem „Připravujeme — zatím není součástí aplikace"; backend nemá jediný AI endpoint
**Stav:** Plánované · **Ověření:** zdrojový audit + živý průchod

### Ověřené podpisy (add-on)

**Kde:** `Podpisy` (`/app/podpisy`) — taby Obálky / Provider podpisů
**Co umožňuje:** podpisové obálky nad dokumentem (SHA-256 otisk se počítá lokálně, **soubor se nikam neodesílá**), stavy Rozpracováno→…→Podepsáno, evidence trail; katalog poskytovatelů (Mock / **BankID**), konfigurace se **zabezpečeným trezorem klíčů** (hodnoty se nikdy nezobrazí zpět); napojeno i na předání zakázky
**Omezení:** **ostrý právní podpis se zapne až po napojení poskytovatele a smlouvě** — dnes funguje jen Mock provider; BankID je „připraveno k napojení"
**Oprávnění:** modul `verified_signing` (placený add-on, zapíná server)
**Stav:** Připravené k napojení (evidence a mock tok Ostré)
**Ověření:** Playwright (`podpisy*`) + živý průchod + zdrojový audit

### Platební terminály

**Kde:** `Nastavení → Integrace` (stav plateb), pokladna (platba kartou)
**Co umožňuje:** dnes **ruční režim** — obsluha zadá částku na svém fyzickém terminálu a potvrdí výsledek (backend vede životní cyklus platby); katalog providerů ČSOB/GP, NFCTRON, Comgate, SumUp, GP webpay, Stripe s konfigurací a trezorem credentialů
**Omezení:** **žádný ostrý terminálový adaptér neexistuje** — karty jsou vždy „mimo systém"; provideri se aktivují až smlouvou + credentials + runtime adaptérem
**Stav:** ruční potvrzení Ostré; provideri Připravené k napojení
**Ověření:** živý průchod + zdrojový audit

### Online platby (Viva Smart Checkout, Stripe)

**Co umožňuje:** hostovaný checkout pro **online úhradu faktury z klientské zóny**; server platbu uzná až po ověřeném webhooku + nezávislém ověření transakce
**Omezení:** rozhodnutí **GO pro sandbox, NO-GO pro produkci** bez účtu/credentials; bez klíčů je tlačítko fail-closed („Online platba zatím není dostupná"); netýká se předplatného Vystavena
**Stav:** Připravené k napojení
**Ověření:** zdrojový audit (reálné adaptéry `VivaPaymentGateway`, `StripePaymentGateway` + webhook endpoint)

### Tisk účtenek a bonů (tiskoví agenti)

**Co umožňuje:** fronta tiskových úloh + registrace **lokálního tiskového agenta** (token jen jednou, revoke); z prohlížeče jde tisknout přes systémový dialog (účtenka, bon)
**Omezení:** **desktopová aplikace agenta pro ESC/POS tiskárny zatím neexistuje** — fronta čeká na konzumenta
**Stav:** Připravené k napojení (browser tisk Ostré)
**Ověření:** živý průchod (registrovaný agent v demu) + zdrojový audit

### E-maily ze systému

**Co umožňuje:** s nakonfigurovaným SMTP server odesílá: **pozvánky členů, faktury s PDF, nabídky, nákupní objednávky, potvrzení rezervací, připomínky rezervací**
**Omezení:** bez SMTP se nic nepředstírá — akce vrátí srozumitelnou chybu (503); automatické upomínky faktur neexistují
**Stav:** Omezené (funkční s SMTP; v ověřovaném prostředí SMTP nebyl)
**Ověření:** zdrojový audit (`IEmailSender` + call sites)

### PWA (instalace na plochu)

**Co umožňuje:** produkční web je instalovatelná PWA (manifest, service worker s auto-update, standalone režim, ikony); provozní obrazovky fungují na mobilu i tabletu
**Omezení:** žádný offline režim (bez připojení aplikace korektně hlásí chybu, nic nepředstírá); iOS splash obrázky existují, ale nejsou zapojené
**Stav:** Ostré · **Ověření:** zdrojový audit + Playwright responsivita (320–1280 px)

### Nativní mobilní aplikace (Android + iOS)

**Co umožňuje:** tenký klient nad stejným API — 55 obrazovek: přehled, statistiky, faktury (vč. vystavení, PDF, plateb, e-mailu), klienti (vč. portálového odkazu), POS s idempotencí, restaurace, KDS, sklad (vč. zrcadla a návrhů), docházka, směny, rezervace, zakázky s přílohami, schvalování, opakované faktury, Tým, smazání účtu, tmavý režim; 164 unit testů zelených; targetSdk 36, privacy manifest, bez analytických SDK
**Omezení:** **nevydáno v Google Play / App Store**; před vydáním zbývá: commit mobilních oprav rolí, operátorské kroky (OAuth klíče, podpisy buildů, assetlinks, store podklady, feature graphic) a **fyzická device QA (nikdy neproběhla)**; vědomě chybí: CRM, konsolidace, účetní exporty, upomínky, přepínání firem, offline režim, push notifikace
**Stav:** Připravené k vydání (kód hotový, provozně neověřeno na zařízení)
**Ověření:** zdrojový audit + unit testy; runtime neověřen

---

## Typické uživatelské scénáře

**Řemeslník: klient → nabídka → zakázka → faktura.** `Klienti` → Nový klient (IČO doplní ARES) → `Nabídky` → položky práce a materiálu → klient schválí (e-mailem nebo v klientské zóně) → **Převést na zakázku** → v detailu pracovní list, materiál ze skladu, checklist, fotky, předávací protokol → **Vytvořit fakturu** → vystavit, PDF s QR platbou. Ověřeno: Playwright `services-jobs` + živý průchod.

**Restaurace: stůl → objednávka → kuchyň → platba.** `Nastavení stolů` (mapa + QR) → `Stoly a objednávky` → účet na stůl, položky s chody a volbami → **Odeslat na stanice** → bon na KDS (kuchyň i bar zvlášť) → případně rozdělit účet po osobách → platba hotově/kartou, účtenka → večer `Denní uzávěrka` se Z-reportem. Host si může doobjednat QR kódem — účet se obsluze sám obnoví. Ověřeno: gastro-pilot e2e + persony číšník/kuchař + dnešní veřejná objednávka.

**Skladník: příjem → stav skladu → výdej.** `Příjemky` → nová příjemka (sken EAN, nákupní ceny; blok K doobjednání radí, co dokoupit) → `Stav skladu` → zásoby per pobočka, minima → výdej s důvodem (odpis jde do schvalování) → `Zrcadlo` ukáže „má být vs. realita vs. rozdíl" v Kč. Ověřeno: persona Skladník (reálný +1/−1) + `stock-mirror-smoke`.

**Kadeřník: klient → rezervace → služba → doklad.** `Rezervace → Služby/Zdroje` (střih 60 min, křeslo) → termín v kalendáři (nebo zákazník sám přes `/rezervace/slug`) → Potvrdit → po návštěvě Proběhlo → doklad z Pokladny nebo Faktury. Ověřeno: audit + dnešní veřejná rezervace (201).

**Účetní: faktury → DPH → export.** Pozvaná účetní vidí finance, ne provoz: `Faktury` (filtry, po splatnosti) → `Přehled DPH` (základ/daň po sazbách) → `Export pro účetní` (CSV, ISDOC) nebo POHODA XML z Integrací. Ověřeno: persona Účetní s reálnými staženími.

**Majitel: dashboard → cashflow → provozní rozhodnutí.** `Dnes ve firmě` (tržby, po splatnosti) → `Pohledávky a peníze` (kdo dluží, připravená upomínka) → `Výsledky provozu` (marže, food cost, výkon obsluhy, ztráty, ležáky) → `Porovnání poboček` → rozhodnutí (přecenění, výměna dodavatele, úprava směn). Ověřeno: audit + živý průchod.

**Zaměstnanec: směna → docházka → povolené provozní akce.** Vedoucí publikuje týden ve `Směny` → zaměstnanec přijde, `Docházka` → Příchod (pauzy dtto) → podle role obsluhuje Pokladnu/Stoly (bez storna nad limit — to jde do schvalování), kuchař vidí jen KDS → odchod → hodiny se propíší do podkladů pro mzdy. Ověřeno: persony číšník/kuchař + audit. ✚ _Dřívější P0 (číšník nedokončil platbu kvůli chybějícímu `loyalty.read`) je opravené — persona test platby je zelený._

---

## Funkce podle role

Server vynucuje oprávnění vždy; tabulka ukazuje efektivní přístup (✓ = plný, Č = jen čtení, ○ = ne). Vedoucí je datově omezen na svou pobočku.

| Funkce                        | Majitel | Admin | Vedoucí | Účetní |         Obsluha | Kuchyně | Skladník | Poznámka                                                |
| ----------------------------- | ------: | ----: | ------: | -----: | --------------: | ------: | -------: | ------------------------------------------------------- |
| Dashboard                     |       ✓ |     ✓ |       ✓ |      ✓ |               ○ |       ○ |        ○ | Obsluhu web přesměruje na Pokladnu                      |
| Faktury, dobropisy            |       ✓ |     ✓ |       ✓ |      ✓ |               ○ |       ○ |        ○ |                                                         |
| Nabídky                       |       ✓ |     ✓ |       ✓ |      ✓ |               Č |       ○ |        ○ | Účetní smí i spravovat                                  |
| Klienti / CRM                 |       ✓ |     ✓ |       ✓ |    ✓/Č |               ○ |       ○ |        ○ | CRM: Účetní jen čte                                     |
| Pokladna (prodej)             |       ✓ |     ✓ |       ✓ |      Č |               ✓ |       ○ |        ○ | storno nad limit → schválení                            |
| Stoly a kuchyně               |       ✓ |     ✓ |       ✓ |      Č |               ✓ |     KDS |        ○ | Kuchyně jen KDS                                         |
| Sklad (operace)               |       ✓ |     ✓ |       ✓ |      Č |               ✓ |       ○ |        ✓ | odpis jen se schválením (Obsluha, Skladník)             |
| Nákupní objednávky            |       ✓ |     ✓ |       ✓ |      Č |               ✓ |       ○ |        ✓ | menu web skrývá Obsluze/Účetní                          |
| Rezervace                     |       ✓ |     ✓ |       ✓ |      Č |               ✓ |       ○ |        ○ |                                                         |
| Zakázky                       |       ✓ |     ✓ |       ✓ |      Č |               ✓ |       ○ |        ○ | fakturace zakázky bez Obsluhy                           |
| Docházka (píchání)            |       ✓ |     ✓ |       ✓ |      Č |               ✓ |       ✓ |        ✓ |                                                         |
| Směny (plán)                  |       ✓ |     ✓ |       ✓ |      Č | jen publikované |       Č |        Č | mzdové údaje jen manažerské role                        |
| Uzávěrka dne                  |       ✓ |     ✓ |       ✓ |      ○ |               ○ |       ○ |        ○ |                                                         |
| Výsledky provozu, konsolidace |       ✓ |     ✓ |       ✓ |      ○ |               ○ |       ○ |        ○ | Účetní nemá `pos.reports`                               |
| Přehled DPH, Účtárna          |       ✓ |     ✓ |       ✓ |      ✓ |               ○ |       ○ |        ○ |                                                         |
| Schvalování                   |       ✓ |     ✓ |       ✓ |      ○ |            žádá |       ○ |     žádá |                                                         |
| Historie změn                 |       ✓ |     ✓ |       ○ |      ○ |               ○ |       ○ |        ○ |                                                         |
| Pobočky, členové, moduly      |       ✓ |     ✓ |       ○ |      ○ |               ○ |       ○ |        ○ | členové jen v mobilu                                    |
| API klíče a webhooky          |       ✓ |     ✓ |       ○ |      ○ |               ○ |       ○ |        ○ | `integrations.api`                                      |
| Věrnost, akce a ceny          |       ✓ |     ✓ |       ✓ |      Č |             Č\* |       ○ |        ○ | \*bez `loyalty.read` není náhled ceny; platba ✚ funguje |
| Podpisy                       |       ✓ |     ✓ |       ✓ |      Č |               ○ |       ○ |        ○ | add-on                                                  |

✚ Role **Kuchyně** a **Skladník** mají na webu vlastní zúženou navigaci (po merge); v mobilní aplikaci po commitnutí tamních oprav.

---

## Funkce podle platformy

PWA = instalovaný web (funkčně shodné s webem). Android/iOS = nativní aplikace, **zatím nevydaná v obchodech**.

| Funkce                                                     |             Web | PWA |  Android |      iOS | Omezení                                            |
| ---------------------------------------------------------- | --------------: | --: | -------: | -------: | -------------------------------------------------- |
| Registrace, přihlášení heslem                              |               ✓ |   ✓ |        ✓ |        ✓ | obnova hesla ✚ na webu (vyžaduje SMTP)             |
| Google / Apple přihlášení                                  |               ○ |   ○ |      ✓\* |      ✓\* | \*čeká na operátorské klíče                        |
| Onboarding firmy                                           |               ✓ |   ✓ |        ✓ |        ✓ | mobil zjednodušený                                 |
| Smazání účtu in-app                                        |              ✚✓ |  ✚✓ |        ✓ |        ✓ |                                                    |
| Správa členů, pozvánky, PINy                               |              ✚✓ |  ✚✓ |        ✓ |        ✓ | PINy a pracovník bez e-mailu jen web               |
| Faktury (vystavení, PDF, platby)                           |               ✓ |   ✓ |        ✓ |        ✓ |                                                    |
| Odeslání faktury e-mailem                                  |              ✚✓ |  ✚✓ |        ✓ |        ✓ | vyžaduje SMTP                                      |
| Dobropis, proforma konverze                                |               ✓ |   ✓ |        ○ |        ○ | mobil jen zobrazí                                  |
| Opakované faktury                                          |               ✓ |   ✓ |        ✓ |        ✓ |                                                    |
| DPH, Cashflow, Účtárna, ISDOC                              |               ✓ |   ✓ |    DPH ✓ |    DPH ✓ | exporty a upomínky jen web                         |
| Klientská zóna — generování odkazu                         |              ✚✓ |  ✚✓ |        ✓ |        ✓ | zóna sama je veřejný web                           |
| CRM                                                        |               ✓ |   ✓ |        ○ |        ○ | mobil vědomě nemá                                  |
| Pokladna (POS)                                             |               ✓ |   ✓ |        ✓ |        ✓ | mobil: idempotentní checkout, volná položka        |
| Restaurace (stoly, split, merge)                           |               ✓ |   ✓ |        ✓ |        ✓ |                                                    |
| Kuchyně (KDS)                                              |               ✓ |   ✓ |        ✓ |        ✓ | mobil navíc filtry Rozvoz/Vyzvednutí               |
| Mapa stolů (editor)                                        |               ✓ |   ✓ |        ○ |        ○ | mobil stoly jen používá                            |
| Sklad (stav, zrcadlo, pohyby)                              |               ✓ |   ✓ |        ✓ |        ✓ |                                                    |
| Příjemky, skladové doklady, dodavatelé, nákupní objednávky |               ✓ |   ✓ | částečně | částečně | mobil: pohyby/zrcadlo/návrhy; doklady a PO jen web |
| Inventura                                                  |               ✓ |   ✓ |        ○ |        ○ | mobil jen korekce                                  |
| Docházka                                                   |               ✓ |   ✓ |        ✓ |        ✓ |                                                    |
| Směny (plánovač)                                           |               ✓ |   ✓ |        ✓ |        ✓ | web: týdenní mřížka; mobil: seznam                 |
| Export mezd CSV                                            |               ✓ |   ✓ |        ○ |        ○ |                                                    |
| Rezervace                                                  |               ✓ |   ✓ |        ✓ |        ✓ |                                                    |
| Zakázky (vč. příloh)                                       |               ✓ |   ✓ |        ✓ |        ✓ |                                                    |
| Věrnost na pokladně                                        |               ✓ |   ✓ |      ✓\* |      ✓\* | \*mobil jen manažerské role                        |
| Výsledky provozu, konsolidace                              |               ✓ |   ✓ |        ○ |        ○ | mobil má Statistiky (tržby, výkon, Z-reporty)      |
| Uzávěrka (zavření dne)                                     |               ✓ |   ✓ |        Č |        Č | mobil Z-reporty jen čte                            |
| Schvalování                                                |               ✓ |   ✓ |        ✓ |        ✓ |                                                    |
| Historie změn (audit)                                      |               ✓ |   ✓ |        ○ |        ○ |                                                    |
| Podpisy                                                    |               ✓ |   ✓ |        ○ |        ○ | mobil jen podpisový seam u zakázky                 |
| API klíče, webhooky, integrace                             |               ✓ |   ✓ |        ○ |        ○ |                                                    |
| Veřejné objednávky a rezervace                             | ✓ (veřejný web) |   ✓ |        — |        — | host používá prohlížeč                             |

---

## Co není hotové nebo není ostré

Tato část je záměrně úplná. Nic z níže uvedeného netvrdíme v prodejních materiálech jako hotové.

**Vyžaduje externího poskytovatele / operátorský krok (Připravené k napojení):**

- **Platební terminály** — žádný ostrý adaptér (ČSOB, NFCTRON, Comgate, SumUp, GP webpay, Stripe jsou katalog s trezorem credentialů); karta = fyzický terminál mimo systém, výsledek potvrzuje obsluha ručně.
- **Online platba faktury** (Viva Smart Checkout / Stripe) — kód hotový, fail-closed; produkce až po účtu, credentials a checklistu (GO jen sandbox).
- **Ověřené podpisy / BankID** — ostrý právní podpis až po smlouvě a napojení poskytovatele; dnes evidence a mock.
- **Tisk účtenek/bonů přes agenty** — fronta a tokeny hotové, desktopový agent pro ESC/POS neexistuje.
- **Google/Apple přihlášení** — kompletní kód, čeká na OAuth konzole, Services ID, assetlinks.
- **SMS připomínky** — kanál existuje, poskytovatel SMS ne.
- **E-maily obecně** — vše podmíněno SMTP na serveru; bez něj systém poctivě vrací chybu (nic nesimuluje).

**Omezené / jen někde:**

- **Platební brána předplatného neexistuje** — tarif nastavuje podpora po domluvě. Fakturaci to nezavírá: podle ceníku je zdarma navždy a po skončení předplatného funguje dál.
- ✚ Vyřešeno (čeká na merge): webová správa Týmu/pozvánek, odeslání faktury e-mailem z webu, přepínání firem na webu, obnova hesla, role Kuchyně/Skladník na webu, správa PINů a pracovník bez e-mailu na webu, smazání účtu na webu, generování odkazu klientské zóny z webu.
- **PIN login na pokladně (lock-screen, přepínání obsluhy) a sdílený terminál** — backend hotový, obrazovky chybí (správa PINů už na webu je).
- **Věrnost při dělené platbě** se neuplatní; **na mobilu je věrnost jen pro manažerské role**.
- **Upomínky pohledávek** — jen předvyplněný mailto, žádné automatické sekvence.
- **Provize ve Směnách** — blok existuje, ale nemá zdroj dat („zobrazí se, jakmile budou prodeje napojené na zaměstnance").
- **Mobilní aplikace není v obchodech** — a fyzická device QA nikdy neproběhla (podmínka vydání).
- **Přepínání firem na mobilu** — zůstává ve firmě z přihlášení.

**Plánované (zatím neexistuje):**

- **AI asistent v aplikaci** (modul bez jediné obrazovky; MCP server je samostatný nástroj mimo aplikaci).
- **Cizí měny a kurz ČNB** — vše jen v měně firmy (CZK); žádné kurzy, žádná konverze.
- **Money S3 / SuperFaktura export a přímý účetní konektor** (Pohoda XML je soubor pro ruční import).
- **EET 2.0** (až bude legislativně aktuální), **automatické upomínky**, **push notifikace**, **offline režim**.
- **Partnerské API** („Externí integrace zatím nejsou otevřené přes veřejné API" — myšleno nad rámec dnešních scopes).
- **Veřejné spuštění a online registrace** — landing je v režimu early access (mailto), roadmapa „Brzy".

**Viditelné v UI, ale ne ostré:** modul AI asistent; karty platebních providerů „Připraveno k napojení"; BankID v katalogu podpisů; blok provizí ve Směnách; „Aktivovat Pro" (ukázková aktivace); tlačítko Odeslat u faktury na webu.

**Nedostupné běžnému uživateli:** operátorské endpointy Growth (deployment klíč), seed demo dat, terminálové a tiskové gateway tokeny, moduly `crm`/`verified_signing` (zapíná server — v Nastavení nejsou).

### Nalezené chyby a rozpory (stav po opravách 2026-07-26)

1. **P0 platba Obsluhy** — ✚ OPRAVENO (vystavenocz PR #198): 403 z náhledu ceny už platbu neblokuje; dřív záměrně červený persona test číšníka je zelený (20/20 desktop+mobil).
2. **500 u user-bound API tokenů** — ✚ OPRAVENO (vystaveno-api PR #267): doplněno mapování scope→permission + úplnostní a regresní testy.
3. **STORE_LISTING „přepínání firem jen na webu"** — ✚ po merge webového přepínače je tvrzení pravdivé (do té doby nepřesné).
4. **`/gdpr` a `/smazani-uctu`** — ✚ texty upřesněny (Google/Apple = zatím mobil; smazání účtu doplněno i pro web; sekce Tým na webu nově existuje). Pozn.: `/gdpr` má dál otevřené otázky infrastruktury z právního balíčku (F1–F8, advokátní review).
5. **Modifikátory v CLAUDE.md/AGENTS.md** — ✚ opraveno na modul `gastro`.
6. **Kolizní scénář rezervací** (dvojitá rezervace zdroje) — trvá, není testem pokrytý.
7. Nově evidováno: pozvánka bez SMTP (N3) a pobočky pro provozní role (N2) — ✚ OPRAVENO (vystaveno-api PR #268).

---

## Ověření produktu

- **Datum:** 2026-07-26.
- **Prostředí:** frontend `vystavenocz` (Vite dev, API režim) proti lokálnímu backendu `vystaveno-api` (release kandidát `fix/api-token-membership-revalidation`, commit 887bc87; PostgreSQL, DB `vystaveno_e2e`, idempotentní `seed-demo` — demo firma „Vystaveno Demo Gastro" s ~rokem dat, 3 pobočkami a všemi moduly vč. add-onů).
- **Živý průchod:** přihlášení přes UI demo účtem (Owner; přihlašovací údaje jen z lokálních env, nikde nevypisovány), ruční ověření klíčových obrazovek (dashboard, faktury + editor vystavené faktury, klienti, nastavení vč. integrací a platebních providerů, API klíče a webhooky, předplatné, průvodce, pobočky, KDS) a **poprvé i veřejných toků**: QR/online objednávka (`201 Created` → bon v KDS) a veřejná rezervace (`201 Created`).
- **Playwright:** `npm run test:e2e:audit` proti reálnému API — **128 testů: 127 prošlo, 1 přeskočen, 0 selhalo** (login, všech 42 rout, navigace, modulové průchody, simulované chybové stavy, responsivita 320–1280 px, axe bez serious/critical). Persona suite (8 rolí, desktop + mobil šířka) a 43 mock e2e speců kryjí pracovní toky — výsledky převzaty z běhů 2026-07-22/25.
- **Zdrojový audit:** kompletní inventura rout/nav/modulů webu, 83 API kontrolerů (endpointy, oprávnění, moduly, joby, webhooky, scopes) a 55 obrazovek mobilní aplikace (role-gating, parita, release stav, 164 unit testů).
- **Záměrně neprovedeno (nevratné):** zavření dne, dokončení POS platby, storno, inventura, vystavení dobropisu, mazání dat — značeno „Ostré\*"; kryto automatizovanými testy projektu.
- **Neověřeno:** SMTP odeslání skutečného e-mailu, ostré platby/podpisy (chybí poskytovatel), tisk agentem, mobilní aplikace na fyzickém zařízení, kolize rezervací, import ostrého Fakturoid exportu, detailní přepočet čísel konsolidace.

### Souhrn

| Metrika                                                        | Hodnota                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Identifikovaných funkcí (samostatné záznamy katalogu)          | **87**                                                                          |
| Ověřeno Playwrightem a/nebo živým průchodem proti reálnému API | **75**                                                                          |
| Jen zdrojový audit (bez živého běhu)                           | 13                                                                              |
| Neověřené dílčí aspekty                                        | kolize rezervací; import ostrého Fakturoid exportu; mobilní runtime na zařízení |
| Stav Ostré / Ostré\*                                           | **72**                                                                          |
| Omezené                                                        | 6                                                                               |
| Připravené k napojení (vč. mobilní app „připravené k vydání")  | 8                                                                               |
| Smíšené (část ostrá, část čeká na poskytovatele)               | 2 (klientská zóna s online platbou; platební terminály)                         |
| Plánované (samostatný záznam)                                  | 1 (AI asistent) + dílčí plánované položky uvnitř funkcí                         |

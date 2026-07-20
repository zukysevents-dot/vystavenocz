# Zásady ochrany osobních údajů (Privacy Policy) — NÁVRH k právnímu review

> Nahrazuje stávající stránku `/gdpr`, jejíž seznam subprocesorů **neodpovídá skutečné
> architektuře** (uvádí Supabase/Cloudflare/Resend/Google AI; reálně běží Služba na vlastním VPS
> s PostgreSQL a SMTP). Před zveřejněním: doplnit `[DOPLNIT]`, ověřit advokátem.

## 1. Kdo jsme

Správcem, resp. zpracovatelem osobních údajů je **Patrik Zukal**, IČO 24991686, Brodská 1914/40,
591 01 Žďár nad Sázavou, patrik@vystaveno.cz (dále „**my**" nebo „**Vystaveno**").
Pověřenec pro ochranu osobních údajů není jmenován; povinnost jej jmenovat nám podle čl. 37 GDPR
nevzniká. ⚖️ `[POTVRDIT — otázka F12]`

Řídíme se nařízením (EU) 2016/679 (**GDPR**) a zákonem č. 110/2019 Sb., o zpracování osobních údajů.

## 2. Dvě role: kdy jsme správce a kdy zpracovatel

**Správce** jsme u údajů, které se týkají vás jako uživatele Vystavena (účet, předplatné, podpora,
bezpečnost). **Zpracovatel** jsme u údajů, které do Vystavena vkládáte o svých klientech,
zaměstnancích, dodavatelích a zákaznících — jejich správcem jste vy a zpracování se řídí
**Zpracovatelskou smlouvou** (`docs/legal/03`).

## 3. Vystaveno jako správce

| Agenda | Údaje | Účel | Právní titul (čl. 6/1 GDPR) | Doba uchování |
|---|---|---|---|---|
| Registrace a účet | e-mail, jméno, heslo (jen bcrypt/argon hash), Google/Apple identifikátor | vedení účtu, přihlášení | b) smlouva | po dobu účtu + `[DOPLNIT — návrh 1 rok]` po smazání (jen nezbytné minimum pro obranu nároků) |
| Firemní profil | název, IČO, DIČ, adresa, bankovní spojení, logo | provoz Služby, hlavičky dokladů | b) smlouva | po dobu účtu (poté režim zpracovatele / výmaz dle `05`) |
| Předplatné | tarif, stav, historie plateb (bez čísel karet — drží Stripe) | fakturace Služby | b) smlouva; c) zákonné povinnosti (účetní a daňové doklady) | doklady 10 let dle § 35 zákona o DPH, resp. 5 let dle zákona o účetnictví |
| Podpora | obsah komunikace, e-mail | vyřízení požadavku | b) smlouva; f) oprávněný zájem | `[DOPLNIT — návrh 2 roky]` |
| Promo/referral | uplatněné kódy, verze podmínek, stav nároku | doložení a vyhodnocení kampaní, prevence zneužití | b) smlouva; f) oprávněný zájem | po dobu kampaně + `[DOPLNIT — návrh 3 roky]` |
| Bezpečnost a logy | IP adresa, čas přihlášení, auditní záznamy akcí, technické logy | zabezpečení, prokazatelnost akcí, prevence podvodů | f) oprávněný zájem; c) (audit) | provozní logy `[DOPLNIT — otázka F7, návrh 90 dnů]`; auditní záznamy po dobu účtu |
| Chybová hlášení webu | technická data o chybě (bez obsahu dokladů — tělo odpovědí se před odesláním odstraňuje) | oprava chyb Služby | f) oprávněný zájem | dle retence Sentry `[DOPLNIT — otázka F2; pokud DSN není nasazen, celý řádek vypustit]` |
| Marketing | e-mail | obchodní sdělení o Službě | vlastním zákazníkům dle § 7 odst. 3 zák. č. 480/2004 Sb. s možností kdykoli se odhlásit; ostatním jen na základě souhlasu a) | do odhlášení / odvolání souhlasu |
| Cookies | viz Zásady cookies (`docs/legal/04`) | — | nezbytné: f)/b); analytické a marketingové: a) souhlas | dle `04` |

**Poznámka k marketingu:** dnes žádná marketingová sdělení neposíláme a žádný marketingový souhlas
nesbíráme. Tento oddíl se aktivuje až se skutečným mechanismem (double opt-in + odhlášení v každé
zprávě) — viz mezera G-06.

## 4. Vystaveno jako zpracovatel (data vašich firem)

Do Služby vkládáte údaje, jejichž správcem jste vy: klienti a kontakty, odběratelé na fakturách,
objednávky a rezervace hostů, zaměstnanci, docházka a směny (včetně mzdových sazeb), dodavatelé,
dokumenty a přílohy zakázek, provozní data pokladny.

Pro tato data platí: zpracováváme je **výhradně pro provoz Služby a podle vašich pokynů**
(Zpracovatelská smlouva, čl. 28 GDPR), neprodáváme je, nepoužíváme pro reklamu ani trénink
AI modelů a přístup k nim mají jen členové vaší firmy podle rolí. Doby uchování určujete vy;
technické limity a výchozí chování popisují **Zásady uchovávání dat** (`docs/legal/05`).

**Citlivé údaje:** Služba není určena ke zpracování zvláštních kategorií údajů (čl. 9 GDPR) ani
údajů dětí. Pokud je vložíte do volných polí či příloh, odpovídáte za právní základ jako správce.

## 5. Příjemci a subprocesoři

Údaje zpracováváme primárně na **vlastní infrastruktuře v EU**: virtuální server
`[DOPLNIT POSKYTOVATELE VPS + ZEMI DC — otázka F1]` s databází PostgreSQL a úložištěm souborů
tamtéž. Dále využíváme:

| Subprocesor | Účel | Sídlo / lokalita dat | Přenos mimo EHP |
|---|---|---|---|
| `[DOPLNIT VPS provider]` | hosting (server, DB, soubory, zálohy) | `[DOPLNIT]` | `[DOPLNIT — očekává se: ne]` |
| Stripe Payments Europe, Ltd. | platby předplatného a online úhrady faktur | Irsko | dílčí přenosy v rámci skupiny Stripe dle SCC/DPF |
| `[DOPLNIT SMTP provider — otázka F1]` | odesílání e-mailů (doklady, pozvánky, upozornění) | `[DOPLNIT]` | `[DOPLNIT]` |
| Google Ireland Ltd. / Apple Distribution International Ltd. | pouze přihlášení účtem Google/Apple (OAuth) | Irsko | dle podmínek poskytovatelů; EU-US DPF |
| Functional Software, Inc. (Sentry) | chybová hlášení webové aplikace | USA `[POKUD JE DSN AKTIVNÍ — otázka F2; jinak vypustit]` | EU-US Data Privacy Framework |

Případné předání mimo EHP se opírá o rozhodnutí o odpovídající ochraně (EU-US Data Privacy
Framework, rozhodnutí Komise (EU) 2023/1795) nebo standardní smluvní doložky (čl. 46 GDPR).

Aktuální seznam subprocesorů udržujeme na `[DOPLNIT URL — návrh /gdpr#subprocesori]`; změny
oznamujeme postupem dle Zpracovatelské smlouvy.

## 6. Zabezpečení

Shrnutí opatření (podrobně Bezpečnostní příloha, `docs/legal/06`): šifrovaný přenos HTTPS,
oddělení dat firem (tenant izolace na úrovni databázových dotazů), role a oprávnění, auditní
záznamy klíčových akcí, hesla ukládaná jen jako otisk, tokeny v mobilní aplikaci v systémovém
zabezpečeném úložišti, šifrovaný trezor pro klíče integrací (AES-256-GCM), pravidelné zálohy.

## 7. Vaše práva

Máte právo na přístup (čl. 15), opravu (16), výmaz (17), omezení zpracování (18), přenositelnost
(20), námitku proti zpracování z oprávněného zájmu (21) a odvolání souhlasu (7/3). Uplatníte je
na patrik@vystaveno.cz; odpovíme do 1 měsíce. Máte právo podat stížnost u Úřadu pro ochranu
osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, [uoou.gov.cz](https://uoou.gov.cz).

Pokud jste **klientem, zaměstnancem nebo hostem firmy**, která Vystaveno používá, obracejte se
prosím nejprve na tuto firmu — je správcem vašich údajů; my jí s vyřízením pomůžeme.

## 8. Smazání účtu

Účet smažete přímo v aplikaci (Nastavení → Smazat účet) nebo postupem na
[vystaveno.cz/smazani-uctu](https://vystaveno.cz/smazani-uctu). Co přesně se smaže, co se
anonymizuje a co musíme ze zákona dočasně uchovat (daňové doklady), popisují Zásady uchovávání
dat (`docs/legal/05`) a obrazovka mazání účtu.

## 9. Změny těchto zásad

O podstatných změnách informujeme e-mailem nebo v aplikaci. Účinnost: `[DOPLNIT DATUM]`.

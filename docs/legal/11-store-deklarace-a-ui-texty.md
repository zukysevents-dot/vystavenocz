# Store deklarace a UI texty — založené výhradně na skutečném chování systému

## 1. Checkboxy při registraci (návrh)

Povinný (jeden, bez předzaškrtnutí):
> ☐ Souhlasím s [Obchodními podmínkami](/podminky) a beru na vědomí
> [Zásady ochrany osobních údajů](/gdpr). Službu užívám jako podnikatel; pro data mé firmy platí
> [Zpracovatelská smlouva](/gdpr#dpa).

Volitelný (odděleně, jen až bude marketing reálně existovat — G-06):
> ☐ Chci dostávat novinky o Vystavenu e-mailem (lze kdykoli odhlásit).

Zásady: souhlas s OP = podmínka služby; marketing nikdy nesvazovat s registrací; ukládat verzi
textu + čas u obou.

## 2. Privacy centrum (Nastavení → Soukromí) — návrh obrazovky

- **Dokumenty:** Obchodní podmínky · Zásady ochrany údajů · Zpracovatelská smlouva · Cookies ·
  Bezpečnost (odkazy s verzí a datem účinnosti)
- **Vaše data:** [Exportovat data firmy] (po G-04) · [Správa cookies] (otevře preference) ·
  Seznam subprocesorů
- **Účet:** [Smazat účet] → obrazovka níže
- (až bude marketing) **Souhlasy:** přepínač newsletteru + historie souhlasů

## 3. Obrazovka smazání účtu — text (soulad s Play/App Store)

Nadpis: **Smazat účet**
> Smazání je nevratné. Než pokračujete:
> 1. **Exportujte si data** — po smazání k nim ztratíte přístup.
> 2. Osobní údaje smažeme nebo anonymizujeme; ze záloh zmizí rotací do `[DOPLNIT]` dnů.
> 3. Doklady o vašem předplatném musíme ze zákona uchovat (10 let, zákon o DPH) — uchovají se
>    odděleně a nebudou dál používány.
> 4. Jste-li poslední vlastník firmy s dalšími členy, nejdřív předejte vlastnictví.
>
> Potvrďte heslem / přihlášením. [Smazat účet — nevratné]

Web ekvivalent: `/smazani-uctu` (už popisuje in-app postup i e-mailovou žádost — ponechat).

## 4. Google Play — Data Safety (odpovědi dle reality)

Zdroj pravdy: mobil nemá ŽÁDNÉ analytics/crash/ads SDK; komunikuje jen s API Vystavena.

| Otázka | Odpověď |
|---|---|
| Does your app collect or share user data? | **Collects: Yes. Shares: No.** (žádné třetí strany pro reklamu/analytiku) |
| Data types collected | Personal info: **Name, Email address** (účet) · Financial info: **žádné platební údaje v aplikaci** — fakturační/obchodní záznamy firmy = **App activity? Ne — patří pod „Other info"?** → deklarovat jako **Personal info (name, email)** + **App info and performance: No** + **Files and docs: Yes** (přílohy, jen pokud je uživatel nahraje) |
| Purpose | App functionality; Account management |
| Data shared with third parties | No (OAuth: přihlášení Google/Apple probíhá u poskytovatele, aplikace sdílí jen nezbytný token) |
| Encrypted in transit | Yes (HTTPS vynucené) |
| Can users request deletion | Yes — in-app (Nastavení → Smazat účet) + URL `https://vystaveno.cz/smazani-uctu` |
| Data deletion practices | Account + associated data deleted/anonymized; zákonné účetní výjimky popsány na deletion URL |
| Independent security review | No |

Pozn.: detailní mapování polí drž v `docs/release/DATA_SAFETY.md` (mobilní repo) — tam je
autoritativní verze; tuto tabulku s ní držet v synku.

## 5. App Store — App Privacy (nutrition labels)

| Sekce | Deklarace |
|---|---|
| Data Used to Track You | **Žádná** (žádný tracking/ATT není potřeba) |
| Data Linked to You | Contact Info (Name, Email) · User Content (dokumenty/přílohy, obchodní záznamy firmy) — účel App Functionality |
| Data Not Linked to You | Žádná (nic se nesbírá anonymně — žádná analytika) |
| Privacy Policy URL | `https://vystaveno.cz/gdpr` (po opravě G-01) |

App Review poznámky: Sign in with Apple nativní (Guideline 4.8 ✅), account deletion in-app
(5.1.1(v) ✅), „platba kartou" v POS jen eviduje platbu na vlastním terminálu obsluhy — aplikace
platby nezpracovává. Export compliance: standardní HTTPS/TLS → exempt.

## 6. Pravidlo synchronizace

Jediný zdroj pravdy je kód. Každá změna SDK, trackingu, subprocesora nebo datového toku znamená
současnou aktualizaci: `02` (privacy) + `04` (cookies) + tohoto dokumentu + store konzolí.
Nikdy nedeklarovat míň, než se sbírá; nikdy neslibovat víc mazání, než systém umí.

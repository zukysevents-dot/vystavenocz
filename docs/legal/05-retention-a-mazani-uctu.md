# Zásady uchovávání dat a mazání účtu — NÁVRH k právnímu review

> Tabulky rozlišují: **smazání účtu** (zánik přístupu uživatele), **zrušení předplatného** (účet a
> data zůstávají), **anonymizaci** (odstranění vazby na osobu), **archivaci** (izolované uložení ze
> zákona) a **výmaz**. Hodnoty `[DOPLNIT]` jsou návrhy — potvrdit provozně a s advokátem.

## 1. Zákonné opory pro uchování

- Daňové doklady: **10 let** od konce zdaňovacího období (§ 35, § 35a zákona č. 235/2004 Sb., o DPH).
- Účetní doklady: **5 let**, účetní závěrka a výroční zpráva **10 let** (§ 31–32 zákona č. 563/1991
  Sb., o účetnictví; nový zákon o účetnictví nejdřív od 2027 — sledovat).
- Mzdové listy zaměstnavatele: **až 30 let** (§ 35a zákona č. 582/1991 Sb.) — povinnost **firmy-
  Uživatele**, ne Vystavena; Vystaveno není mzdový archiv.
- Obhajoba právních nároků: obecná promlčecí lhůta 3 roky (§ 629 OZ) — titul čl. 6/1 f), čl. 17/3 e) GDPR.

## 2. Retenční tabulka — Vystaveno jako správce

| Data | Při běžícím účtu | Po smazání účtu |
|---|---|---|
| Uživatelský účet (e-mail, jméno, hash hesla) | po dobu účtu | anonymizace bez zbytečného odkladu; nezbytné minimum pro obranu nároků `[DOPLNIT — návrh 1 rok]` |
| OAuth vazby (Google/Apple ID) | po dobu účtu | výmaz spolu s účtem |
| Refresh tokeny | 14 dní klouzavě, revokace při odhlášení | okamžitá revokace |
| Přístupové/bezpečnostní logy | `[DOPLNIT — otázka F7, návrh 90 dnů]` | dožití retence |
| Doklady o předplatném (naše účetnictví) | — | **archivace 10 let (DPH), mimo dosah mazání účtu** — uživateli to říct předem |
| Support komunikace | `[DOPLNIT — návrh 2 roky]` | dožití retence |
| Promo/referral evidence | kampaň + `[DOPLNIT — návrh 3 roky]` | anonymizace kódů, nároky zůstávají doložitelné |
| Marketingové souhlasy (až budou) | do odvolání | výmaz; evidence odvolání `[návrh 3 roky]` |

## 3. Retenční tabulka — firemní data (Vystaveno jako zpracovatel)

| Data | Za života firmy | Po smazání firmy/účtu |
|---|---|---|
| Klienti, dodavatelé, CRM | řídí Uživatel (může mazat průběžně) | výmaz |
| Faktury a doklady | řídí Uživatel; Služba je nemaže | výmaz — **před smazáním musí Uživatel exportovat**; zákonná archivace je JEHO povinnost |
| Prodeje, uzávěrky, objednávky, rezervace | řídí Uživatel | výmaz |
| Zaměstnanci, docházka, směny, mzdové sazby | řídí Uživatel | výmaz |
| Přílohy a dokumenty | řídí Uživatel | výmaz souborů z úložiště |
| Auditní log firmy | append-only po dobu firmy | výmaz spolu s firmou |
| API tokeny, webhooky (vč. historie doručení) | revokace kdykoli; historie doručení zatím bez retence → mezera G-09 | výmaz |
| Věrnostní účty zákazníků | řídí Uživatel | výmaz |

## 4. Zálohy

- Zálohy slouží výhradně k obnově provozu; jednotlivé záznamy se z nich neobnovují.
- Smazaná data zanikají **rotací záloh do `[DOPLNIT — otázka F8, návrh max. 30 dnů]`**; do té doby
  jsou v zálohách technicky přítomna, ale nepoužívají se.
- Při obnově ze zálohy po havárii se znovu provede výmaz účtů smazaných mezi zálohou a havárií
  `[POTVRDIT PROVOZNĚ — vyžaduje evidenci žádostí o výmaz]` → mezera G-10.

## 5. Mazání účtu — skutečný proces (a co říct uživateli)

Implementováno: **Nastavení → Smazat účet** (mobil i web) volá `DELETE /api/v1/me`; veřejný postup
popisuje `/smazani-uctu` (plní požadavky Google Play „Data deletion" i App Store 5.1.1(v)).

Chování systému: vyžaduje potvrzení heslem (u OAuth účtů potvrzení přihlášením); poslední Owner
firmy s dalšími členy dostane pokyn nejdřív předat vlastnictví nebo firmu smazat (409); osobní
údaje se anonymizují, účetně nezbytné záznamy provozovatele se archivují odděleně.

**Text obrazovky před potvrzením (návrh):**

> **Smazání účtu je nevratné.**
> - Ztratíte přístup ke všem svým firmám a dokladům. Data si nejdřív exportujte.
> - Osobní údaje smažeme nebo anonymizujeme bez zbytečného odkladu; ze záloh zmizí do
>   `[DOPLNIT]` dnů jejich rotací.
> - Doklady o vašem předplatném musíme ze zákona uchovat 10 let (zákon o DPH) — bez vazby na
>   váš další provoz.
> - Jste-li poslední vlastník firmy s dalšími členy, nejdřív předejte vlastnictví, nebo firmu smažte.
> **Nikdy neslibujeme „smažeme úplně vše" — zákonné archivace se smazání netýká.**

## 6. Zrušení předplatného ≠ smazání účtu

Zrušením předplatného data nezanikají; účet přejde do omezeného režimu s možností exportu. Výmaz
dlouhodobě neaktivních neplacených účtů: `[ROZHODNOUT — návrh: upozornění e-mailem + výmaz po
24 měsících nečinnosti]` ⚖️ → mezera G-11.

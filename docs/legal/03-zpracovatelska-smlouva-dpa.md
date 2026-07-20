# Smlouva o zpracování osobních údajů (DPA) — NÁVRH k právnímu review

> Uzavírá se dle **čl. 28 odst. 3 GDPR** mezi firmou užívající Vystaveno („**Správce**") a
> provozovatelem Vystavena („**Zpracovatel**": Patrik Zukal, IČO 24991686, Brodská 1914/40,
> 591 01 Žďár nad Sázavou). Je nedílnou součástí Obchodních podmínek; akceptuje se spolu s nimi.
> ⚖️ *Mechanismus akceptace (checkbox při založení firmy) je implementační mezera G-07.*

## 1. Předmět a doba

1.1 Zpracovatel pro Správce zpracovává osobní údaje vložené do Služby Vystaveno, a to po dobu
trvání smlouvy o užívání Služby a dále po dobu nutnou k výmazu/vrácení dat dle čl. 10.

## 2. Povaha, účel a rozsah zpracování (Příloha 1)

2.1 Povaha: uložení, strukturování, zobrazení, export, zálohování, zpřístupnění členům firmy dle
rolí, odeslání dokumentů e-mailem na pokyn Správce, výmaz.
2.2 Účel: výhradně poskytování funkcí Služby Správci. Zpracovatel údaje nepoužívá pro vlastní
účely, reklamu, profilování ani vývoj/trénink AI modelů.

## 3. Pokyny Správce

3.1 Zpracovatel zpracovává údaje **pouze na základě doložených pokynů Správce**; pokynem se rozumí
konfigurace a užití funkcí Služby a tato smlouva. To platí i pro předání do třetí země, ledaže
zpracování ukládá právo EU/ČR — pak Zpracovatel Správce předem informuje, nezakazuje-li to zákon.
3.2 Považuje-li Zpracovatel pokyn za rozporný s GDPR nebo jiným předpisem, **neprodleně Správce
upozorní** (čl. 28 odst. 3 poslední pododstavec GDPR).

## 4. Mlčenlivost

4.1 K údajům mají přístup pouze osoby zavázané mlčenlivostí, a to v rozsahu nezbytném pro provoz
a podporu Služby.

## 5. Zabezpečení (čl. 32 GDPR)

5.1 Zpracovatel zavede a udržuje technická a organizační opatření dle **Přílohy 3** (shodná s
veřejnou Bezpečnostní přílohou, `docs/legal/06`).

## 6. Subprocesoři

6.1 Správce uděluje **obecné povolení** k zapojení subprocesorů z **Přílohy 2**.
6.2 Zamýšlenou změnu (přidání/nahrazení) Zpracovatel oznámí e-mailem nebo v aplikaci alespoň
**14 dní** předem ⚖️; Správce může vznést námitku — nedojde-li ke shodě, může smlouvu ukončit
ke dni účinnosti změny.
6.3 Subprocesorům jsou uloženy povinnosti odpovídající této smlouvě; za jejich plnění odpovídá
Zpracovatel.

## 7. Pomoc Správci

7.1 **Práva subjektů údajů (čl. 12–23):** Zpracovatel s přihlédnutím k povaze zpracování pomáhá
vhodnými opatřeními — zejména funkcemi Služby (přístup, oprava, výmaz, export) a součinností na
patrik@vystaveno.cz. Žádost subjektu doručenou přímo Zpracovateli bez zbytečného odkladu předá
Správci.
7.2 **Incidenty (čl. 33–34):** porušení zabezpečení týkající se údajů Správce oznámí Zpracovatel
Správci **bez zbytečného odkladu** po zjištění, s informacemi dle čl. 33 odst. 3 GDPR v rozsahu,
v jakém jsou dostupné. Ohlášení ÚOOÚ a subjektům je povinností Správce; Zpracovatel poskytne
součinnost.
7.3 **DPIA a konzultace (čl. 35–36):** Zpracovatel poskytne informace o zpracování a opatřeních,
které má k dispozici.

## 8. Audit

8.1 Zpracovatel zpřístupní informace nezbytné k doložení souladu s čl. 28 GDPR (tato smlouva,
Bezpečnostní příloha, seznam subprocesorů, souhrnné odpovědi na dotazník).
8.2 Audit na místě je možný po písemné dohodě, max. 1× ročně, v běžné pracovní době, na náklady
Správce, bez přístupu k datům jiných firem. ⚖️

## 9. Odpovědnost

9.1 Odpovědnost stran se řídí čl. 82 GDPR a limitací v Obchodních podmínkách § 11 v rozsahu, v
jakém je limitace přípustná. ⚖️

## 10. Výmaz a vrácení dat

10.1 Po ukončení Služby si Správce může data exportovat funkcemi Služby (viz OP § 10).
10.2 Zpracovatel poté data **smaže nebo anonymizuje** postupem a ve lhůtách dle Přílohy 4, ledaže
právo EU/ČR ukládá uložení (pak je uchová jen v nezbytném rozsahu a izolovaně).
10.3 Data v zálohách zanikají rotací záloh dle Přílohy 4; do té doby se z nich neobnovují jinak
než při havárii celé Služby.

---

## Příloha 1 — Kategorie zpracování

| Kategorie subjektů | Typy údajů |
|---|---|
| Klienti/odběratelé Správce | identifikační a fakturační údaje (název/jméno, IČO, DIČ, adresa), e-mail, telefon, obsah dokladů, poznámky |
| Zákazníci/hosté (gastro, rezervace, veřejné objednávky) | jméno, kontakt, obsah objednávky/rezervace, stůl, věrnostní body |
| Zaměstnanci a členové týmu Správce | jméno, e-mail, role, pobočka, pozice, hodinová sazba, docházka, směny |
| Dodavatelé | identifikační a kontaktní údaje, objednávky, příjemky |
| Osoby v dokumentech | jakékoli údaje obsažené v přílohách (PDF/JPEG/PNG/WebP) a volných polích — jejich vkládání řídí výhradně Správce |
| Podepisující osoby (modul Podpisy) | jméno, e-mail, telefon, otisk dokumentu (SHA-256), evidenční záznamy |

Zvláštní kategorie údajů (čl. 9) nejsou Službou vyžadovány ani cíleně zpracovávány; Správce je
nesmí vkládat bez vlastního právního základu.

## Příloha 2 — Schválení subprocesoři

Totožná s tabulkou v Zásadách ochrany osobních údajů (`docs/legal/02` § 5):
`[DOPLNIT VPS]`, Stripe Payments Europe Ltd., `[DOPLNIT SMTP]`, Google Ireland Ltd. / Apple
Distribution International Ltd. (jen OAuth), `[Sentry — jen je-li aktivní]`.
Aktuální verze: `[DOPLNIT URL]`.

## Příloha 3 — Technická a organizační opatření

Viz Bezpečnostní příloha (`docs/legal/06`) — popisuje pouze skutečně implementovaná opatření
(HTTPS, tenant izolace, RBAC, audit log, šifrovaný trezor credentialů, zálohy s ověřením obnovy,
hash hesel, zabezpečené uložení tokenů v mobilu).

## Příloha 4 — Harmonogram výmazu (retention schedule)

Viz Zásady uchovávání dat (`docs/legal/05`) — pro DPA jsou závazné tabulky „Firemní data" a
„Zálohy". Klíčové hodnoty: výmaz/anonymizace po smazání účtu bez zbytečného odkladu; zálohy
rotují do `[DOPLNIT — otázka F8]`; vlastní účetní/daňové doklady Zpracovatele stojí mimo rozsah
této smlouvy (je u nich správcem on).

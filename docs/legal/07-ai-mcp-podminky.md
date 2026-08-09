# Podmínky AI funkcí a MCP — NÁVRH „do šuplíku"

> **Dnes Vystaveno žádnou AI funkci neobsahuje** (modul `ai` je jen přepínač bez implementace;
> na webu běží pouze animovaná ukázka bez skutečného modelu). Tento dokument se **nezveřejňuje**,
> dokud první reálná AI funkce nevznikne — do té doby by byl klamavý. Stávající `/gdpr` zmínku
> o „Google AI funkcích" je nutné odstranit (mezera G-01).

## 1. Zásady, na kterých budoucí AI funkce stojí

1. **AI je asistent, ne rozhodovatel.** AI nesmí autonomně provádět finanční, účetní, daňové,
   právní ani personální rozhodnutí (vystavit doklad, provést platbu, změnit mzdu, smazat data).
   Každá **zápisová akce vyžaduje explicitní potvrzení člověkem** v UI s náhledem toho, co se stane.
2. **Výstupy je nutné ověřit.** Výstup AI může být nepřesný; uživatel odpovídá za kontrolu před
   použitím (zejména u čísel, DPH a právních textů). UI to u AI výstupů viditelně připomíná.
3. **Data k AI odchází jen účelově.** Provider `[DOPLNIT AŽ BUDE — otázka F16]` dostane pouze data
   nezbytná pro konkrétní požadavek uživatele, nikdy celou databázi; předání se řídí DPA s
   providerem a je uvedeno v seznamu subprocesorů PŘED spuštěním funkce.
4. **Žádný trénink na datech zákazníků.** Data firem se nesmí používat k trénování modelů —
   smluvně zajištěno u providera (zero-retention / no-training režim), bez samostatného výslovného
   právního základu se nic nemění.
5. **Vypínatelnost per firma.** Modul AI je opt-in; Owner/Admin ho může kdykoli vypnout a bez
   zapnutého modulu žádná data k AI providerovi neodcházejí.
6. **Tenant izolace platí i pro AI.** Kontext požadavku se skládá výhradně z dat firmy uživatele a
   v mezích jeho role; AI nesmí obejít oprávnění (MCP vrstva používá stejné autorizační politiky
   jako API).
7. **Audit.** AI-iniciované akce se zapisují do auditního logu (kdo potvrdil, co se změnilo) stejně
   jako ruční akce.

## 2. Návrh textu podmínek (aktivovat s první funkcí)

**Dodatek: AI funkce** — (a) AI funkce jsou volitelná součást Služby; poskytujeme je „jak jsou";
(b) výstupy mají informativní povahu a nenahrazují odborné poradenství; před použitím je ověřte;
(c) zápisové akce provádí Služba až po vašem potvrzení; (d) pro zpracování požadavku předáváme
nezbytná data subprocesorovi `[DOPLNIT]` dle Zpracovatelské smlouvy; vaše data se nepoužívají k
trénování modelů; (e) AI funkce může Owner/Admin firmy kdykoli vypnout v Nastavení.

## 3. Kontrolní seznam před spuštěním první AI/MCP funkce

- [ ] provider vybrán, DPA + no-training/zero-retention písemně (F16)
- [ ] zápis do seznamu subprocesorů + oznámení firmám dle DPA čl. 6 (14 dní předem)
- [ ] přepínač modulu v Nastavení firmy + výchozí stav VYPNUTO
- [ ] potvrzovací dialog u všech write akcí + audit záznam
- [ ] EU AI Act: klasifikace funkce (očekávaně mimo vysoké riziko; povinnosti transparentnosti
      čl. 50 nařízení (EU) 2024/1689 — označit AI výstup) ⚖️
- [ ] aktualizace Privacy Policy, DPA přílohy 2, store deklarací

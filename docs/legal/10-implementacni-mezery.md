# Implementační mezery — dokumenty vs. skutečný produkt (k 20. 7. 2026)

Priorita: P0 = release blocker (nepravdivé deklarace / porušení pravidel), P1 = před platícími
zákazníky, P2 = do 3 měsíců, P3 = polish. „⚖️" = vyžaduje rozhodnutí advokáta/operátora.

## P0 — release blockery

**G-01 · Nepravdivá Privacy Policy na `/gdpr`** 🔴
Dopad: klamavá informační povinnost (čl. 13/14 GDPR) — uvádí Supabase/Cloudflare/Resend/Google AI,
které v produktu nejsou; naopak chybí skutečný VPS, SMTP a případný Sentry.
Oprava: nahradit obsah `src/pages/GdprPage.vue` textem z `02` po doplnění F1–F2.
Test: e2e kontrola, že `/gdpr` neobsahuje „Supabase|Cloudflare|Resend|AI" a obsahuje skutečné
subprocesory. ⚖️ ano (finální text).

**G-02 · Cookie banner slibuje analytiku, která neexistuje**
Dopad: matoucí souhlas „s Google Analytics & Plausible", ačkoli `src/lib/analytics.ts` je no-op —
sbírá se souhlas bez zpracování; současně by budoucí zapnutí analytiky proběhlo bez re-consentu.
Oprava: přepsat `src/components/CookieBanner.vue` na pravdivou „jen nezbytné" lištu (návrh v `04`
§ 3); přepínač Analytika odstranit, dokud analytika reálně neexistuje.
Test: e2e — banner neobsahuje „Analytics/Plausible"; volba se ukládá. ⚖️ ne.

**G-03 · Account deletion + `/smazani-uctu` nejsou nasazené**
Dopad: store požadavky (Play Data deletion, Apple 5.1.1(v)) — kód existuje jen ve větvích
(`feat/mobile-oauth`, uncommitted web/mobile změny). Bez nasazení nelze podat do storů.
Oprava: commit + deploy (viz mobilní release checklist §0).
Test: `DELETE /api/v1/me` na stagingu + živá stránka `/smazani-uctu`. ⚖️ ne.

**G-14 · Store deklarace se musí generovat z reality**
Dopad: nepravdivá Data Safety / App Privacy = odmítnutí či stažení aplikace.
Oprava: použít výhradně odpovědi z `11` (žádný tracking, žádné SDK) a držet je v synku s kódem;
jakékoli nové SDK = aktualizace deklarací.
Test: ruční křížová kontrola před každým submitem. ⚖️ ne.

## P1 — před prvními platícími zákazníky

**G-04 · Chybí kompletní export dat firmy** — dílčí exporty existují (CSV/ISDOC/účetní), ale ne
„stáhnout vše" před smazáním účtu (čl. 20 GDPR + férovost OP § 10). Oprava: endpoint + UI „Export
firmy" (ZIP: doklady, klienti, sklad, přílohy). Modul: nový backend service + Nastavení. Test:
integrační — export obsahuje všechny entity firmy. ⚖️ ne.

**G-05 · DPA akceptace (G-07 v textech)** — checkbox „souhlasím s OP + DPA" při registraci/založení
firmy + uložení verze a času souhlasu. Modul: registrace + `users`/`companies` tabulka. Test:
záznam o akceptaci vzniká. ⚖️ text ano.

**G-06 · Unsubscribe/marketing infrastruktura** — dnes nesmí odejít žádný newsletter (žádný souhlas,
žádné odhlášení). Oprava: buď neposílat (stačí pro launch), nebo doplnit double opt-in + odhlašovací
odkaz + evidenci souhlasů. ⚖️ ano (režim § 7/3 zák. 480/2004).

**G-08 · Evidence žádostí o výmaz vs. obnova záloh** — po obnově ze zálohy se smazané účty musí
smazat znovu (`05` § 4). Oprava: perzistentní žurnál výmazů mimo hlavní DB + krok v runbooku obnovy.
Test: obnova na stagingu → účet zůstává smazaný. ⚖️ ne.

**G-12 · Formalizovat incident response** — jednostránkový runbook (kdo, do kdy, šablona oznámení
firmám, kritéria pro ÚOOÚ do 72 h) + security@ alias (F6). ⚖️ šablonu ano.

## P2

**G-09 · Retenční purge joby** — webhook delivery historie bez retence (známý `ponytail:` dluh),
provozní logy bez definované rotace (F7), staré refresh tokeny. Oprava: background purge +
logrotate config. Test: job maže dle konfigurace.

**G-10 · Privacy centrum v aplikaci** — jedno místo (Nastavení → Soukromí): odkazy na dokumenty,
správa cookies, export dat, smazání účtu, seznam subprocesorů (návrh obrazovky v `11`).

**G-11 · Politika neaktivních účtů** — výmaz po `[24 měsících?]` nečinnosti s e-mail upozorněním
(`05` § 6). ⚖️ ano.

**G-13 · Slovník podpisů v UI** — projít texty modulu Podpisy, aby nikde nebylo „právně závazný
podpis"; sladit s `08`. Test: grep UI textů.

## P3

**G-15 · ROPA (čl. 30)** — interní záznamy o činnostech zpracování z tabulek `02`/`03` (C-25).
**G-16 · Kyberzákon samoidentifikace** — provést a založit písemně (F15, C-21).
**G-17 · Upload varování u příloh** — nenápadná poznámka „nevkládejte citlivé údaje bez právního
základu" u `EntityAttachmentsPanel.vue` (F21).

## P0 release blocker list (souhrn)

1. G-01 pravdivá `/gdpr` (po doplnění F1–F3)
2. G-02 pravdivý cookie banner
3. G-03 deploy account deletion + `/smazani-uctu`
4. G-14 store deklarace dle `11`
5. C-27 advokátní review OP + Privacy + DPA před zveřejněním

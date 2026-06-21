# CLAUDE.md

Tradeoff: Tato pravidla preferují opatrnost před rychlostí. U triviálních úkolů použij selský rozum.

## 0. O projektu

**Vystaveno.cz** — migrace ze staré React appky na **Vue 3**, zatím frontend-only MVP.

- **Stack:** Vue 3 (`<script setup>` SFC) + Vite + TypeScript. Package manager **npm**.
- **Komunikace:** s uživatelem **česky**, kód a identifikátory **anglicky**.
- **Příkazy:**
  - `npm run dev` — vývojový server (localhost)
  - `npm run build` — produkční build včetně typecheck (`vue-tsc`)
  - `npm run lint` — ESLint
  - `npm run format` — Prettier
- **Repo:** [github.com/zukysevents-dot/vystavenocz](https://github.com/zukysevents-dot/vystavenocz) — větev `main` = **stará React appka** (slouží jen jako reference, NEvracet ji do working tree). Pracuje se na samostatných větvích.
- **Plán práce:** GitHub Project #1 — 58 tasků, fáze F0–F8.
- **Git:** žádný `commit` ani `push` bez mého výslovného potvrzení.

## 1. Nejdřív přemýšlej, pak piš kód

Nepředpokládej. Neskrývej zmatek. Pojmenuj tradeoffy.

Před implementací:

- Své předpoklady řekni nahlas. Pokud si nejsi jistý, zeptej se.
- Pokud existuje víc možných výkladů, ukaž je — nevybírej potichu.
- Pokud existuje jednodušší cesta, řekni to. Když to dává smysl, oponuj.
- Pokud je něco nejasné, zastav se. Pojmenuj, co tě mate. Zeptej se.

## 2. Nejdřív jednoduchost

Minimum kódu, který řeší daný problém. Nic spekulativního.

- Žádné featury navíc, které nebyly zadány.
- Žádné abstrakce pro kód použitý jen jednou.
- Žádná „flexibilita" nebo „konfigurovatelnost", o kterou nikdo nepožádal.
- Žádné ošetření chyb pro scénáře, které nemůžou nastat.
- Pokud jsi napsal 200 řádek a šlo to na 50, přepiš to.

Zeptej se sám sebe: „Řekl by senior engineer, že je to zbytečně složité?" Pokud ano, zjednoduš.

## 3. Zásahy, opravy a updaty

Sahej jen na to, na co musíš. Uklízej jen po sobě.

Když upravuješ existující kód:

- „Nevylepšuj" sousední kód, komentáře ani formátování.
- Nerefaktoruj věci, které nejsou rozbité.
- Drž se stávajícího stylu, i kdybys to dělal jinak.
- Pokud si všimneš nesouvisejícího mrtvého kódu, zmiň ho — nemaž ho.

Když tvé změny vytvoří „osiřelý" kód:

- Smaž importy / proměnné / funkce, které tvé změny udělaly nepoužívanými.
- Nemaž mrtvý kód, který tu byl už předtím, pokud o to nikdo nepožádá.

Test: Každý změněný řádek by měl jít přímo dohledat k požadavku uživatele.

## 4. Exekuce podle cíle

Definuj kritéria úspěchu. Cyklicky ověřuj, dokud nesedí.

Z úkolů udělej ověřitelné cíle. V tomhle projektu (frontend, zatím bez testů) ověření typicky znamená:

- **Build projde čistě:** `npm run build` (včetně typecheck) bez chyb.
- **Lint projde:** `npm run lint` bez chyb.
- **Vypadá to správně:** stránka naběhne v prohlížeči bez chyb v konzoli.

Když task výslovně přidává testy, pak platí: „napiš test, který stav reprodukuje, a doveď ho k zelené."

U vícekrokových úkolů sepiš krátký plán:

```
1. [Krok] → ověření: [kontrola]
2. [Krok] → ověření: [kontrola]
3. [Krok] → ověření: [kontrola]
```

Silná kritéria úspěchu ti umožní pracovat samostatně v cyklu. Slabá kritéria („udělej to, ať to funguje") vyžadují neustálé doptávání.

---

Tato pravidla fungují, když: v diffech je méně zbytečných změn, méně přepisování kvůli překomplikování, a doptávání přichází před implementací, ne až po chybách.

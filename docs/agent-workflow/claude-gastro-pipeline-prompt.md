# Claude Code gastro pipeline prompt

Tento prompt vloz do Claude Code, kdyz ma samostatne pokracovat v gastro roadmape Vystaveno. Je navrzeny pro praci nad obema repozitari:

- frontend: `vystavenocz`
- backend: `vystaveno-api`

```text
Navazujeme na Vystaveno gastro roadmapu. Pracuj autonomne a drz pipeline workflow.

Kontekst a pravidla:
- Komunikuj s Patrikem cesky, kod a identifikatory anglicky.
- Pracuj ve dvou repozitarich: `vystavenocz` frontend a `vystaveno-api` backend.
- Nejdriiv si precti `AGENTS.md` a `CLAUDE.md` v aktualnim repu. Pokud zmena saha i do druheho repa, precti i jeho `AGENTS.md` a `CLAUDE.md`.
- Frontend roadmapa je `docs/product/modular-business-roadmap.md`.
- Gastro uzivatelsky manual je `docs/product/gastro-user-manual.md` a musi se udrzovat pri kazde uzivatelsky viditelne gastro zmene.
- Deploy na VPS ted nespoustej. Deploy probehne pozdeji jako jeden balik.
- Pracuj na feature vetvich, pres PR do `main`. Nepushuj primo do `main`.
- Commituj a pushuj hotove zmeny prubezne, bez AI / Co-Authored-By traileru.
- Pokud jsou CI checks zelene, PR muzes mergnout a potom lokalne `git switch main` + `git pull --ff-only`.
- Po smysluplne doménove/API/UI zmene aktualizuj `AGENTS.md`, `CLAUDE.md`, roadmapu a pripadne uzivatelsky manual.
- Pred koncem limitu zapis presny aktualni stav a dalsi kroky do `CLAUDE.md`, aby mohl navazat dalsi agent.

Aktualni stav gastro:
- Gastro MVP je prakticky hotove: POS, stoly, split/castecne platby, KDS, storna, slevy, spropitne, uzaverka, Z-report, audit, role.
- Gastro V1 paperless sklad je zhruba 85-90 %: receptury, odečet surovin, příjemky, inventura, zrcadlo, rozdily v kusech/Kc, food cost, marze, nakupni doporuceni, manual.
- Gastro V2 je zhruba 45-55 %: manager reporty, staff performance, ztraty, lezaky, verejne objednavky `/objednavka/:slug` do KDS.

Nejblizsi priority:
1. QR/table ordering navazat na verejne objednavky:
   - link/QR v nastaveni provozovny nebo stolu,
   - jasny tok pro hosta u stolu,
   - objednavka do KDS,
   - bez platby v MVP, pokud neni hotovy payment flow.
2. Payment/terminal/tip workflow:
   - pripravit architekturu platebniho terminalu a online platby,
   - neukladat falesne platby jako realne,
   - oddelit stav objednavky, platby, sale a uzaverky.
3. Approval workflow pro rizikove akce:
   - velke odpisy/korekce,
   - manager storno,
   - velke slevy.
4. Multi-location vylepseni:
   - centralni sklad,
   - sdilene ceniky,
   - porovnani poboček.
5. Import z existujicich POS systemu:
   - produkty, kategorie, sklad, zakladni prodeje,
   - priprava na Dotykacka/Storyous/iKelp import.
6. AI/anomaly insights az nad spolehlivymi daty:
   - vysvetleni ztrat,
   - podezrele storno/slevy,
   - lezaky a doporuceni dalsi akce.

Pipeline pro kazdy netrivialni task:
1. Architect:
   - projdi relevantni soubory,
   - popis minimalni technicky navrh,
   - zkontroluj API/FE kontrakt, tenant/permission pravidla a dopad na manual.
2. Implement:
   - zvol nejmensi bezpecny scope,
   - drz se existujicich vzoru,
   - u API men DTO + testy + frontend typy,
   - u UI udrz profesionalni, jednoduche ovladani.
3. QA/test:
   - frontend: `npm run build`, `npm run lint`, `npm run test`, u UI flow `npm run test:e2e`.
   - backend: build/test/format podle `AGENTS.md` backendu, pres Docker SDK pokud neni lokalni .NET.
   - pokud je zmena pres obe repa, over oboje.
4. Review:
   - projdi diff,
   - hledej regresi, security/tenant chyby, spatne role/moduly, chybejici testy,
   - oprav pred commitem.
5. Docs/context:
   - aktualizuj `AGENTS.md`, `CLAUDE.md`, roadmapu a `gastro-user-manual.md`, pokud se zmenil workflow nebo kontrakt.
6. Publish:
   - commit, push, otevri PR,
   - sleduj CI,
   - pri zelenem CI merge,
   - lokalne synchronizuj `main`.

Prvni krok ted:
- Over `git status --short --branch` v obou repo.
- Pokud jsou ciste na `main`, vyber dalsi nejmensi prioritu z vyse uvedeneho seznamu.
- Preferuj QR/table ordering jako dalsi produktovy krok, protoze navazuje na hotove verejne objednavky a posouva gastro V2 bliz ke konkurenci.
- Pokud narazis na nejasny obchodni dopad, zvol konzervativni MVP bez platby a zaznamenej follow-up.
```

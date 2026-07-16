# Konkurenční gap analýza — Vystaveno.cz

**Stav:** rozhodovací podklad `INV-13`  
**Ověřeno:** 2026-07-16  
**Princip:** porovnáváme celé workflow a obchodní dopad, ne počet položek v menu.

## Co trh skutečně komunikuje

- **iDoklad** vede jednoduchostí pro OSVČ: jasné tarify, 60denní zkouška, faktury, nabídky, přijaté doklady, bankovní párování, upomínky, účetní export a mobilní appka. [Aktuální ceník a funkce](https://www.idoklad.cz/cenik)
- **KiloMayo** prodává jeden provozní příběh pro gastro: POS, hosté/loyalty, tým, sklad, objednávky a finance. [Produktová stránka](https://beta.kilomayo.com/)
- **ePML** ukazuje hodnotu dohledatelnosti pro regulovaný sklad: každý příjem, výdej a šarže, pobočkový stav, inventury, kontrolní exporty, auditní data a průkazné výstupy. Tento regulovaný PML režim ale není automaticky požadavek běžného skladu. [Funkce ePML](https://epml.cz/)

## Matice rozhodnutí

| Workflow / očekávání zákazníka | Stav Vystaveno podle repozitáře | Benchmark | Rozhodnutí |
| --- | --- | --- | --- |
| Faktura → proforma → dobropis | ostré, včetně serverové DPH logiky a účetních exportů | iDoklad | **Neimplementovat znovu.** V marketingu vysvětlit tok jednodušeji. |
| Klienti, nabídky, objednávky a zakázky | ostré | iDoklad / KiloMayo | **Neimplementovat znovu.** Umožnit oborově srozumitelný vstup do existujících workflow. |
| Mobilní práce | mobilní web/PWA a konkrétní mobilní skladové/POS toky; nativní appky řeší Standa | iDoklad | **Zlepšovat PWA editor a hlavní mobilní toky.** Neslibovat nativní parity před jejich vydáním. |
| Cashflow a upomínky | cashflow a příprava upomínky existují; automatická sekvence není potvrzená | iDoklad | **Komunikovat pravdivě jako základ.** Automatizaci neprodávat před implementací. |
| Přesný export | faktury, účetní exporty, Z-reporty, ledger, ocenění a nově filtrované příjemky existují; jeden sjednocený výběr ještě není | iDoklad / ePML | **Priorita P0.** Navazovat dataset po datasetu na autoritativní API, s preview a statistikou. |
| Kompletní sklad | ostré: ledger, šarže, FEFO, karanténa, rezervace, nákup, inventury, ocenění, auditní CSV | ePML | **Silná diferencující schopnost.** Pro běžný sklad neoznačovat jako PML compliance; regulovaný režim oddělit až po právním auditu. |
| POS, objednávky, kuchyně, tým a zákazníci | ostré moduly, včetně loyalty, směn a provozního reportingu | KiloMayo | **Silná gastro nabídka.** Ceník a onboarding ji musí popsat jedním výsledkem pro provoz, ne seznamem modulů. |
| Více firem pod jedním účtem | neuzavřená mezera; pobočka už existuje, ale není firma | iDoklad / B2B SaaS očekávání | **Priorita P0.** Po Standově kontraktu přidat oddělený company context switch, bez záměny s pobočkou. |
| Jednoduchý start a zkušební nabídka | registrace/onboarding existují, ale produktový a cenový příběh není sjednocený | iDoklad / KiloMayo | **Priorita P0.** Zkrátit první hodnotový krok, sjednotit CTA, ceník a skutečně aktivní funkce. |
| Referral a partnerský kanál | chybí subscription claim/referral workflow | iDoklad partnerský/účetní model | **Priorita P1.** Stavět s ochranou proti self-referral a odloženou odměnou; nemíchat s POS slevami. |
| AI provozní doporučení | mimo tuto roadmapu, řeší Standa | KiloMayo | **Nedělat v tomto řezu.** |

## Co říká analýza pro ceník

Vystaveno nemá kopírovat tarifní názvy ani jednotlivé limity konkurence. Má mít jednu čitelnou hierarchii:

1. **Základ pro podnikání:** fakturace, klienti, nabídky/objednávky, produkty/služby, PWA, dark mode, základní cashflow a upomínky.
2. **Provozní moduly:** sklad, pokladna, gastro, rezervace, docházka a výroba — jen tehdy, když jsou danému oboru skutečně užitečné.
3. **Růstové nástavby:** CRM, klientská zóna, pokročilé reporty a integrační funkce podle ověřeného stavu.

Každá karta modulu musí vést na odpovídající anchor v ceníku a nejdřív říct výsledek pro podnikání. PWA ani dark mode nejsou placená nástavba.

## Nejbližší implementační pořadí

1. `INV-06`: jeden source of truth pro ceník, billing a modulové odkazy.
2. `INV-05`: zkrácená registrace a IČO flow; Google/Apple OAuth pouze po backendovém kontraktu.
3. `INV-03/04`: sjednocený exportní výběr a statistický preview; pokračovat produkty, klienty, POS doklady a Z-reporty.
4. `INV-02`: multi-company context switch po Standově kontraktu.
5. `INV-07/10/11`: claim, referral a ambasadorský funnel s měřením až po ověření základu.

## Co z analýzy nevzniká

- žádný slib nativní Android/iOS aplikace;
- žádné tvrzení o ostrém AI, BankID, platební bráně nebo regulovaném PML režimu;
- žádné rozšiřování skladu o legislativu konkrétní látky bez samostatného `INV-15` rozhodnutí;
- žádné dva konkurenční ceníky vedle sebe.

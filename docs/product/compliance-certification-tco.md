# Vystaveno.cz — licence, certifikace a tříletý TCO

**Stav:** rozhodovací podklad `INV-15`  
**Ověřeno:** 2026-07-16  
**Důležité:** není to právní stanovisko. Před ostrým spuštěním regulované funkce rozhoduje český právník/DPO a podmínky konkrétního dodavatele.

## Rozhodnutí v jedné větě

Vystaveno nyní nepotřebuje kupovat ISO 27001, kvalifikovaný podpis ani vlastní PCI certifikaci „pro jistotu“. Potřebuje prokazatelný základ GDPR, bezpečného provozu a archivace; specializované povinnosti se zapnou až s konkrétním produktem nebo smluvním požadavkem.

## Povinnostní mapa

| Oblast | Kdy se týká Vystaveno | Kategorie | Nejbližší konkrétní krok | Nákladový model |
| --- | --- | --- | --- | --- |
| GDPR a zpracování dat | vždy: účty, klienti, zaměstnanci, doklady | zákonná povinnost | evidence zpracování, DPA se subprocesory, retention/deletion map, incidentní postup, přístupová a zálohovací opatření | právní/DPO audit + průběžná údržba; nacenit od rozsahu dat a dodavatelů |
| Bezpečnost zpracování | vždy | zákonná povinnost řízená rizikem | pravidelné testování obnovy, patch management, šifrování, řízení přístupů, logování a incidentní cvičení | engineering + externí pentest podle rizika |
| Účetní a daňové doklady | pokud zákazník používá Vystaveno jako účetní/dokladovou evidenci | zákonná povinnost zákazníka; produkt musí podporovat splnění | právně potvrdit datový model dokladu, neměnnost/audit, export a retenční politiku pro konkrétní typy záznamů | účetní/právní review + storage a zálohy |
| Elektronický podpis | pouze když zákazník požaduje ověřený nebo kvalifikovaný účinek | závislé na use case | rozlišit prosté potvrzení, pokročilý podpis a kvalifikovaný podpis; bez QES nic nevydávat za ekvivalent vlastnoručního podpisu | provider smlouva + cena za transakci/evidence; kvalifikovaný režim až po business case |
| Platební karty | až při platebním adapteru | smluvní a bezpečnostní povinnost | hostovaný redirect checkout; žádný PAN/CVV ve Vystaveno; vyžádat od acquirera přesný SAQ/scope | provider fee + případný SAQ/ASV a bezpečnostní provoz |
| Ochranná známka | značka se používá veřejně | strategická ochrana, ne předpoklad provozu | clearance v TMview, rozhodnout ČR vs. EU, podat až po ověření tříd a kolizí | EU online přihláška od 850 EUR za jednu třídu; právní služby samostatně |
| ISO 27001 | enterprise tendr, regulatorní zákazník nebo opakovaný smluvní požadavek | dobrovolná / obchodní | nejprve zavést lehký ISMS a měření; certifikaci kupovat až s doloženým obchodním důvodem | gap audit, implementace, certifikační a dozorové audity — vyžádat nabídky |
| Přístupnost | veřejné/B2C toky nebo smluvní požadavek | posoudit podle trhu a služby | a11y baseline, klávesnice, kontrast, formuláře, mobilní test; právní posouzení použitelnosti na konkrétní službu | interní QA + cílený externí audit |

GDPR vyžaduje odpovídající technická a organizační opatření, schopnost obnovy i pravidelné testování jejich účinnosti; evidence zpracování se vede v elektronické či písemné podobě. [GDPR, články 30 a 32](https://eur-lex.europa.eu/eli/reg/2016/679/art_46/pnt_c/oj)

Český zákon o účetnictví obsahuje samostatnou povinnost úschovy účetních záznamů. Pro produkční retention tabulku se před vydáním ověří úplné aktuální znění a konkrétní kategorie dokladů s účetní/daňovým poradcem; nelze vycházet jen z obecné doby v UI. [§ 31 zákona o účetnictví](https://mf.gov.cz/assets/cs/media/Zak_1991-563_UZ-zakona-c-563-1991-ve-zneni-344-2013.pdf)

## Podpisy: co lze a nelze tvrdit

eIDAS definuje kvalifikovaný elektronický podpis jako pokročilý podpis založený na kvalifikovaném certifikátu a vytvořený kvalifikovaným prostředkem. [Nařízení eIDAS](https://eur-lex.europa.eu/eli/reg/2014/910/oj/eng)

Proto platí tyto produktové texty:

- současná foundation může uvádět „připraveno k napojení ověřeného podpisu“;
- nesmí tvrdit „právně rovnocenné vlastnoručnímu podpisu“, dokud daný tok nepoužívá skutečného kvalifikovaného poskytovatele a neprojde právním posouzením;
- důkazní balíček musí být neměnný: dokumentový hash, identita/kanál, časy, stav, provider reference a auditní historie;
- BankID není synonymum kvalifikovaného podpisu. Konkrétní právní účinek určuje zvolená služba a případ použití.

## Platby a PCI DSS

Pro první Viva adapter je správný hostovaný redirect checkout. PCI SSC uvádí, že SAQ A může být použitelný jen tehdy, pokud všechny prvky platební stránky pocházejí přímo od PCI-validovaného poskytovatele; i redirect z webu obchodníka musí být chráněn proti manipulaci. [PCI SSC FAQ](https://www.pcisecuritystandards.org/faqs/1439/)

Z toho plyne:

- Vystaveno neukládá, nezpracovává ani nepřenáší PAN/CVV;
- žádné vlastní kartové inputy ani JavaScript platební form;
- finální SAQ, případný externí scan a smluvní povinnosti určí acquiring provider pro konkrétní nasazení;
- platební adapter, refund a webhook jsou auditované serverové operace.

## Tříletý TCO: jak počítat bez falešné přesnosti

TCO není jedna cena. Do rozpočtu se každá oblast zapisuje jako:

`jednorázové zavedení + 36 × měsíční provoz + roční audit × 3 + transakční/objemové poplatky + rezerva na incidenty`.

| Položka | Jednorázově | Průběžně | Co vyžádat před schválením |
| --- | --- | --- | --- |
| GDPR/DPA a retention | mapa dat, smlouvy, privacy texty, security gap audit | revize subprocesorů, incidenty, žádosti subjektů údajů | nabídka DPO/právníka a seznam cloud/subprocessorů |
| Bezpečnost | hardening, threat model, obnova, logování | patching, zálohy, monitoring, pentest | nabídka pentestu a cílové RTO/RPO |
| Podpisy | provider integrace a evidence | transakce, evidence, provider support | ceník provideru pro přesný typ podpisu |
| Viva | technický spike, webhook monitoring, pilot | account/terminal/website ID, acquiring, refundy, převody | písemná ISV/partner nabídka pro ČR |
| Ochranná známka | rešerše, přihláška, případně zástupce | obnova po období ochrany | třídy, teritoria a kolizní rešerše |
| ISO 27001 | až po business case: gap a ISMS | dozorové audity a interní provoz | nejméně dvě porovnatelné nabídky certifikačních orgánů |

Známý veřejný orientační náklad: online přihláška ochranné známky EU začíná na 850 EUR za jednu třídu, druhá stojí 50 EUR a každá další 150 EUR; ochrana platí 10 let. [EUIPO fees](https://www.euipo.europa.eu/en/trade-marks/before-applying/fees-payments) U způsobilých SME může aktuální program EUIPO pokrýt část nákladů, ale voucher se řeší před podáním přihlášky. [SME Fund 2026](https://www.euipo.europa.eu/en/sme-corner/sme-fund/2026/vouchers/trademarks-and-designs)

## Prioritní backlog

1. Založit compliance register: účel, vlastník, důkaz, datum revize, riziko a nákladová položka.
2. Nechat zpracovat GDPR/DPA + retention gap audit nad skutečnými daty a subprocesory.
3. Před Viva pilotem uzavřít komerční podmínky a platební incident/reconciliation runbook.
4. Před ostrým podpisem vybrat právní význam use case a až poté provider/úroveň podpisu.
5. Udělat TMview clearance a rozhodnutí ČR/EU; případně nejprve žádat SME Fund.
6. ISO 27001 zařadit až po doloženém požadavku zákazníka nebo tendru, ne jako blokující podmínku pro běžné vydání produktu.

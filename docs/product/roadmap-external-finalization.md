# Co po dokončení kódu skutečně zbývá na týmu

Aktualizováno 19. 7. 2026. Tento seznam obsahuje výhradně kroky, které nelze věrohodně vykonat bez přístupu, smlouvy nebo rozhodnutí vlastníka.

## 1. Ceník a billing

- schválit názvy tarifů, ceny, DPH, trial, storno a refund pravidla;
- vybrat autoritativní billing systém a jeho produkční účet;
- předat neveřejný serverový způsob, jak dostat ověřený event `first subscription payment succeeded`.

Bez tohoto eventu systém pouze bezpečně eviduje nároky. Nesmí připsat měsíc zdarma ani navrhnout výplatu provize podle informace, kterou zadá zákazník sám.

## 2. Viva produkce

- založit/ověřit produkční Viva účet;
- vytvořit produkční payment source, doménu, logo a Smart Checkout credentials;
- nastavit a ve Viva ověřit webhook;
- provést sandboxovou úspěšnou, zrušenou i opakovanou platbu a až potom přepnout produkční režim.

## 3. Právo a obchod

- právník schválí podmínky referral programu, ochranu proti zneužití a pravidla storna;
- právník schválí partnerskou smlouvu, daňové doklady, 30denní zadržení a proces reklamace;
- obchod ručně schválí každého partnera před vydáním aktivního trackingového odkazu.

## 4. Účty třetích stran mimo tento řez

- Google Play a Apple Developer účet zakládá Standa;
- případná mobilní publikace a oprávnění jsou mimo tuto investorskou roadmapu;
- žádný týmový účet ani secret se nepíše do repozitáře nebo do manuálu.

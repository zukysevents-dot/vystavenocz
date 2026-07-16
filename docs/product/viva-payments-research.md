# Viva Payments — rozhodnutí pro Vystaveno.cz

**Stav:** rozhodovací podklad `INV-14`  
**Ověřeno:** 2026-07-16  
**Rozhodnutí:** **go pro obchodní a technický discovery, ne pro ostrý runtime adapter.**

## Doporučený use case

Viva má pro Vystaveno smysl jako volitelný provider, kterého si aktivuje a smluvně založí **sám obchodník**. První případ použití je online úhrada konkrétní faktury nebo objednávky přes hostovaný Smart Checkout. Druhý, samostatný milník, je terminál/SoftPOS pro provozy s pokladnou.

Vystaveno nesmí v první verzi přijímat peníze jménem více obchodníků, držet jejich zůstatky ani provádět rozdělení plateb. To by vyžadovalo Viva Marketplace flow a samostatné právní i obchodní rozhodnutí. Viva tento model podporuje, ale výslovně jej vymezuje pro marketplace/PSD2 scénáře. [Marketplace dokumentace](https://developer.viva.com/marketplaces/)

## Co je ověřeno

| Oblast | Ověřený stav | Dopad pro Vystaveno |
| --- | --- | --- |
| ČR a CZK | Viva má český ceník v CZK; Smart Checkout podporuje CZK. [Ceník](https://www.viva.com/cs-cz/pricing), [měny Smart Checkout](https://developer.viva.com/smart-checkout/smart-checkout-multicurrency/) | Český pilot je reálný. Aktivace konkrétního obchodníka se ale ověřuje až v jeho onboarding procesu. |
| Online platba | Smart Checkout je hostovaná platební stránka: Vystaveno založí objednávku, přesměruje zákazníka a výsledek potvrdí webhookem a/nebo dotazem na transakci. [Integrační postup](https://developer.viva.com/smart-checkout/smart-checkout-integration/) | Preferovaný první adapter; karta se nedotýká Vystaveno. |
| Terminál a SoftPOS | Viva pro ČR uvádí terminály, aplikaci Terminal a Tap on Any Device; konkrétní podpora je závislá na zařízení a zemi. [Osobní platby](https://www.viva.com/cs-cz/product/in-person-payments) | Samostatná POS integrace, ne vedlejší efekt online plateb. |
| API a sandbox | Dokumentace uvádí demo prostředí, OAuth 2.0 a oddělené API pro Smart Checkout, Cloud/Local Terminal a marketplace. [API přehled](https://developer.viva.com/api-docs/), [OAuth](https://developer.viva.com/integration-reference/oauth2-authentication/) | Credentialy patří pouze do existujícího serverového vaultu; nikdy do SPA. |
| Potvrzení a refundace | Viva doporučuje přijmout webhook, ověřit `orderCode`, `statusId` a částku přes Retrieve Transaction; refund vytváří samostatnou reversal událost. [Webhooky](https://developer.viva.com/webhooks-for-payments/), [response kódy](https://developer.viva.com/integration-reference/response-codes/) | Po návratu z platební stránky se faktura nesmí označit jako uhrazená bez serverového ověření. Doručení musí být idempotentní. |
| KYC/onboarding | Viva vyžaduje ověření identity a firmy; standardně sbírá údaje z registrů, ale může vyžádat doplnění a u více vlastníků další podklady. [Onboarding](https://euhelp.viva.com/cs/articles/11098870-zaciname-pruvodce-viva-com-onboardingem-a-aktivaci), [ověřovací podklady](https://euhelp.viva.com/en/articles/9652444-which-documents-are-required-to-verify-my-account) | Aktivace provideru není okamžitý self-serve toggle. V UI musí být stav „čeká na ověření“, ne falešně „aktivní“. |
| PCI DSS | Viva uvádí PCI DSS Level 1; hostovaný checkout redukuje rozsah karetních dat v našem systému. [Security & Technology](https://developer.viva.com/about-viva/security-technology/) | Nevkládat vlastní formulář pro PAN/CVV. Přesný vlastní PCI scope potvrdí security/legal audit. |

## Nákladový model pro pilot

Český ceník je dynamický a uvádí platnost od 21. 5. 2026, proto se před smlouvou znovu ověří. Pro běžné evropské karty uvádí acquiring fee 1,16 % plus interchange a scheme fee; minimum je 0,72 Kč za transakci. Refund nese náklady přijetí platby plus 7,50 Kč. Zero plán má minimální měsíční fakturu 123,50 Kč; další website/terminal ID stojí 50 Kč za měsíc a další uživatel 25 Kč za měsíc. Převod na český bankovní účet je uveden za 15 Kč. [Aktuální český ceník](https://www.viva.com/cs-cz/pricing)

Tyto položky se nepromítají automaticky do ceníku Vystaveno. Před veřejným naceněním je nutné získat písemné obchodní podmínky pro ISV/partner model, objemové slevy, settlement, rezervy, chargebacky a podporu pro český trh.

## Povinná technická hranice prvního adapteru

1. Vystaveno na serveru vytvoří payment order s interním, jednorázovým identifikátorem faktury/objednávky.
2. Zákazník platí výhradně v hostovaném Smart Checkout.
3. Redirect je pouze UX; server čeká na webhook a ověří transakci přes Viva API.
4. Handler deduplikuje podle `transactionId`, kontroluje částku, měnu, obchodníka a vazbu na původní order.
5. Uhrazený doklad se mění jednou; failed webhook platbu nezavírá, protože může následovat úspěšné opakování. [Dokumentace Transaction Failed](https://developer.viva.com/webhooks-for-payments/transaction-failed/)
6. Refund je explicitní serverová akce, auditovaná a svázaná s dokladem; teprve potvrzený reversal aktualizuje stav v aplikaci.

## Co ještě rozhodnout před implementací

- potvrdit s Viva dostupnost a podmínky pro české OSVČ, s.r.o. a cílové obory;
- získat partner/ISV podmínky: onboarding, SLA, incidentní kontakt, chargeback postup, settlement a případné reserve;
- ověřit aktuální podporu jednotlivých metod pro český Smart Checkout a terminál, ne jen globální katalog;
- projít smlouvu a GDPR/DPA v rámci `INV-15`;
- určit, zda první pilot bude pouze „zaplatit fakturu“ nebo také veřejná objednávka; POS/SoftPOS nechat samostatně;
- před ostrým spuštěním v demo i produkci projít úspěšnou platbu, zamítnutí, návrat, refund, duplicitní webhook a výpadek callbacku.

## Go/no-go brána

**Pokračovat do technického spike:** ano — Smart Checkout je dokumentovaný, má demo, OAuth a webhookový potvrzovací model.

**Zpřístupnit zákazníkům ostré platby:** ne, dokud nejsou splněny všechny body níže:

- schválené obchodní a právní podmínky pro český model;
- reálně ověřený onboarding obchodníka;
- bezpečné serverové ukládání credentialů přes stávající vault;
- úspěšně ověřené platební scénáře včetně refundu a duplicitního webhooku;
- provozní monitoring, audit, podpora a incidentní postup.

Apple Pay a Google Pay jsou zde platební metody; nesouvisejí s přihlášením Google/Apple uvedeným v `INV-05`.

# Viva Payments — rozhodnutí Go / No-Go (INV-14)

Aktualizováno: 18. 7. 2026. Tento dokument je podklad pro produktové rozhodnutí, nikoli právní ani cenová garance.

## Co jsme ověřili

- Viva nabízí hostovanou platební stránku Smart Checkout: backend nejdřív vytvoří payment order, zákazník se přesměruje na Viva a po návratu se výsledek ověří webhookem nebo serverovým dotazem na transakci.
- Pro asynchronní platby Viva doporučuje webhook; odpověď `2xx` potvrzuje přijetí notifikace. Stav transakce se má nezávisle ověřit přes backendové API s OAuth2.
- Veřejný český ceník uvádí pro online platby domácími spotřebitelskými kartami 2,19 % + 10 Kč za transakci. Vedle transakčních poplatků uvádí měsíční e-commerce plány; ceny se podle stránky aktualizují měsíčně.

## Přínos pro Vystaveno

- Hostovaný checkout omezuje rozsah zpracování karetních údajů ve Vystavenu.
- Zapadá do existujícího provider-neutral základu: faktura má platební session, backendový webhook a stav platby jako zdroj pravdy.
- Pro zákazníka jde o známý tok „otevřít odkaz → zaplatit → vrátit se“, bez nové mobilní aplikace.

## Rizika a hranice

- Ceník není stabilní specifikace produktu: před obchodním rozhodnutím musí majitel potvrdit aktuální nabídku, zvolený účetní/plánový model a náklady pro cílové objemy.
- Redirect nikdy není důkaz úhrady. Úhrada se smí označit až po ověřeném webhooku a serverovém ověření transakce.
- Ostré nasazení vyžaduje Viva účet, sandbox, OAuth credentialy, callback URL, webhook secret/ověření, refund proces, monitoring opakovaných notifikací a test neúspěšné platby.
- Neřešíme nyní platbu předplatného ani online úhradu faktur; bez rozhodnutého ceníku/billingu by to bylo předčasné.

## Rozhodnutí a aktuální stav

**GO pro sandboxový Smart Checkout faktur; NO-GO pro produkční aktivaci bez účtu a ověření.**

Vystaveno má hotový integrační řez: tlačítko v klientském portálu vytvoří objednávku Viva, zákazníka přesměruje na hostovaný Smart Checkout a server platbu zaúčtuje jen po nezávislém OAuth ověření transakce u Viva. Návrat zákazníka do portálu se za potvrzení nepovažuje.

Bez sandboxových či produkčních údajů Viva se checkout bezpečně nezapne; místo toho zobrazí, že online platba není aktivní. Před produkcí je nutné projít checklist v technickém kontraktu a potvrdit aktuální ceník. Tato integrace řeší úhradu faktur zákazníkem, nikoli předplatné Vystavena ani jeho interní billing.

## Zdroje

- [Viva Smart Checkout — integrační tok](https://developer.viva.com/smart-checkout/smart-checkout-integration/)
- [Viva webhooks pro platby](https://developer.viva.com/webhooks-for-payments/)
- [Viva český ceník](https://www.viva.com/cs-cz/pricing)

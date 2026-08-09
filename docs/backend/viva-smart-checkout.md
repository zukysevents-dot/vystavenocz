# Viva Smart Checkout pro úhradu faktur

Aktualizováno: 18. 7. 2026. Tento kontrakt řeší pouze úhradu vystavené faktury z veřejného klientského portálu. Není to billing ani platba předplatného Vystavena.

## Tok a hranice důvěry

1. Veřejný portál zavolá `POST /api/v1/public/client/{token}/invoices/{invoiceId}/checkout`.
2. Backend ověří token, vlastnictví faktury, její stav a zbývající dluh.
3. Aktivní adapter Viva získá OAuth2 token, založí Viva payment order a vrátí URL hostovaného checkoutu.
4. Frontend zákazníka přesměruje přes `window.location.assign`; neotevírá iframe.
5. Viva pošle `POST /api/v1/webhooks/payments`. Backend z payloadu použije jen `EventData.TransactionId`, přes OAuth2 načte transakci z Viva a ověří `statusId = F`, částku, měnu, `sourceCode` a interní `merchantTrns` vazbu na firmu a fakturu.
6. Až potom vznikne idempotentní úhrada a faktura se případně označí jako zaplacená. Klíč je `viva:{transactionId}`.

Návrat zákazníka z checkoutu není důkaz platby. Pokud nejsou Viva údaje vyplněné, checkout končí `503`; tím se online platba nemůže tvářit jako funkční.

Portál navíc nabízí `GET /api/v1/public/client/{token}/invoices/{invoiceId}/pdf`. Endpoint znovu ověří token a vazbu faktury na klienta; cizí, konceptní nebo neveřejná faktura vrací stejnou `404`. Vrátil-li se již jednou vystavený dokument, používá se uložené neměnné PDF.

## Konfigurace prostředí

Výchozí provider je `viva` (`Payments:Provider=viva`). Žádný secret se neukládá do repozitáře:

```text
Viva__Demo=true
Viva__ClientId=<Smart Checkout Client ID>
Viva__ClientSecret=<Smart Checkout Client Secret>
Viva__SourceCode=<4místný payment source>
Payments__PortalBaseUrl=https://app.example.cz
```

`Demo=true` používá demo účty a `demo-api.vivapayments.com`; pro produkci se přepne na `false` až po úspěšném sandboxovém průchodu. Starší `stripe` adapter lze zvolit výhradně explicitně pomocí `Payments:Provider=stripe`.

## Checklist před produkcí

- založit produkční Viva účet a Smart Checkout credentials;
- vytvořit payment source pro produkční doménu, logo a návratovou stránku;
- v Viva nastavit a ověřit webhook URL `https://<api>/api/v1/webhooks/payments` pro **Transaction Payment Created**;
- provést sandbox test úspěšné, zrušené a opakovaně doručené notifikace;
- ověřit, že faktura cizího klienta a neplatný token vracejí 404;
- ověřit, že návrat bez webhooku fakturu neoznačí jako zaplacenou;
- nastavit monitoring 503 a neověřených notifikací, dohodnout refund proces a znovu potvrdit aktuální ceník.

## Frontend kontrakt

`PortalInvoice` obsahuje `id`. Funkce `useClientPortal().checkout(token, invoiceId)` vrátí `{ redirectUrl }`; UI ji smí nabídnout jen stavům `issued`, `sent`, `overdue`. Chyba se zákazníkovi zobrazí srozumitelně bez názvů credentialů či HTTP stavů.

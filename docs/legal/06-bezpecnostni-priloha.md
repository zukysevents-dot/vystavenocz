# Bezpečnostní příloha (veřejně sdílitelná) — NÁVRH

> Popisuje **pouze skutečně implementovaná** opatření (ověřeno v kódu k 20. 7. 2026).
> Vystaveno **nemá** ISO 27001, SOC 2 ani PCI DSS certifikaci, neprošlo externím penetračním
> testem a nepoužívá end-to-end šifrování — nic takového netvrdíme.

## Přenos a přístup

- Veškerá komunikace přes **HTTPS/TLS** (automatická správa certifikátů Let's Encrypt); mobilní
  aplikace v release buildu vynucuje HTTPS API adresu.
- Přihlášení e-mail+heslo (hesla ukládána výhradně jako moderní hash, nikdy v čitelné podobě) nebo
  **Google/Apple OAuth** se server-side ověřením, `state`/PKCE ochranou a allowlistem návratových
  adres proti podvrženému přesměrování.
- Krátkodobý přístupový token (60 min) + refresh token (14 dní) s revokací; v mobilních aplikacích
  jsou tokeny v systémovém zabezpečeném úložišti (**Android Keystore / iOS Keychain**).

## Oddělení dat a oprávnění

- **Tenant izolace:** každý databázový dotaz je automaticky filtrován na firmu přihlášeného
  uživatele (globální filtr na úrovni datové vrstvy); kontroluje ji sada integračních testů.
- **Role a moduly:** oprávnění po rolích (Owner/Admin/Manager/Employee/Accountant), gating podle
  zapnutých modulů a volitelné omezení člena na pobočku; každý endpoint má autorizační politiku
  (hlídáno konvenčním testem).
- Citlivé hodnoty (mzdové sazby) se nevydávají rolím bez oprávnění.

## Klíče, integrace a platby

- Přihlašovací údaje k integracím (platební brány, podpisové služby) se ukládají výhradně do
  šifrovaného trezoru (**AES-256-GCM** s vazbou na firmu a konfiguraci); hodnoty se nikdy nevrací
  zpět přes API a bez serverového šifrovacího klíče systém ukládání bezpečně odmítne.
- API tokeny a webhook secrety se zobrazují **jen jednou** při vytvoření; ukládá se pouze otisk.
  Webhooky jsou podepisované (HMAC-SHA256) a odchozí volání chrání SSRF guard (zákaz interních
  adres, bez přesměrování). Veřejné API má rate limit na token.
- **Platební karty nikdy neprocházejí systémem Vystaveno** — platby zpracovává Stripe; POS eviduje
  platbu přijatou na vlastním terminálu obsluhy.
- Kritické peněžní operace (prodej, platba účtu) používají idempotenční klíče proti dvojímu účtování.

## Auditovatelnost a provoz

- **Auditní log** klíčových akcí (storna, slevy, uzávěrky, změny cen, integrace, smazání) —
  append-only, dostupný rolím Owner/Admin v aplikaci.
- **Zálohy:** pravidelné konzistentní zálohy databáze i souborů, atomická publikace balíku,
  **týdenní automatické ověření obnovitelnosti** v izolovaném prostředí, monitoring stáří záloh a
  místa na disku. *(Off-site kopie: v přípravě — do jejího zřízení netvrdit.)* `[AKTUALIZOVAT PO F19]`
- Oddělení prostředí, tajemství výhradně v serverové konfiguraci (nikdy v repozitáři), deployment
  se zámkem proti souběhu se zálohou.
- Chybová hlášení webu (je-li zapnuto Sentry) neobsahují těla API odpovědí — před odesláním se
  odstraňují. `[POTVRDIT F2]`

## Hlášení zranitelností a incidenty

- Bezpečnostní kontakt: `[DOPLNIT — návrh security@vystaveno.cz, otázka F6]`. Hlášení v dobré víře
  vítáme a nepostihujeme.
- Postup při incidentu: zjištění → zastavení → posouzení dopadu → oznámení dotčeným firmám bez
  zbytečného odkladu a splnění povinností dle čl. 33/34 GDPR `[FORMALIZOVAT — otázka F6, mezera G-12]`.
- Aktualizace závislostí: průběžně v rámci vývoje; bez formálního SLA. Neslibujeme lhůty oprav.

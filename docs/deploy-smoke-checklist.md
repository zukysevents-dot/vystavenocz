# VPS deploy + smoke checklist

Tento checklist je rychlá brána pro ruční deploy na VPS. Produkce je pull-based: merge do `main` nic nenasadí samo.

## 1. Před deployem

1. Zkontroluj, že frontend `main` a backend `main` obsahují poslední mergnuté PR.
2. Ověř, že GitHub CI posledních PR je zelené.
3. Před deployem udělej nebo ověř aktuální zálohu PostgreSQL. Migrace jsou forward-only.
4. Na VPS musí být repozitáře vedle sebe:
   - `~/vystavenocz`
   - `~/vystaveno-api`
5. V `~/vystavenocz/.env` musí být nastavené:
   - `DOMAIN`
   - `ACME_EMAIL`
   - `DB_PASSWORD`
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `INTEGRATIONS_SECRET_ENCRYPTION_KEY` (`openssl rand -base64 32`)
   - `PAYMENTS_PORTAL_BASE_URL` (veřejná URL aplikace, typicky `https://$DOMAIN`)
6. Pokud se mají používat online platby faktur přes Stripe webhook, musí být v API prostředí doplněné i `Stripe__WebhookSecret`. Gastro POS deploy bez něj běží, ale webhook platby faktur nebude spolehlivě uzavírat.
7. Credential vault pro platební providery bez `INTEGRATIONS_SECRET_ENCRYPTION_KEY` bezpečně vrací 503 při ukládání secretů; to je chyba konfigurace deploye, ne UI.
8. Credential trezor pro **ověřené podpisy** (modul `verified_signing`) používá stejný serverový šifrovací klíč jako platební vault: `INTEGRATIONS_SECRET_ENCRYPTION_KEY` v `~/vystavenocz/.env` → `Integrations__SecretEncryptionKey` v API. Bez něj ukládání secretů podpisů bezpečně vrací 503 (opět chyba deploye, ne UI).

## 2. Deploy příkazy na VPS

```bash
cd ~/vystavenocz && git pull
cd ~/vystaveno-api && git pull
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
cd ~/vystavenocz && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
```

Migrace databáze běží automaticky při startu API. Pokud API nenaběhne, jako první čti log:

```bash
cd ~/vystavenocz
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
```

## 3. Technická kontrola

```bash
curl https://$DOMAIN/health/live
curl https://$DOMAIN/health/ready
curl https://$DOMAIN/api/v1/ping
```

Očekávání:

- `live` vrací HTTP 200.
- `ready` vrací HTTP 200 a stav `Healthy`.
- `ping` vrací JSON se stavem `ok`.
- `https://$DOMAIN/` otevře aktuální veřejnou landing page.
- `https://$DOMAIN/app` otevře aplikaci přes HTTPS.
- Browser nehlásí mixed content ani CORS chyby.

## 4. Volitelně: demo data pro staging

Na čistém stagingu můžeš naplnit realistickou demo firmu přímo z backendu. Seeder běží jen explicitním CLI příkazem, je idempotentní a nemaže cizí data; na produkčním prostředí se bez jednorázového `Seed__AllowDemo=true` odmítne spustit.

```bash
cd ~/vystavenocz
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec \
  -e Seed__AllowDemo=true api dotnet Vystaveno.Api.dll seed-demo
```

Očekávání:

- Vznikne nebo se přeskočí demo firma `Vystaveno Demo Gastro`.
- Demo obsahuje 3 pobočky, gastro katalog, stoly, účty, kuchyň, sklad, inventuru, věrnost, akce/ceny, integrace a podpisy v mock/draft stavu.
- Přihlášení pro interní smoke test: `demo@vystaveno.cz` / `DemoGastro.2026`.
- Nespouštěj to na reálné produkční databázi se zákaznickými daty; je to staging/demo helper, ne produktová funkce pro zákazníky.

## 5. Smoke test v aplikaci (VPS staging readiness)

Proveď na testovací firmě / testovacím účtu. Pořadí odpovídá tomu, jak si zákazník produkt projde. Každý krok má jasné „očekávání" — když nesedí, poznamenej do reportu z deploye.

1. **Přihlášení** — přihlas se a načti `/app`. Na stagingu po demo seedu použij `demo@vystaveno.cz` / `DemoGastro.2026`. Očekávání: dashboard naběhne, konzole bez chyb, žádné mixed content / CORS.
2. **Moduly** — v `Nastavení firmy` ověř zapnuté moduly. Očekávání: nav vlevo ukazuje jen položky zapnutých modulů (Gastro: Pokladna, Restaurace, Kuchyně, Zásoby, Naskladnění, Uzávěrka; add-ony podle plánu — Integrace, Podpisy).
3. **Pokladna prodej** — prodej 1 položku kartou (potvrď `Platba prošla`). Očekávání: vznikne prodej + DPH rozpad, objeví se v tržbách, u produktu s recepturou se odečtou suroviny.
4. **Restaurace účet/stůl** — otevři účet na stole, přidej položku, odešli bon do kuchyně, zaplať účet. Očekávání: účet se otevře, bon odejde, po platbě zůstane jen nezaplacený zbytek (nebo se stůl uvolní).
5. **Kuchyně** — ověř, že bon jde posunout `Odesláno → Připravuje se → Hotovo → Vydáno`. Očekávání: stavy se mění, historie vydaných bonů je read-only.
6. **Uzávěrka** — otevři dnešní den, zkontroluj tržby/DPH/hotovost/karty. Očekávání: tržby nejsou nulové po testovacím prodeji. **Nezavírej produkční den**, pokud jde o ostrý provoz. Otevřený gastro účet zavření dne zablokuje (409) — to je správně.
7. **Sklad / inventura / zrcadlo** — v `Zásoby`:
   - otevři tab `Zrcadlo`, ověř slovník `Stav má být`, `Realita`, `Rozdíl` a v detailu řádku výpočet,
   - spusť malou `Inventuru` na konkrétní pobočku (ne `Všechny pobočky`): zadej napočítanou realitu, ulož a ověř, že se rozdíl promítne do zrcadla. Očekávání: `Rozdíl` = realita minus systém, v kusech i Kč.
8. **Pohoda XML export** — v `Nastavení firmy` → `Integrace a exporty` → účetní export vyber cíl `Pohoda XML`, typ `Z-reporty`, datum od/do a stáhni soubor. Očekávání: stáhne se XML k ručnímu importu. Pokud hlásí chybějící IČO, doplň IČO firmy v nastavení. (Generic CSV ověř analogicky.)
9. **Tiskový agent — nastavení** — v `Integrace a exporty` → `Tiskoví agenti` klikni `Přidat`, pojmenuj agenta, ulož. Očekávání: token se zobrazí **jen jednou**; `Revoke` token okamžitě zneplatní. Bez lokálního agenta tisk běží stávající cestou (funkce nesmí spadnout).
10. **Platební provider settings + vault** — v `Integrace a exporty` → `Platební provideri`:
    - otevři katalog (ČSOB / NFCTRON / Comgate / SumUp / GP webpay) — ověř stavy `Aktivní` / `Připraveno k napojení`,
    - u providera `Nastavit` → založ konfiguraci → v `Zabezpečeném trezoru credentialů` vlož testovací klíč a ulož. Očekávání: input se **vyčistí**, pole přejde na `Uloženo`, hodnota se nikdy nezobrazí zpět. 503 = doplň `INTEGRATIONS_SECRET_ENCRYPTION_KEY` na VPS (chyba deploye, ne UI). Uložení klíče **nespouští žádnou platbu**.
11. **Podpisy — provider settings + vault + odeslání** (modul `verified_signing`) — otevři `Podpisy`:
    - tab `Provider podpisů`: katalog ukazuje `Testovací poskytovatel` = `Aktivní` a `BankID` = `Připraveno k napojení`. Založ konfiguraci `BankID`, otevři ji a v trezoru ulož testovací klíč (input se vyčistí, pole `Uloženo`; 503 = chybí `INTEGRATIONS_SECRET_ENCRYPTION_KEY` / `Integrations__SecretEncryptionKey` — chyba deploye). Konfiguraci `Testovací poskytovatel` lze bez credentialů nastavit rovnou na `Připraveno`,
    - tab `Obálky`: založ novou obálku, otevři detail a dej `Odeslat k podpisu` (základní odeslání). Očekávání: stav přejde na `Odesláno`. Jde o **přípravné odeslání a evidenci, ne ostrý právní podpis**.
    - Pokud existuje `BankID` konfigurace ve stavu `Připraveno`, detail obálky nabídne výběr konfigurace poskytovatele; odeslání přes ni **poctivě** vrátí hlášku „BankID konfigurace je připravená, ale ostrý adapter ještě není zapnutý." — to je očekávané chování, ne chyba. Pokud konfigurace není připravená / chybí credentialy (422), hláška nasměruje do tabu `Provider podpisů`.
12. **Veřejné / QR menu** (pokud je slug a menu dostupné) — v `Nastavení firmy` ověř veřejný slug, pak otevři `/objednavka/<slug>` (anonymně, bez přihlášení). Očekávání: menu se načte, u položek se ukážou alergeny, host přidá do košíku a projde k odeslání; ceny počítá server. QR ke stolu (`?table=<id>&name=<název>`) skryje výdej/rozvoz a připíše se do účtu stolu.
13. **Audit** — v `Audit` ověř, že citlivé akce (storno, sleva, uzávěrka, změna ceny) vznikají v logu s časem, aktérem a entitou.

## 6. Aktuální hranice funkcí (co je ostré vs. připravené)

- **Ostré / hotové na VPS:** login a moduly, gastro POS prodej, restaurace/stoly/kuchyně, uzávěrka + Z-report, sklad/inventura/zrcadlo/naskladnění, akce a ceny, věrnost, audit, veřejné/QR objednávky, účetní export Generic CSV a Pohoda XML (soubor pro ruční import, ne živá synchronizace), tiskoví agenti (registrace/token/revoke), credential trezor plateb i podpisů (uložit/rotovat/smazat/revokovat klíče).
- **Interní staging helper:** backend CLI `seed-demo` naplní demo firmu pro smoke test a obchodní průchod produktem. Není to zákaznická funkce a nespouští se při běžném startu aplikace.
- **Připraveno k napojení (čeká na runtime adaptér + vendor smlouvu/credentials):**
  - Platební brány ČSOB / NFCTRON / Comgate / SumUp / GP webpay — katalog a konfigurace hotové, ostré stržení přes ně čeká na runtime adaptér. Katalog žádnou platbu nespouští, obsluha dál potvrzuje výsledek karty ručně.
  - **Ověřené podpisy / BankID** — obálky, evidence, provider katalog, konfigurace a credential trezor jsou hotové. Odeslání přes provider connection posílá volitelné `providerConnectionId`; mock/testovací poskytovatel a základní odeslání fungují jako **přípravné odeslání a evidence**, ne ostrý právní podpis. BankID vrací poctivě 422 „ostrý adapter čeká na zapnutí", dokud nejsou BankID credentials + runtime adaptér + potvrzený právní wording. Do UI ani obchodních textů netvrď právní účinek podpisu ani „živé BankID je hotové".
- Secret/credential vault (platby #225, podpisy) šifruje AES-GCM server-side; raw klíče se píšou jen do vault endpointů, nikdy do běžných UI polí ani poznámek. Uložení klíče žádnou ostrou platbu ani ostrý podpis NESPOUŠTÍ — to čeká na runtime adaptér.
- Money / SuperFaktura nejsou přímé adaptéry — používej Generic CSV nebo Pohoda XML.

## 7. Když deploy selže

1. `docker compose ... ps`
2. `docker compose ... logs -f api`
3. `docker compose ... logs -f web`
4. `docker compose ... logs -f caddy`
5. Ověř `.env`, hlavně `DB_PASSWORD`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `INTEGRATIONS_SECRET_ENCRYPTION_KEY`, `PAYMENTS_PORTAL_BASE_URL`, `DOMAIN` a `ACME_EMAIL`.
6. Ověř DNS domény na IP VPS a otevřené porty 80/443.
7. Pokud selže migrace, nevracej DB ručně. Nejdřív zazálohuj databázi a řeš konkrétní chybu migrace.

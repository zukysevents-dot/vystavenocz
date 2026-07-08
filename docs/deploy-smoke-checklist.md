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
6. Pokud se mají používat online platby faktur přes Stripe webhook, musí být v API prostředí doplněné i `Stripe__WebhookSecret`. Gastro POS deploy bez něj běží, ale webhook platby faktur nebude spolehlivě uzavírat.
7. Credential vault pro platební providery bez `INTEGRATIONS_SECRET_ENCRYPTION_KEY` bezpečně vrací 503 při ukládání secretů; to je chyba konfigurace deploye, ne UI.

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
curl https://vystaveno.cz/health/live
curl https://vystaveno.cz/health/ready
curl https://vystaveno.cz/api/v1/ping
```

Očekávání:

- `live` vrací HTTP 200.
- `ready` vrací HTTP 200 a stav `Healthy`.
- `ping` vrací JSON se stavem `ok`.
- `https://vystaveno.cz/app` otevře aplikaci přes HTTPS.
- Browser nehlásí mixed content ani CORS chyby.

## 4. Smoke test v aplikaci

Proveď na testovací firmě / testovacím účtu:

1. Přihlášení a načtení `/app`.
2. `Nastavení firmy`:
   - ověř moduly,
   - ověř `Integrace a exporty`,
   - u účetních exportů stáhni Generic CSV nebo Pohoda XML,
   - u `Platební provideri` otevři katalog a konfiguraci providera.
3. `Pokladna`:
   - prodej 1 položku kartou,
   - ověř, že se prodej objeví v tržbách.
4. `Restaurace`:
   - otevři účet na stole,
   - přidej položku,
   - odešli bon do kuchyně,
   - zaplať účet.
5. `Kuchyně`:
   - ověř, že bon jde posunout přes stavy.
6. `Uzávěrka`:
   - otevři dnešní den,
   - ověř, že tržby nejsou nulové po testovacím prodeji,
   - nezavírej produkční den, pokud jde o ostrý provoz.
7. `Zásoby`:
   - otevři zrcadlo,
   - ověř slovník `Stav má být`, `Realita`, `Rozdíl`.
8. `Akce a ceny`:
   - ověř načtení cenových hladin a promo pravidel.
9. `Audit`:
   - ověř, že citlivé akce vznikají v audit logu.

## 5. Aktuální hranice funkcí

- Platební provider katalog a konfigurace jsou hotové.
- Skutečné ostré stržení přes ČSOB/NFCTRON/Comgate/SumUp/GP webpay vyžaduje další runtime adaptér a vendor sandbox/credentials.
- Secret/credential store je hotový backend milestone; raw klíče se píšou jen do vault endpointů a nikdy do běžných UI polí ani poznámek.
- BankID podpis je samostatný plánovaný modul, ne blokace gastro/VPS deploye.

## 6. Když deploy selže

1. `docker compose ... ps`
2. `docker compose ... logs -f api`
3. `docker compose ... logs -f web`
4. `docker compose ... logs -f caddy`
5. Ověř `.env`, hlavně `DB_PASSWORD`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `INTEGRATIONS_SECRET_ENCRYPTION_KEY`, `DOMAIN`.
6. Ověř DNS domény na IP VPS a otevřené porty 80/443.
7. Pokud selže migrace, nevracej DB ručně. Nejdřív zazálohuj databázi a řeš konkrétní chybu migrace.

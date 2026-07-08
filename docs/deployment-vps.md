# Nasazení na VPS (Docker + HTTPS)

Celý stack na jednom VPS: **Caddy** (TLS edge, automatické Let's Encrypt) → **nginx** (SPA + reverse-proxy
`/api`) → **.NET API** → **PostgreSQL**. Same-origin (`VITE_API_URL=/api/v1`) → žádné CORS.

Konfigurace: [`docker-compose.yml`](../docker-compose.yml) (základ) + [`docker-compose.prod.yml`](../docker-compose.prod.yml)
(prod override: Caddy + restart politiky) + [`Caddyfile`](../Caddyfile).

## Předpoklady

- VPS s Linuxem (Ubuntu/Debian), veřejná IP, porty **80 a 443** otevřené.
- **DNS A záznam** domény (např. `fakturace.example.com`) → IP VPS. ACME (Let's Encrypt) bez správného
  DNS neproběhne.
- Docker Engine + **Docker Compose ≥ 2.24.4** (kvůli `!reset` v override).

## 1. Příprava VPS

```bash
# Docker (oficiální convenience skript)
curl -fsSL https://get.docker.com | sh
docker compose version   # ověř >= 2.24.4
```

## 2. Repozitáře (vedle sebe)

API se builduje z **sousedního** repozitáře — oba musí ležet ve stejném rodičovském adresáři:

```bash
git clone https://github.com/zukyys-events/vystaveno-api.git
git clone https://github.com/zukysevents-dot/vystavenocz.git
cd vystavenocz
```

## 3. Secrety a doména (`.env`)

V adresáři `vystavenocz` vytvoř `.env` (je v `.gitignore` — necommitovat):

```dotenv
DOMAIN=fakturace.example.com
ACME_EMAIL=ty@example.com          # kontakt pro Let's Encrypt
JWT_SECRET=<min. 32 znaků>         # vygeneruj: openssl rand -base64 32
DB_PASSWORD=<silné heslo DB>
STRIPE_SECRET_KEY=<produkční Stripe secret>
INTEGRATIONS_SECRET_ENCRYPTION_KEY=<32B base64> # vygeneruj: openssl rand -base64 32
```

`JWT_SECRET`, `DB_PASSWORD`, `STRIPE_SECRET_KEY` a `INTEGRATIONS_SECRET_ENCRYPTION_KEY` jsou **server-only secrety** — nikdy do gitu ani do frontend buildu.
`INTEGRATIONS_SECRET_ENCRYPTION_KEY` šifruje credential vault pro platební providery; bez něj backend bezpečně odmítne ukládání credentialů (`503`).

## 4. Spuštění

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Co se stane: build SPA (s `VITE_API_URL=/api/v1`) + API image → start DB → migrace DB **automaticky při
startu API** (advisory lock) → nginx + Caddy. Caddy si po prvním requestu vyžádá TLS certifikát.

## 5. Ověření

```bash
curl https://$DOMAIN/health/live     # 200 = proces běží
curl https://$DOMAIN/health/ready    # 200 = DB připojena (503 = DB problém)
```

Smoke přes prohlížeč: otevři `https://$DOMAIN`, zaregistruj se, založ/uprav firmu (onboarding), vytvoř klienta.
HTTP automaticky přesměruje na HTTPS (Caddy, 308).

Podrobný smoke checklist pro aktuální modulovou aplikaci je v [`docs/deploy-smoke-checklist.md`](deploy-smoke-checklist.md).

## 6. Aktualizace (nový deploy)

```bash
cd vystavenocz && git pull
cd ../vystaveno-api && git pull
cd ../vystavenocz
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Migrace se dorovnají při startu. Rollback: `git checkout <předchozí commit>` v obou repech + znovu `up -d --build`
(migrace jsou forward-only — viz `vystaveno-api/docs/deployment.md`).

## 7. Provoz

- **Logy:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api` (nebo `web`/`caddy`/`db`).
- **Restart po rebootu:** služby mají `restart: unless-stopped` → naběhnou samy.
- **Zálohy DB** (volume `pgdata`) — nastav cron `pg_dump`, postup viz `vystaveno-api/docs/deployment.md` (sekce Zálohy a obnova). **Záloha bez ověřené obnovy není záloha.**
- **TLS certy** přežijí restart ve volume `caddy_data`.

## Časté problémy

| Příznak                                 | Příčina                                                                | Řešení                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Caddy nezíská cert (TLS chyba)          | DNS nemíří na VPS / port 80 zavřený                                    | Zkontroluj A záznam a firewall (80+443); `docker compose ... logs caddy` |
| `/health/ready` → 503                   | DB nedostupná / špatné `DB_PASSWORD`                                   | Zkontroluj `.env` a `logs db`                                            |
| API spadne hned po startu               | chybí `JWT_SECRET`, `DB_PASSWORD` nebo `STRIPE_SECRET_KEY` (fail-fast) | Doplň `.env`, `up -d`                                                    |
| Uložení credentialů providera vrací 503 | chybí/neplatný `INTEGRATIONS_SECRET_ENCRYPTION_KEY`                    | Vygeneruj 32B base64 klíč, doplň `.env`, redeploy API                    |
| `!reset` v compose hlásí chybu          | stará Compose verze                                                    | Upgrade Docker Compose na ≥ 2.24.4                                       |
| `web` build bere špatnou API URL        | cache                                                                  | `up -d --build --force-recreate` (build arg `VITE_API_URL=/api/v1`)      |

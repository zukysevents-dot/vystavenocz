# Produkční spolehlivost V1

Závazný runbook pro automatické zálohy, ověřování obnovy, monitoring a bezpečný deploy single-VPS instalace Vystaveno.
Zdroj pravdy jsou verzované skripty v `ops/`.

## Bezpečnostní model

- Lokální cesta záloh je pevná: `~/backups/vystaveno/automatic`. Nelze ji přesměrovat proměnnou na nebezpečné místo.
- `.ops.env` musí být běžný soubor vlastněný provozním uživatelem s modem `0600`. Načítá se striktním allowlist parserem
  `KEY=VALUE`; nikdy se nespouští jako shell.
- Backup, restore-check a deploy sdílejí jeden kernelový `flock`. Předaný zámek se ověřuje podle otevřeného file descriptoru,
  takže ho nejde obejít pouhou proměnnou prostředí. Health během plánované údržby korektně přeskočí jeden běh.
- Pomocné Alpine a PostgreSQL obrazy jsou připnuté na schválené SHA-256 digesty. Restore-check nemá síť, capabilities ani
  zapisovatelný root filesystem a používá jen dočasné filesystémy.
- Produkční restore není automatizovaný jedním příkazem: je záměrně dvoufázový a vyžaduje explicitní rozhodnutí o ztrátě dat.

## Obsah a konzistence zálohy

Dokončený timestamp balík obsahuje `database.dump`, `api-files.tar.gz`, `manifest.env` a `SHA256SUMS`. API se při snapshotu
zastaví, takže PostgreSQL a přílohy mají společnou konzistenční hranici. Skript si před zastavením zapamatuje původní stav API;
při zachytitelné chybě API vrátí do původního stavu a `.partial-*` balík odstraní. Před stopem zapíše maintenance marker: po
`SIGKILL` nebo pádu shellu jej příští health běh rozpozná a API bezpečně nastartuje. `latest` se přepne atomicky až po kontrole
dumpu, archivu a checksumů.

Před začátkem se kontroluje místo na backup filesystemu. Rezerva je minimálně 1 GiB nebo dvojnásobek posledního payloadu.
Retence maže jen validní timestamp balíky uvnitř pevného rootu, nikdy `latest`, a vždy zachová nejméně dvě dokončené zálohy.

## Instalace na VPS

```bash
cd ~/vystavenocz
chmod +x ops/*.sh ops/lib/*.sh ops/tests/*.sh
./ops/vps-backup.sh
./ops/vps-verify-backup.sh
./ops/install-vps-reliability.sh
```

Instalátor atomicky vytvoří `.ops.env`, stáhne připnuté obrazy a idempotentně nastaví cron v `CRON_TZ=UTC`:

- health každých 5 minut;
- konzistentní backup denně v 02:30;
- plný restore-check každou neděli v 04:15.

Výchozí RPO je 24 hodin. Backup starší než 30 hodin nebo méně než 10 % volného místa na projektovém či backup filesystemu
je chyba. Logy a záznamy deployů jsou v `~/backups/vystaveno/logs`.

## Bezpečný deploy

```bash
cd ~/vystavenocz
./ops/vps-deploy.sh
```

Wrapper odmítne trackované lokální změny, pod společným zámkem vytvoří snapshot, **skutečně jej obnoví v izolovaném
PostgreSQL**, stáhne jen fast-forward `main` a sestaví stack. IPv6 vrátí na původní hodnotu. Výsledek zapisuje s původními i
novými commity a image ID. Při chybě nemaže data ani neprovádí slepý rollback migrací.

## Ověření obnovy

```bash
./ops/vps-verify-backup.sh
./ops/vps-verify-backup.sh ~/backups/vystaveno/automatic/20260711T120000Z
```

`latest` se jednou přeloží na neměnný timestamp adresář. Kontrolují se všechny SHA-256, archiv příloh a kompletní `pg_restore`
do jednorázové DB zakončený kontrolním dotazem. Kontejner má 1,5 GiB memory limit a 1 GiB datový tmpfs, takže větší obnova
bezpečně selže místo vyčerpání hostitele a musí se ověřit na samostatném recovery stroji. Úspěch atomicky obnoví marker, jehož
stáří hlídá health; selhávající týdenní restore-check proto nezůstane skrytý. Produkční DB ani API se nepoužijí.

## Monitoring a off-site

Health kontroluje Compose služby, `/health/live`, `/health/ready`, `/api/v1/ping`, stáří lokální zálohy a oba filesystémy.
Do `.ops.env` lze vložit externí dead-man URL:

```dotenv
VYSTAVENO_MONITOR_PING_URL=https://hc-ping.com/<tajny-token>
```

Volitelný mirror musí být **už připojený samostatný mount**; skript ho nikdy sám nevytvoří. Po kopii ověří checksumy, atomicky
přepne `latest`, aplikuje bezpečnou retenci a health hlídá jeho stáří i integritu:

```dotenv
VYSTAVENO_BACKUP_MIRROR_DIR=/mnt/encrypted-offsite/vystaveno
```

Adresář na stejném VPS není off-site. Bez externího pingu a vzdálené šifrované kopie je instalace chráněná proti chybě deploye
a lokální korupci, ale ještě nemá plnou disaster recovery při ztrátě celého VPS.

`.env` se nezálohuje. `INTEGRATIONS_SECRET_ENCRYPTION_KEY` ulož odděleně v password manageru; po obnově musí zůstat stejný,
jinak nepůjdou dešifrovat credentialy providerů.

## Produkční obnova DB a příloh

Tento postup použij pouze po incidentu a po písemném potvrzení konkrétního restore pointu a přijatelné ztráty novějších dat.
Obě poloviny se nejprve připraví vedle produkce. Původní DB ani volume se nemažou, dokud nový pár neprojde smoke.

1. Uchovej `docker compose ps`, logy a deploy record. Pokud to stav dovolí, vytvoř nouzový balík aktuálních dat mimo cílový
   restore point.
2. Vyber timestamp balík, spusť `./ops/vps-verify-backup.sh <cesta>` a nepokračuj, pokud neprojde. Na Docker data-root se musí
   vejít druhá DB i druhý files volume.
3. Ověř původní `.env`, zejména `DB_PASSWORD`, `JWT_SECRET` a nezměněný `INTEGRATIONS_SECRET_ENCRYPTION_KEY`.
4. Připrav novou databázi pod dočasným názvem bez zásahu do běžící `vystaveno`:

```bash
BACKUP=~/backups/vystaveno/automatic/<UTC_TIMESTAMP>
STAMP=<UTC_TIMESTAMP_BEZ_POMLCEK>
RESTORE_DB="vystaveno_restore_$STAMP"
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db createdb -U vystaveno "$RESTORE_DB"
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db \
  pg_restore -U vystaveno -d "$RESTORE_DB" --exit-on-error --no-owner --no-privileges < "$BACKUP/database.dump"
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db \
  psql -U vystaveno -d "$RESTORE_DB" -Atc 'select count(*) from companies;'
```

5. Připrav nový files volume a rozbal do něj archiv. Původní volume zůstává beze změny:

```bash
OLD_FILES_VOLUME=$(docker inspect "$(docker compose -f docker-compose.yml -f docker-compose.prod.yml ps -a -q api)" \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/vystaveno/files"}}{{.Name}}{{end}}{{end}}')
RESTORE_FILES_VOLUME="vystavenocz_api_files_restore_$STAMP"
docker volume create "$RESTORE_FILES_VOLUME"
docker run --rm --network none --cap-drop ALL --security-opt no-new-privileges \
  -v "$RESTORE_FILES_VOLUME:/target" -v "$BACKUP:/backup:ro" \
  alpine@sha256:14358309a308569c32bdc37e2e0e9694be33a9d99e68afb0f5ff33cc1f695dce \
  tar -C /target -xzf /backup/api-files.tar.gz
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  -v "$RESTORE_FILES_VOLUME:/target:ro" \
  alpine@sha256:14358309a308569c32bdc37e2e0e9694be33a9d99e68afb0f5ff33cc1f695dce \
  find /target -type f -print
```

6. Teprve teď naplánuj krátký cutover: zastav API, ukonči DB spojení, přejmenuj původní DB na
   `vystaveno_before_$STAMP` a připravenou DB na `vystaveno`. Do `.env` atomicky nastav
   `API_FILES_VOLUME_NAME=$RESTORE_FILES_VOLUME`, poté spusť `docker compose ... up -d --force-recreate api`.
7. Ověř health, přihlášení, počty firem a dokument z obnoveného balíku. Když smoke selže, API zastav, vrať oba DB názvy a
   `API_FILES_VOLUME_NAME=$OLD_FILES_VOLUME`, pak API znovu vytvoř. Původní DB a volume maž až po schváleném stabilizačním
   období a samostatné nové záloze.

DB a `api_files` vždy přepínej jako jeden pár ze stejného balíku. Samotné přejmenování DB a změnu `.env` musí před provedením
zkontrolovat druhý člověk; přesné hodnoty se liší podle incidentu. Nikdy neměň šifrovací klíč jako opravu.

## Recovery po neúspěšném deployi

1. Přečti nejnovější `~/backups/vystaveno/logs/deploy-*.env` a logy `api`, `web`, `caddy`, `db`.
2. Pokud selhal jen web bez migrace, lze vrátit jeho image/commit. Pokud proběhla migrace, preferuj forward hotfix.
3. Produkční restore dělej jen výše uvedeným postupem a po explicitním rozhodnutí o ztrátě novějších dat.
4. Po recovery spusť health, izolovaný restore-check poslední nové zálohy a produktový smoke.

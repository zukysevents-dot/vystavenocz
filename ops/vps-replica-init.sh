#!/usr/bin/env bash

# Naplní (nebo znovu postaví) datový adresář hot standby repliky fyzickou kopií primáru.
# Spouštět ručně: při zavedení repliky a po každém plánovaném rebuildu (např. po produkční obnově).
# Failover je záměrně RUČNÍ — postup promote je v docs/vps-reliability.md.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/vps-common.sh
source "$SCRIPT_DIR/lib/vps-common.sh"

require_command docker
require_command flock

REPLICA_VOLUME="${VYSTAVENO_REPLICA_VOLUME:-vystavenocz_pgdata_replica}"
FORCE="${VYSTAVENO_REPLICA_FORCE:-0}"

db_password="$(read_env_value DB_PASSWORD || true)"
[[ -n "$db_password" ]] || die "V .env chybí DB_PASSWORD; bez něj se replika k primáru nepřipojí."

# Sdílený zámek: rebuild repliky nesmí běžet souběžně se zálohou ani deployem (obojí sahá na primár).
acquire_ops_lock

compose ps --status running --services | grep -qx db || die "Primární databáze neběží."

log "Zastavuji repliku (pokud běží)."
compose --profile replica stop -t 30 db_replica >/dev/null 2>&1 || true
compose --profile replica rm -f db_replica >/dev/null 2>&1 || true

if docker volume inspect "$REPLICA_VOLUME" >/dev/null 2>&1; then
  [[ "$FORCE" == "1" ]] ||
    die "Volume $REPLICA_VOLUME už existuje. Přepis je destruktivní — potvrď VYSTAVENO_REPLICA_FORCE=1."
  log "Mažu původní datový adresář repliky (VYSTAVENO_REPLICA_FORCE=1)."
  docker volume rm -f "$REPLICA_VOLUME" >/dev/null
fi
docker volume create "$REPLICA_VOLUME" >/dev/null

network="$(docker inspect "$(compose ps -q db)" --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}')"
[[ -n "$network" ]] || die "Nepodařilo se zjistit docker síť primární databáze."

# -R zapíše standby.signal i primary_conninfo, takže kontejner nastartuje rovnou jako hot standby.
# Heslo jde přes PGPASSWORD (proměnná prostředí), aby se neobjevilo v příkazové řádce ani v logu.
log "Kopíruji primár do repliky (pg_basebackup)."
docker run --rm --network "$network" --cap-drop ALL --security-opt no-new-privileges \
  --user postgres \
  -e PGPASSWORD="$db_password" \
  -v "$REPLICA_VOLUME:/target" \
  "$RESTORE_POSTGRES_IMAGE" \
  pg_basebackup -h db -p 5432 -U vystaveno -D /target -R -X stream --checkpoint=fast --progress

docker run --rm --network none --cap-drop ALL --security-opt no-new-privileges \
  -v "$REPLICA_VOLUME:/target" "$HELPER_IMAGE" sh -ec 'chown -R 70:70 /target
chmod 700 /target
test -f /target/standby.signal'

log "Spouštím repliku."
compose --profile replica up -d db_replica >/dev/null

connected=0
for _ in $(seq 1 30); do
  if [[ "$(compose exec -T db psql -U vystaveno -d vystaveno -Atc 'select count(*) from pg_stat_replication' |
    tr -d '\r')" =~ ^[1-9][0-9]*$ ]]; then
    connected=1
    break
  fi
  sleep 2
done
[[ "$connected" == "1" ]] || die "Replika se do primáru nepřipojila; zkontroluj logy služby db_replica."

log "Replika běží a streamuje z primáru."
log "Zapni její hlídání: VYSTAVENO_REPLICA_ENABLED=1 v $OPS_ENV"

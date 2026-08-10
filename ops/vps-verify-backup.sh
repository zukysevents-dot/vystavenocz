#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/vps-common.sh
source "$SCRIPT_DIR/lib/vps-common.sh"

require_command docker
require_command flock

acquire_ops_lock
BACKUP_DIR="$(resolve_backup_dir "${1:-$BACKUP_ROOT/latest}")"
CONTAINER_NAME="vystaveno-restore-check-$$"
PITR_CONTAINER="vystaveno-pitr-check-$$"
PITR_VOLUME="vystaveno-pitr-check-$$"
WAL_ARCHIVE_DIR="$(wal_archive_dir)"
RESTORE_STAMP="$BACKUP_ROOT/.last-restore-check"
stamp_tmp=''
pitr_conf_dir=''
pitr_verified=none

for file in database.dump api-files.tar.gz manifest.env SHA256SUMS; do
  [[ -f "$BACKUP_DIR/$file" && ! -L "$BACKUP_DIR/$file" ]] || die "V záloze chybí bezpečný soubor $file."
done

log "Ověřuji SHA-256 manifest."
verify_checksums "$BACKUP_DIR" >/dev/null
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --user "$(id -u):$(id -g)" --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  -v "$BACKUP_DIR:/backup:ro" "$HELPER_IMAGE" tar -tzf /backup/api-files.tar.gz >/dev/null

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rm -f "$PITR_CONTAINER" >/dev/null 2>&1 || true
  docker volume rm -f "$PITR_VOLUME" >/dev/null 2>&1 || true
  [[ -z "$stamp_tmp" || ! -e "$stamp_tmp" ]] || rm -f -- "$stamp_tmp"
  [[ -z "$pitr_conf_dir" || ! -d "$pitr_conf_dir" ]] || rm -rf -- "$pitr_conf_dir"
}
trap cleanup EXIT INT TERM

log "Spouštím síťově izolovaný PostgreSQL pro test obnovy."
docker run -d --rm --name "$CONTAINER_NAME" \
  --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --memory 1536m --memory-swap 1536m \
  --user postgres \
  --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,uid=70,gid=70,mode=700,size=1g \
  --tmpfs /var/run/postgresql:rw,noexec,nosuid,uid=70,gid=70,mode=775 \
  --tmpfs /tmp:rw,noexec,nosuid,uid=70,gid=70,mode=700,size=64m \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  -e POSTGRES_PASSWORD=restore-check-only \
  "$RESTORE_POSTGRES_IMAGE" >/dev/null

ready=0
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
[[ "$ready" == "1" ]] || die "Izolovaný PostgreSQL nenaběhl."

docker exec "$CONTAINER_NAME" createdb -U postgres vystaveno_restore_check
docker exec -i "$CONTAINER_NAME" pg_restore \
  -U postgres -d vystaveno_restore_check --exit-on-error --no-owner --no-privileges \
  <"$BACKUP_DIR/database.dump"

company_count="$(docker exec "$CONTAINER_NAME" psql -U postgres -d vystaveno_restore_check -Atc 'select count(*) from companies;')"
[[ "$company_count" =~ ^[0-9]+$ ]] || die "Kontrolní dotaz po obnově selhal."

# PITR: samotný logický dump prokáže jen obnovu NA SNAPSHOT. Tady se navíc rozbalí fyzická base záloha,
# přehraje se WAL z archivu a cluster se povýší přesně na čas zafixovaný při záloze (manifest PITR_TARGET_UTC).
# Balík bez base zálohy je starý formát — přeskočí se, ale nahlásí to, ať se to nezamluví.
if [[ -f "$BACKUP_DIR/basebackup.tar.gz" ]]; then
  pitr_target="$(sed -n 's/^PITR_TARGET_UTC=//p' "$BACKUP_DIR/manifest.env" | tail -n 1)"
  [[ "$pitr_target" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\ [0-9]{2}:[0-9]{2}:[0-9]{2}$ ]] ||
    die "Manifest nemá platný PITR_TARGET_UTC; obnovu na konkrétní čas nelze prokázat."
  [[ -d "$WAL_ARCHIVE_DIR" && ! -L "$WAL_ARCHIVE_DIR" ]] ||
    die "WAL archiv $WAL_ARCHIVE_DIR neexistuje; bez něj PITR neproběhne."

  log "Ověřuji obnovu na konkrétní čas: $pitr_target UTC."
  pitr_conf_dir="$(mktemp -d "${TMPDIR:-/tmp}/vystaveno-pitr.XXXXXX")"
  cat >"$pitr_conf_dir/recovery.conf" <<EOF
restore_command = 'cp /var/lib/vystaveno/wal-archive/%f %p'
recovery_target_time = '$pitr_target+00'
recovery_target_action = 'promote'
archive_mode = off
EOF

  docker volume create "$PITR_VOLUME" >/dev/null
  # Rozbalení base zálohy běží v kontejneru jako root: bez těchhle tří schopností NEPŘEČTE zálohu
  # (0600 vlastní ubuntu) a neumí PGDATA přepsat na uid 70. Zbytek schopností zůstává odebraný.
  docker run --rm --network none --cap-drop ALL \
    --cap-add CHOWN --cap-add DAC_OVERRIDE --cap-add FOWNER \
    --security-opt no-new-privileges \
    -v "$PITR_VOLUME:/target" -v "$BACKUP_DIR:/backup:ro" -v "$pitr_conf_dir:/conf:ro" \
    "$HELPER_IMAGE" sh -ec 'tar -C /target -xzf /backup/basebackup.tar.gz
cat /conf/recovery.conf >>/target/postgresql.auto.conf
: >/target/recovery.signal
chown -R 70:70 /target
chmod 700 /target'

  docker run -d --rm --name "$PITR_CONTAINER" \
    --network none --cap-drop ALL --security-opt no-new-privileges \
    --memory 1536m --memory-swap 1536m \
    --user postgres \
    --tmpfs /var/run/postgresql:rw,noexec,nosuid,uid=70,gid=70,mode=775 \
    -e PGDATA=/var/lib/postgresql/data \
    -v "$PITR_VOLUME:/var/lib/postgresql/data" \
    -v "$WAL_ARCHIVE_DIR:/var/lib/vystaveno/wal-archive:ro" \
    "$RESTORE_POSTGRES_IMAGE" >/dev/null

  # Hotovo je až tehdy, kdy cluster DOBĚHNE na cílový čas a povýší se (pg_is_in_recovery = false).
  promoted=0
  for _ in $(seq 1 90); do
    if [[ "$(docker exec "$PITR_CONTAINER" psql -U vystaveno -d vystaveno -Atc 'select pg_is_in_recovery()' 2>/dev/null |
      tr -d '\r')" == "f" ]]; then
      promoted=1
      break
    fi
    sleep 2
  done
  [[ "$promoted" == "1" ]] || die "Obnova na $pitr_target UTC nedoběhla do povýšení clusteru."

  pitr_companies="$(docker exec "$PITR_CONTAINER" psql -U vystaveno -d vystaveno -Atc 'select count(*) from companies;' |
    tr -d '\r')"
  [[ "$pitr_companies" =~ ^[0-9]+$ ]] || die "Kontrolní dotaz po obnově na konkrétní čas selhal."
  pitr_verified="$pitr_target"
  log "Obnova na konkrétní čas prošla; počet firem po PITR: $pitr_companies."
else
  log "VAROVÁNÍ: balík nemá basebackup.tar.gz (starý formát) — obnova na konkrétní čas se neověřovala."
fi

stamp_tmp="$RESTORE_STAMP.tmp.$$"
printf 'COMPLETED_AT_EPOCH=%s\nBACKUP_DIR=%s\nPITR_VERIFIED_TARGET=%s\n' \
  "$(date +%s)" "$BACKUP_DIR" "$pitr_verified" >"$stamp_tmp"
chmod 600 "$stamp_tmp"
mv "$stamp_tmp" "$RESTORE_STAMP"

log "Obnova prošla v izolaci; počet firem: $company_count. Produkční DB nebyla použita."

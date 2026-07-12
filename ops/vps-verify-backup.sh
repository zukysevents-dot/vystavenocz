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
RESTORE_STAMP="$BACKUP_ROOT/.last-restore-check"
stamp_tmp=''

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
  [[ -z "$stamp_tmp" || ! -e "$stamp_tmp" ]] || rm -f -- "$stamp_tmp"
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

stamp_tmp="$RESTORE_STAMP.tmp.$$"
printf 'COMPLETED_AT_EPOCH=%s\nBACKUP_DIR=%s\n' "$(date +%s)" "$BACKUP_DIR" >"$stamp_tmp"
chmod 600 "$stamp_tmp"
mv "$stamp_tmp" "$RESTORE_STAMP"

log "Obnova prošla v izolaci; počet firem: $company_count. Produkční DB nebyla použita."

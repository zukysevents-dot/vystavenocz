#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/vps-common.sh
source "$SCRIPT_DIR/lib/vps-common.sh"

require_command docker
require_command flock
require_command curl

RETENTION_DAYS="${VYSTAVENO_BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="${VYSTAVENO_BACKUP_TIMESTAMP:-$(date -u +'%Y%m%dT%H%M%SZ')}"
FINAL_DIR="$BACKUP_ROOT/$TIMESTAMP"
STAGING_DIR="$BACKUP_ROOT/.partial-$TIMESTAMP-$$"
MIN_FREE_BYTES="${VYSTAVENO_BACKUP_MIN_FREE_BYTES:-1073741824}"
domain="${VYSTAVENO_DOMAIN:-$(read_domain || true)}"
BASE_URL="${VYSTAVENO_BASE_URL:-${domain:+https://$domain}}"
API_WAS_RUNNING=0
API_RESTART_REQUIRED=0
QUIESCE_MARKER="$BACKUP_ROOT/.api-quiesced"
MIRROR_PARTIAL=''

[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || die "Retence musí být počet dnů."
[[ "$MIN_FREE_BYTES" =~ ^[0-9]+$ ]] || die "Minimální volné místo musí být počet bajtů."
[[ "$TIMESTAMP" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || die "Neplatný timestamp zálohy: $TIMESTAMP"
[[ -n "$BASE_URL" ]] || die "Nastav VYSTAVENO_BASE_URL nebo DOMAIN v .env."

acquire_ops_lock

cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  if [[ "$API_RESTART_REQUIRED" == "1" && "$API_WAS_RUNNING" == "1" ]]; then
    log "Obnovuji API po přerušené záloze."
    if compose start api >/dev/null; then
      rm -f -- "$QUIESCE_MARKER"
    else
      rc=1
    fi
  fi
  [[ -z "$MIRROR_PARTIAL" || ! -d "$MIRROR_PARTIAL" ]] || rm -rf -- "$MIRROR_PARTIAL"
  [[ ! -d "$STAGING_DIR" ]] || rm -rf -- "$STAGING_DIR"
  exit "$rc"
}
trap cleanup EXIT INT TERM

valid_backup_dirs() {
  find "$BACKUP_ROOT" -xdev -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print |
    while IFS= read -r directory; do
      [[ ! -L "$directory" && -f "$directory/manifest.env" && -f "$directory/SHA256SUMS" ]] || continue
      [[ "$(canonical_path "$directory")" == "$(canonical_path "$BACKUP_ROOT")"/20??????T??????Z ]] || continue
      printf '%s\n' "$directory"
    done
}

load_valid_backups() {
  BACKUPS=('__sentinel__')
  while IFS= read -r directory; do
    [[ -n "$directory" ]] || continue
    BACKUPS[${#BACKUPS[@]}]="$directory"
  done < <(valid_backup_dirs | sort)
}

delete_valid_backup() {
  local directory="$1" canonical root
  canonical="$(canonical_path "$directory")"
  root="$(canonical_path "$BACKUP_ROOT")"
  [[ "$canonical" == "$root"/20??????T??????Z ]] || die "Odmítám smazat cestu mimo backup root: $directory"
  [[ -f "$canonical/manifest.env" && -f "$canonical/SHA256SUMS" ]] || die "Odmítám smazat neúplný backup: $directory"
  rm -rf -- "$canonical"
}

prune_backups() {
  local now cutoff latest_target='' directory mtime count
  now="$(date +%s)"
  cutoff=$((now - RETENTION_DAYS * 86400))
  if [[ -L "$BACKUP_ROOT/latest" ]]; then
    latest_target="$(canonical_path "$BACKUP_ROOT/latest")"
  fi

  load_valid_backups
  count=$((${#BACKUPS[@]} - 1))
  for directory in "${BACKUPS[@]:1}"; do
    ((count > 2)) || break
    [[ "$(canonical_path "$directory")" != "$latest_target" ]] || continue
    mtime="$(file_mtime_epoch "$directory/manifest.env")"
    if ((mtime < cutoff)); then
      delete_valid_backup "$directory"
      count=$((count - 1))
    fi
  done

  while (( $(available_bytes "$BACKUP_ROOT") < REQUIRED_FREE_BYTES )); do
    load_valid_backups
    ((${#BACKUPS[@]} - 1 > 2)) || break
    directory="${BACKUPS[1]}"
    if [[ "$(canonical_path "$directory")" == "$latest_target" ]]; then
      directory="${BACKUPS[2]}"
    fi
    delete_valid_backup "$directory"
  done
}

[[ ! -e "$FINAL_DIR" ]] || die "Záloha $FINAL_DIR už existuje."

previous_payload=0
if [[ -L "$BACKUP_ROOT/latest" ]]; then
  latest_dir="$(resolve_backup_dir "$BACKUP_ROOT/latest")"
  db_bytes="$(sed -n 's/^DATABASE_BYTES=//p' "$latest_dir/manifest.env" | tail -n 1)"
  files_bytes="$(sed -n 's/^API_FILES_BYTES=//p' "$latest_dir/manifest.env" | tail -n 1)"
  if [[ "$db_bytes" =~ ^[0-9]+$ && "$files_bytes" =~ ^[0-9]+$ ]]; then
    previous_payload=$((db_bytes + files_bytes))
  fi
fi
REQUIRED_FREE_BYTES="$MIN_FREE_BYTES"
if ((previous_payload * 2 > REQUIRED_FREE_BYTES)); then
  REQUIRED_FREE_BYTES=$((previous_payload * 2))
fi
prune_backups
(( $(available_bytes "$BACKUP_ROOT") >= REQUIRED_FREE_BYTES )) || die "Na backup disku není dost místa pro bezpečný nový snapshot."

find "$BACKUP_ROOT" -xdev -mindepth 1 -maxdepth 1 -type d -name '.partial-*' -mtime +1 -print0 |
  while IFS= read -r -d '' partial; do
    [[ "$(canonical_path "$partial")" == "$(canonical_path "$BACKUP_ROOT")"/.partial-* ]] || continue
    rm -rf -- "$partial"
  done

mkdir -m 700 "$STAGING_DIR"

api_container="$(compose ps -a -q api)"
[[ -n "$api_container" ]] || die "API kontejner neexistuje."
if compose ps --status running --services | grep -qx api; then
  API_WAS_RUNNING=1
fi
volume_name="$(docker inspect "$api_container" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/vystaveno/files"}}{{.Name}}{{end}}{{end}}')"
[[ -n "$volume_name" ]] || die "API nemá připojený volume /var/lib/vystaveno/files."
api_image="$(docker inspect "$api_container" --format '{{.Image}}')"
db_container="$(compose ps -q db)"
[[ -n "$db_container" ]] || die "DB kontejner neběží."
compose ps --status running --services | grep -qx db || die "DB služba není ve stavu running."
db_image="$(docker inspect "$db_container" --format '{{.Image}}')"
postgres_version="$(compose exec -T db psql -U vystaveno -d vystaveno -Atc 'show server_version;' | tr -d '\r\n')"

backend_commit="$(git -C "$PROJECT_DIR/../vystaveno-api" rev-parse HEAD 2>/dev/null || printf unknown)"
frontend_commit="$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || printf unknown)"

if [[ "$API_WAS_RUNNING" == "1" ]]; then
  log "Pozastavuji API pro konzistentní snapshot DB + souborů."
  printf 'STARTED_AT_UTC=%s\nPID=%s\n' "$(date -u +'%Y%m%dT%H%M%SZ')" "$$" >"$QUIESCE_MARKER.tmp"
  chmod 600 "$QUIESCE_MARKER.tmp"
  mv "$QUIESCE_MARKER.tmp" "$QUIESCE_MARKER"
  API_RESTART_REQUIRED=1
  compose stop -t 30 api >/dev/null
  [[ "$(docker inspect "$api_container" --format '{{.State.Running}}')" == "false" ]] || die "API se nepodařilo zastavit."
else
  log "API už bylo zastavené; po záloze zůstane zastavené."
fi

log "Vytvářím PostgreSQL dump."
compose exec -T db pg_dump \
  -U vystaveno -d vystaveno --format=custom --no-owner --no-privileges \
  >"$STAGING_DIR/database.dump"
[[ -s "$STAGING_DIR/database.dump" ]] || die "Databázový dump je prázdný."

log "Archivuji persistentní přílohy z volume $volume_name."
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --user "$(id -u):$(id -g)" --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  -v "$volume_name:/source:ro" -v "$STAGING_DIR:/backup" \
  "$HELPER_IMAGE" tar -C /source -czf /backup/api-files.tar.gz .
[[ -s "$STAGING_DIR/api-files.tar.gz" ]] || die "Archiv příloh je prázdný."
[[ "$(docker inspect "$api_container" --format '{{.State.Running}}')" == "false" ]] || die "API se během snapshotu neočekávaně spustilo."

if [[ "$API_WAS_RUNNING" == "1" ]]; then
  log "Spouštím API po snapshotu."
  compose start api >/dev/null
  ready=0
  for _ in $(seq 1 30); do
    if [[ "$(curl -fsS --max-time 5 "$BASE_URL/health/ready" 2>/dev/null || true)" == "Healthy" ]]; then
      ready=1
      break
    fi
    sleep 2
  done
  [[ "$ready" == "1" ]] || die "API po snapshotu nenaběhlo do ready stavu."
  API_RESTART_REQUIRED=0
  rm -f -- "$QUIESCE_MARKER"
fi

log "Ověřuji čitelnost obou archivů."
compose exec -T db pg_restore --list <"$STAGING_DIR/database.dump" >/dev/null
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --user "$(id -u):$(id -g)" --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  -v "$STAGING_DIR:/backup:ro" "$HELPER_IMAGE" tar -tzf /backup/api-files.tar.gz >/dev/null

db_size="$(wc -c <"$STAGING_DIR/database.dump" | tr -d ' ')"
files_size="$(wc -c <"$STAGING_DIR/api-files.tar.gz" | tr -d ' ')"
cat >"$STAGING_DIR/manifest.env" <<EOF
BACKUP_FORMAT_VERSION=1
CREATED_AT_UTC=$TIMESTAMP
COMPLETED_AT_UTC=$(date -u +'%Y%m%dT%H%M%SZ')
CONSISTENCY_MODE=application-quiesced
FRONTEND_COMMIT=$frontend_commit
BACKEND_COMMIT=$backend_commit
API_IMAGE=$api_image
DB_IMAGE=$db_image
POSTGRES_VERSION=$postgres_version
API_FILES_VOLUME=$volume_name
DATABASE_BYTES=$db_size
API_FILES_BYTES=$files_size
EOF

write_checksums "$STAGING_DIR" database.dump api-files.tar.gz manifest.env >"$STAGING_DIR/SHA256SUMS"
chmod 600 "$STAGING_DIR"/*
verify_checksums "$STAGING_DIR" >/dev/null

mv "$STAGING_DIR" "$FINAL_DIR"
ln -sfn "$TIMESTAMP" "$BACKUP_ROOT/latest.new"
mv -Tf "$BACKUP_ROOT/latest.new" "$BACKUP_ROOT/latest" 2>/dev/null || mv -f "$BACKUP_ROOT/latest.new" "$BACKUP_ROOT/latest"

if [[ -n "${VYSTAVENO_BACKUP_MIRROR_DIR:-}" ]]; then
  require_command mountpoint
  mirror="$VYSTAVENO_BACKUP_MIRROR_DIR"
  [[ -d "$mirror" && ! -L "$mirror" ]] || die "Mirror musí být existující adresář a nesmí být symlink."
  mountpoint -q "$mirror" || die "Mirror není samostatně připojený mount; lokální adresář odmítám."
  mirror="$(canonical_path "$mirror")"
  [[ "$mirror" != "/" && "$mirror" != "$(canonical_path "$HOME")" && "$mirror" != "$(canonical_path "$PROJECT_DIR")" ]] ||
    die "Nebezpečná cesta mirroru: $mirror"
  [[ "$mirror" != "$(canonical_path "$BACKUP_ROOT")" ]] || die "Mirror nesmí být lokální backup root."
  find "$mirror" -xdev -mindepth 1 -maxdepth 1 -type d -name '*.partial' -mtime +1 -print0 |
    while IFS= read -r -d '' partial; do
      [[ "$(canonical_path "$partial")" == "$mirror"/*.partial ]] || continue
      rm -rf -- "$partial"
    done
  mirror_required=$((db_size + files_size + 67108864))
  # Prune before measuring capacity: a full mirror must be able to recover by dropping only old valid bundles.
  mirror_cutoff=$(($(date +%s) - RETENTION_DAYS * 86400))
  mirror_latest_target=''
  if [[ -L "$mirror/latest" ]]; then
    mirror_latest_target="$(canonical_path "$mirror/latest")"
  fi
  MIRROR_BACKUPS=('__sentinel__')
  while IFS= read -r directory; do
    [[ -n "$directory" && -f "$directory/manifest.env" && -f "$directory/SHA256SUMS" ]] || continue
    [[ "$(canonical_path "$directory")" == "$mirror"/20??????T??????Z ]] || continue
    MIRROR_BACKUPS[${#MIRROR_BACKUPS[@]}]="$directory"
  done < <(find "$mirror" -xdev -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print | sort)
  mirror_count=$((${#MIRROR_BACKUPS[@]} - 1))
  for directory in "${MIRROR_BACKUPS[@]:1}"; do
    ((mirror_count > 2)) || break
    [[ "$(canonical_path "$directory")" != "$mirror_latest_target" ]] || continue
    if (( $(file_mtime_epoch "$directory/manifest.env") < mirror_cutoff )); then
      rm -rf -- "$directory"
      mirror_count=$((mirror_count - 1))
    fi
  done
  while (( $(available_bytes "$mirror") < mirror_required )); do
    MIRROR_BACKUPS=('__sentinel__')
    while IFS= read -r directory; do
      [[ -n "$directory" && -f "$directory/manifest.env" && -f "$directory/SHA256SUMS" ]] || continue
      [[ "$(canonical_path "$directory")" == "$mirror"/20??????T??????Z ]] || continue
      MIRROR_BACKUPS[${#MIRROR_BACKUPS[@]}]="$directory"
    done < <(find "$mirror" -xdev -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -print | sort)
    mirror_count=$((${#MIRROR_BACKUPS[@]} - 1))
    ((mirror_count > 2)) || break
    for directory in "${MIRROR_BACKUPS[@]:1}"; do
      [[ "$(canonical_path "$directory")" != "$mirror_latest_target" ]] || continue
      rm -rf -- "$directory"
      break
    done
  done
  (( $(available_bytes "$mirror") >= mirror_required )) || die "Na off-site mirroru není dost místa pro nový balík."
  MIRROR_PARTIAL="$mirror/$TIMESTAMP.partial"
  rm -rf -- "$MIRROR_PARTIAL"
  cp -a "$FINAL_DIR" "$MIRROR_PARTIAL"
  verify_checksums "$MIRROR_PARTIAL" >/dev/null
  mv "$MIRROR_PARTIAL" "$mirror/$TIMESTAMP"
  MIRROR_PARTIAL=''
  ln -sfn "$TIMESTAMP" "$mirror/latest.new"
  mv -Tf "$mirror/latest.new" "$mirror/latest" 2>/dev/null || mv -f "$mirror/latest.new" "$mirror/latest"
fi

log "Záloha je hotová: $FINAL_DIR"

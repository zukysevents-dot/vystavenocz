#!/usr/bin/env bash

set -Eeuo pipefail

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="${VYSTAVENO_PROJECT_DIR:-$(cd "$OPS_DIR/.." && pwd)}"
OPS_ENV="${VYSTAVENO_OPS_ENV:-$PROJECT_DIR/.ops.env}"
BACKUP_ROOT="$HOME/backups/vystaveno/automatic"
# shellcheck disable=SC2034 # Public shared constants consumed by sourced ops scripts.
OPS_LOG_DIR="$HOME/backups/vystaveno/logs"
LOCK_FILE="$BACKUP_ROOT/.operations.lock"
# shellcheck disable=SC2034 # Public shared constants consumed by sourced ops scripts.
HELPER_IMAGE='alpine@sha256:14358309a308569c32bdc37e2e0e9694be33a9d99e68afb0f5ff33cc1f695dce'
# shellcheck disable=SC2034 # Public shared constants consumed by sourced ops scripts.
RESTORE_POSTGRES_IMAGE='postgres@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777'

COMPOSE_FILES=(
  -f "$PROJECT_DIR/docker-compose.yml"
  -f "$PROJECT_DIR/docker-compose.prod.yml"
)

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Chybí příkaz: $1"
}

compose() {
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

canonical_path() {
  if command -v realpath >/dev/null 2>&1; then
    realpath -m -- "$1" 2>/dev/null || realpath -- "$1"
  else
    local directory basename
    directory="$(cd "$(dirname "$1")" && pwd -P)"
    basename="$(basename "$1")"
    printf '%s/%s\n' "$directory" "$basename"
  fi
}

file_mode() {
  if stat -c %a "$1" >/dev/null 2>&1; then
    stat -c %a "$1"
  else
    stat -f %Lp "$1"
  fi
}

file_owner_uid() {
  if stat -c %u "$1" >/dev/null 2>&1; then
    stat -c %u "$1"
  else
    stat -f %u "$1"
  fi
}

load_ops_config() {
  [[ -e "$OPS_ENV" ]] || return 0
  [[ -f "$OPS_ENV" && ! -L "$OPS_ENV" ]] || die "Konfigurace $OPS_ENV musí být běžný soubor, ne symlink."
  [[ "$(file_owner_uid "$OPS_ENV")" == "$(id -u)" ]] || die "Konfiguraci $OPS_ENV musí vlastnit aktuální uživatel."
  [[ "$(file_mode "$OPS_ENV")" == "600" ]] || die "Konfigurace $OPS_ENV musí mít oprávnění 0600."

  local line key value line_number=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1))
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == *=* ]] || die "Neplatný řádek $line_number v $OPS_ENV."
    key="${line%%=*}"
    value="${line#*=}"
    [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || die "Neplatný klíč na řádku $line_number v $OPS_ENV."
    case "$key" in
      VYSTAVENO_BASE_URL | VYSTAVENO_BACKUP_RETENTION_DAYS | VYSTAVENO_MAX_BACKUP_AGE_SECONDS | VYSTAVENO_MAX_RESTORE_CHECK_AGE_SECONDS | VYSTAVENO_MIN_DISK_FREE_PERCENT | VYSTAVENO_MONITOR_PING_URL | VYSTAVENO_BACKUP_MIRROR_DIR)
        printf -v "$key" '%s' "$value"
        ;;
      *)
        die "Nepovolený klíč $key v $OPS_ENV."
        ;;
    esac
  done <"$OPS_ENV"
}

prepare_backup_root() {
  local expected actual
  mkdir -p "$BACKUP_ROOT"
  [[ ! -L "$BACKUP_ROOT" ]] || die "Backup root nesmí být symlink."
  expected="$(canonical_path "$HOME/backups/vystaveno/automatic")"
  actual="$(canonical_path "$BACKUP_ROOT")"
  [[ "$actual" == "$expected" ]] || die "Backup root je mimo pevně povolenou cestu."
  chmod 700 "$BACKUP_ROOT"
}

acquire_ops_lock() {
  prepare_backup_root
  local fd fd_path target

  if [[ -n "${VYSTAVENO_LOCK_FD:-}" ]]; then
    fd="$VYSTAVENO_LOCK_FD"
    [[ "$fd" =~ ^[0-9]+$ ]] || die "Neplatný file descriptor zámku."
    fd_path="/proc/$$/fd/$fd"
    [[ -e "$fd_path" ]] || fd_path="/dev/fd/$fd"
    [[ -e "$fd_path" ]] || die "Předaný file descriptor zámku neexistuje."
    target="$(canonical_path "$(readlink "$fd_path")")"
    [[ "$target" == "$(canonical_path "$LOCK_FILE")" ]] || die "Předaný file descriptor nepatří provoznímu zámku."
    flock -n "$fd" || die "Jiná záloha nebo deploy už běží."
    return
  fi

  fd=9
  exec 9>"$LOCK_FILE"
  flock -n "$fd" || die "Jiná záloha nebo deploy už běží."
  VYSTAVENO_LOCK_FD="$fd"
  export VYSTAVENO_LOCK_FD
}

resolve_backup_dir() {
  local requested="$1" resolved root
  root="$(canonical_path "$BACKUP_ROOT")"
  resolved="$(canonical_path "$requested")"
  [[ "$resolved" == "$root"/20??????T??????Z ]] || die "Záloha musí být dokončený timestamp adresář v $BACKUP_ROOT."
  [[ -d "$resolved" && ! -L "$resolved" ]] || die "Záloha neexistuje nebo je symlink: $resolved"
  printf '%s\n' "$resolved"
}

write_checksums() {
  local directory="$1"
  shift
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$directory" && sha256sum "$@")
  else
    (cd "$directory" && shasum -a 256 "$@")
  fi
}

verify_checksums() {
  local directory="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$directory" && sha256sum --check SHA256SUMS)
  else
    (cd "$directory" && shasum -a 256 --check SHA256SUMS)
  fi
}

read_domain() {
  local env_file="$PROJECT_DIR/.env"
  [[ -f "$env_file" ]] || return 1
  sed -n 's/^DOMAIN=//p' "$env_file" | tail -n 1 | tr -d "'\"[:space:]"
}

file_mtime_epoch() {
  local path="$1"
  if stat -c %Y "$path" >/dev/null 2>&1; then
    stat -c %Y "$path"
  else
    stat -f %m "$path"
  fi
}

available_bytes() {
  df -Pk "$1" | awk 'NR == 2 { printf "%.0f", $4 * 1024 }'
}

load_ops_config

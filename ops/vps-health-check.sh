#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/vps-common.sh
source "$SCRIPT_DIR/lib/vps-common.sh"

require_command curl
require_command flock

domain="${VYSTAVENO_DOMAIN:-$(read_domain || true)}"
BASE_URL="${VYSTAVENO_BASE_URL:-${domain:+https://$domain}}"
PING_URL="${VYSTAVENO_MONITOR_PING_URL:-}"
MAX_BACKUP_AGE_SECONDS="${VYSTAVENO_MAX_BACKUP_AGE_SECONDS:-108000}"
MAX_RESTORE_CHECK_AGE_SECONDS="${VYSTAVENO_MAX_RESTORE_CHECK_AGE_SECONDS:-691200}"
MIN_DISK_FREE_PERCENT="${VYSTAVENO_MIN_DISK_FREE_PERCENT:-10}"
[[ -n "$BASE_URL" ]] || die "Nastav VYSTAVENO_BASE_URL nebo DOMAIN v .env."
[[ "$MAX_BACKUP_AGE_SECONDS" =~ ^[0-9]+$ ]] || die "Neplatný limit stáří zálohy."
[[ "$MAX_RESTORE_CHECK_AGE_SECONDS" =~ ^[0-9]+$ ]] || die "Neplatný limit stáří restore-checku."
[[ "$MIN_DISK_FREE_PERCENT" =~ ^[0-9]+$ ]] || die "Neplatný limit volného místa."

prepare_backup_root
if [[ -n "${VYSTAVENO_LOCK_FD:-}" ]]; then
  acquire_ops_lock
else
  exec 8>"$LOCK_FILE"
  if ! flock -n 8; then
    log "Probíhá záloha nebo deploy; tento health běh se korektně přeskočil."
    exit 0
  fi
fi

fail_monitor() {
  local message="$1"
  log "ERROR: $message" >&2
  if [[ -n "$PING_URL" ]]; then
    curl -fsS --max-time 10 --retry 2 --data-raw "$message" "$PING_URL/fail" >/dev/null || true
  fi
  exit 1
}

if [[ -f "$BACKUP_ROOT/.api-quiesced" ]]; then
  log "Nalezen marker přerušené zálohy; ověřuji API."
  if ! compose ps --status running --services | grep -qx api; then
    compose start api >/dev/null || fail_monitor "API po přerušené záloze nejde spustit"
    recovered=0
    for _ in $(seq 1 30); do
      if [[ "$(curl -fsS --max-time 5 "$BASE_URL/health/ready" 2>/dev/null || true)" == "Healthy" ]]; then
        recovered=1
        break
      fi
      sleep 2
    done
    [[ "$recovered" == "1" ]] || fail_monitor "API po přerušené záloze nenaběhlo"
  fi
  rm -f -- "$BACKUP_ROOT/.api-quiesced"
fi

live="$(curl -fsS --max-time 15 --retry 2 "$BASE_URL/health/live")" || fail_monitor "health/live je nedostupný"
ready="$(curl -fsS --max-time 15 --retry 2 "$BASE_URL/health/ready")" || fail_monitor "health/ready je nedostupný"
ping="$(curl -fsS --max-time 15 --retry 2 "$BASE_URL/api/v1/ping")" || fail_monitor "api/v1/ping je nedostupný"

[[ "$live" == "Healthy" ]] || fail_monitor "health/live vrátil neočekávanou odpověď"
[[ "$ready" == "Healthy" ]] || fail_monitor "health/ready vrátil neočekávanou odpověď"
[[ "$ping" == *'"status":"ok"'* ]] || fail_monitor "api/v1/ping vrátil neočekávanou odpověď"

if [[ "${VYSTAVENO_HEALTH_CHECK_COMPOSE:-1}" == "1" ]]; then
  running_services="$(compose ps --status running --services)"
  for service in db api web caddy; do
    grep -qx "$service" <<<"$running_services" || fail_monitor "Compose služba $service neběží"
  done
fi

latest_dir="$(resolve_backup_dir "$BACKUP_ROOT/latest")"
latest_manifest="$latest_dir/manifest.env"
backup_age="$(( $(date +%s) - $(file_mtime_epoch "$latest_manifest") ))"
((backup_age <= MAX_BACKUP_AGE_SECONDS)) || fail_monitor "Poslední záloha je starší než povolený limit"

restore_stamp="$BACKUP_ROOT/.last-restore-check"
[[ -f "$restore_stamp" && ! -L "$restore_stamp" ]] || fail_monitor "Chybí úspěšný restore-check zálohy"
restore_completed="$(sed -n 's/^COMPLETED_AT_EPOCH=//p' "$restore_stamp" | tail -n 1)"
[[ "$restore_completed" =~ ^[0-9]+$ ]] || fail_monitor "Restore-check marker je neplatný"
restore_age="$(( $(date +%s) - restore_completed ))"
((restore_age <= MAX_RESTORE_CHECK_AGE_SECONDS)) || fail_monitor "Poslední úspěšný restore-check je příliš starý"

filesystem_paths=("$PROJECT_DIR" "$BACKUP_ROOT")
if [[ "${VYSTAVENO_HEALTH_CHECK_COMPOSE:-1}" == "1" ]]; then
  docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null)" || fail_monitor "Nelze zjistit Docker data-root"
  [[ -d "$docker_root" ]] || fail_monitor "Docker data-root neexistuje"
  filesystem_paths[${#filesystem_paths[@]}]="$docker_root"
fi
for filesystem_path in "${filesystem_paths[@]}"; do
  free_percent="$(df -Pk "$filesystem_path" | awk 'NR == 2 { printf "%d", ($4 * 100) / $2 }')"
  ((free_percent >= MIN_DISK_FREE_PERCENT)) || fail_monitor "Na filesystemu $filesystem_path zbývá méně než $MIN_DISK_FREE_PERCENT % místa"
done

if [[ -n "${VYSTAVENO_BACKUP_MIRROR_DIR:-}" ]]; then
  require_command mountpoint
  mirror="$VYSTAVENO_BACKUP_MIRROR_DIR"
  [[ -d "$mirror" && ! -L "$mirror" ]] || fail_monitor "Off-site mirror není dostupný"
  mountpoint -q "$mirror" || fail_monitor "Off-site mirror není připojený mount"
  [[ "$(canonical_path "$mirror")" != "/" ]] || fail_monitor "Off-site mirror nesmí být root filesystem"
  mirror_latest="$(canonical_path "$mirror/latest")"
  [[ "$mirror_latest" == "$(canonical_path "$mirror")"/20??????T??????Z ]] || fail_monitor "Mirror latest je neplatný"
  [[ -f "$mirror_latest/manifest.env" ]] || fail_monitor "Mirror nemá dokončenou poslední zálohu"
  mirror_age="$(( $(date +%s) - $(file_mtime_epoch "$mirror_latest/manifest.env") ))"
  ((mirror_age <= MAX_BACKUP_AGE_SECONDS)) || fail_monitor "Off-site mirror je zastaralý"
  verify_checksums "$mirror_latest" >/dev/null || fail_monitor "Kontrolní součty off-site mirroru nesedí"
fi

if [[ -n "$PING_URL" ]]; then
  curl -fsS --max-time 10 --retry 2 "$PING_URL" >/dev/null || true
fi
log "Health check prošel: $BASE_URL"

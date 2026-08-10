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
# Jak dlouho smí hotový WAL segment čekat ve frontě na archivaci (archive_timeout je 300 s).
MAX_WAL_ARCHIVE_AGE_SECONDS="${VYSTAVENO_MAX_WAL_ARCHIVE_AGE_SECONDS:-1800}"
MAX_WAL_DIR_BYTES="${VYSTAVENO_MAX_WAL_DIR_BYTES:-2147483648}"
REPLICA_ENABLED="${VYSTAVENO_REPLICA_ENABLED:-0}"
MAX_REPLICA_LAG_BYTES="${VYSTAVENO_MAX_REPLICA_LAG_BYTES:-67108864}"
WAL_ARCHIVE_DIR="$(wal_archive_dir)"
[[ -n "$BASE_URL" ]] || die "Nastav VYSTAVENO_BASE_URL nebo DOMAIN v .env."
[[ "$MAX_BACKUP_AGE_SECONDS" =~ ^[0-9]+$ ]] || die "Neplatný limit stáří zálohy."
[[ "$MAX_RESTORE_CHECK_AGE_SECONDS" =~ ^[0-9]+$ ]] || die "Neplatný limit stáří restore-checku."
[[ "$MIN_DISK_FREE_PERCENT" =~ ^[0-9]+$ ]] || die "Neplatný limit volného místa."
[[ "$MAX_WAL_ARCHIVE_AGE_SECONDS" =~ ^[0-9]+$ ]] || die "Neplatný limit stáří WAL archivu."
[[ "$MAX_WAL_DIR_BYTES" =~ ^[0-9]+$ ]] || die "Neplatný limit velikosti pg_wal."
[[ "$MAX_REPLICA_LAG_BYTES" =~ ^[0-9]+$ ]] || die "Neplatný limit replikačního zpoždění."

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

  # Archivace WAL je podmínka PITR a je to TICHÁ porucha: databáze jede dál, ale nearchivovaný WAL se hromadí
  # v pg_wal a při zaplněném disku se PostgreSQL zastaví. Hlídáme poslední pokus, stáří archivu i objem pg_wal.
  # Měří se FRONTA (pg_wal/archive_status/*.ready), ne stáří poslední archivace: na tiché databázi
  # PostgreSQL segment nepřepíná, takže „poslední archivovaný WAL" legitimně stárne a starý test
  # kvůli tomu hlásil poplach každých 5 minut. Prázdná fronta = není co archivovat = v pořádku.
  archiver="$(compose exec -T db psql -U vystaveno -d vystaveno -Atc "select case when last_failed_time is not null and (last_archived_time is null or last_failed_time > last_archived_time) then 'failing' else 'ok' end || '|' || (select coalesce(max(extract(epoch from now() - (pg_stat_file('pg_wal/archive_status/' || name)).modification))::bigint, 0) from pg_ls_dir('pg_wal/archive_status') name where name like '%.ready') from pg_stat_archiver;" | tr -d '\r')" ||
    fail_monitor "Nelze přečíst stav archivace WAL"
  archiver_state="${archiver%%|*}"
  pending_age="${archiver##*|}"
  [[ "$archiver_state" == "ok" ]] || fail_monitor "Archivace WAL selhává — obnova na konkrétní čas by nebyla možná"
  [[ "$pending_age" =~ ^[0-9]+$ ]] || fail_monitor "Nelze zjistit stáří nearchivovaného WAL"
  ((pending_age <= MAX_WAL_ARCHIVE_AGE_SECONDS)) || fail_monitor "WAL čeká na archivaci déle než povolený limit ($pending_age s)"

  wal_bytes="$(compose exec -T db psql -U vystaveno -d vystaveno -Atc 'select coalesce(sum(size), 0)::bigint from pg_ls_waldir();' | tr -d '\r')" ||
    fail_monitor "Nelze zjistit velikost adresáře pg_wal"
  [[ "$wal_bytes" =~ ^[0-9]+$ ]] || fail_monitor "Neplatná velikost adresáře pg_wal"
  ((wal_bytes <= MAX_WAL_DIR_BYTES)) || fail_monitor "Adresář pg_wal narostl nad limit ($wal_bytes B) — plný disk WAL zastaví databázi"

  # Replika se hlídá, jen když se s ní počítá; jinak by každá instalace bez repliky hlásila chybu.
  if [[ "$REPLICA_ENABLED" == "1" ]]; then
    replication="$(compose exec -T db psql -U vystaveno -d vystaveno -Atc "select count(*) || '|' || coalesce(max(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn))::bigint, 0) from pg_stat_replication;" | tr -d '\r')" ||
      fail_monitor "Nelze zjistit stav replikace"
    replicas_connected="${replication%%|*}"
    replica_lag_bytes="${replication##*|}"
    [[ "$replicas_connected" =~ ^[0-9]+$ && "$replica_lag_bytes" =~ ^-?[0-9]+$ ]] || fail_monitor "Neplatný stav replikace"
    ((replicas_connected >= 1)) || fail_monitor "Hot standby replika není připojená"
    ((replica_lag_bytes <= MAX_REPLICA_LAG_BYTES)) || fail_monitor "Replikační zpoždění překročilo limit ($replica_lag_bytes B)"
    log "Replika je připojená, replikační zpoždění $replica_lag_bytes B."
  fi
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
# Plný filesystem WAL archivu = archivace začne selhávat a pg_wal poroste, dokud se databáze nezastaví.
[[ ! -d "$WAL_ARCHIVE_DIR" ]] || filesystem_paths[${#filesystem_paths[@]}]="$WAL_ARCHIVE_DIR"
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

#!/usr/bin/env bash

set -Eeuo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_DIR="$(cd "$TEST_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/vystaveno-vps-test.XXXXXX")"
FAKE_BIN="$TMP_DIR/bin"
PROJECT_FIXTURE="$TMP_DIR/project"
OPS_ENV_FIXTURE="$TMP_DIR/fixtures/vps-ops.env"
DOCKER_LOG="$TMP_DIR/docker.log"
CURL_LOG="$TMP_DIR/curl.log"

cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

assert_file() {
  [[ -f "$1" ]] || fail "missing file: $1"
}

assert_contains() {
  local file="$1"
  local text="$2"
  grep -F -- "$text" "$file" >/dev/null || fail "$file does not contain: $text"
}

assert_count() {
  local expected="$1"
  local text="$2"
  local file="$3"
  local actual
  actual="$(grep -F -c -- "$text" "$file" || true)"
  [[ "$actual" == "$expected" ]] || fail "expected $expected occurrences of '$text' in $file, got $actual"
}

mkdir -p "$FAKE_BIN" "$PROJECT_FIXTURE" "$TMP_DIR/home" "$(dirname "$OPS_ENV_FIXTURE")"
cat >"$OPS_ENV_FIXTURE" <<'EOF'
VYSTAVENO_BASE_URL=https://fixture.invalid
VYSTAVENO_MONITOR_PING_URL=https://monitor.invalid/check
EOF
chmod 600 "$OPS_ENV_FIXTURE"
cat >"$PROJECT_FIXTURE/.env" <<'EOF'
DOMAIN=must-not-be-used.invalid
EOF

cat >"$FAKE_BIN/flock" <<'EOF'
#!/usr/bin/env bash
if [[ "${FAKE_FLOCK_FAIL:-0}" == "1" ]]; then
  exit 1
fi
exit 0
EOF

cat >"$FAKE_BIN/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF

cat >"$FAKE_BIN/mountpoint" <<'EOF'
#!/usr/bin/env bash
[[ "${1:-}" == "-q" && -d "${2:-}" ]]
EOF

cat >"$FAKE_BIN/docker" <<'EOF'
#!/usr/bin/env bash
set -u

printf '%s\n' "$*" >>"$FAKE_DOCKER_LOG"

if [[ "${1:-}" == "info" ]]; then
  printf '%s\n' "${FAKE_DOCKER_ROOT:-/tmp}"
  exit 0
fi

if [[ "${1:-}" == "volume" ]]; then
  printf '%s\n' 'fixture-volume'
  exit 0
fi

if [[ "${1:-}" == "inspect" ]]; then
  case "${*: -1}" in
    *'.State.Running'*) printf '%s\n' 'false' ;;
    *'.Image'*)
      if [[ "${2:-}" == "fixture-db-container" ]]; then
        printf '%s\n' 'fixture-db-image'
      else
        printf '%s\n' 'fixture-api-image'
      fi
      ;;
    *) printf '%s\n' 'fixture-api-files-volume' ;;
  esac
  exit 0
fi

if [[ "${1:-}" == "compose" ]]; then
  shift
  while [[ "${1:-}" == "-f" ]]; do
    shift 2
  done

  case "${1:-}" in
    ps)
      if [[ "$*" == *"--status running --services"* ]]; then
        printf '%s\n' db api web caddy
      elif [[ "$*" == *"-q db"* ]]; then
        printf '%s\n' 'fixture-db-container'
      else
        printf '%s\n' 'fixture-api-container'
      fi
      ;;
    stop|start)
      if [[ "${1:-}" == "stop" && "${FAKE_DOCKER_MODE:-success}" == "stop-fail" ]]; then
        exit 43
      fi
      ;;
    exec)
      if [[ "$*" == *" pg_dump "* ]]; then
        if [[ "${FAKE_DOCKER_MODE:-success}" == "dump-fail" ]]; then
          exit 44
        fi
        printf '%s\n' 'fixture-postgresql-custom-dump'
      elif [[ "$*" == *" pg_restore --list"* ]]; then
        cat >/dev/null
      elif [[ "$*" == *"show server_version"* ]]; then
        printf '%s\n' '16.9'
      elif [[ "$*" == *" pg_basebackup "* ]]; then
        if [[ "${FAKE_DOCKER_MODE:-success}" == "basebackup-fail" ]]; then
          exit 45
        fi
        printf '%s\n' 'fixture-postgresql-basebackup'
      elif [[ "$*" == *"to_char(now()"* ]]; then
        printf '%s\n' '2026-07-11 12:00:00'
      elif [[ "$*" == *"pg_switch_wal"* ]]; then
        printf '%s\n' '0/3000000'
      elif [[ "$*" == *"last_archived_time >"* ]]; then
        printf '%s\n' "${FAKE_WAL_ARCHIVED:-t}"
      elif [[ "$*" == *"pg_stat_archiver"* ]]; then
        printf '%s\n' "${FAKE_ARCHIVER_STATUS:-ok|12}"
      elif [[ "$*" == *"pg_ls_waldir"* ]]; then
        printf '%s\n' "${FAKE_WAL_DIR_BYTES:-1048576}"
      elif [[ "$*" == *"pg_stat_replication"* ]]; then
        printf '%s\n' "${FAKE_REPLICATION:-1|1024}"
      else
        exit 64
      fi
      ;;
    *)
      exit 64
      ;;
  esac
  exit 0
fi

if [[ "${1:-}" == "run" ]]; then
  if [[ "$*" == *"tar -C /source -czf /backup/api-files.tar.gz"* ]]; then
    if [[ "${FAKE_DOCKER_ARCHIVE_FAIL:-0}" == "1" ]]; then
      exit 42
    fi

    previous=""
    for argument in "$@"; do
      if [[ "$previous" == "-v" && "$argument" == *":/backup" ]]; then
        backup_dir="${argument%:/backup}"
        [[ "$(basename "$backup_dir")" == .partial-* ]] || exit 66
        [[ ! -e "$FAKE_EXPECTED_FINAL_DIR" ]] || exit 67
        printf '%s\n' 'fixture-api-files-archive' >"$backup_dir/api-files.tar.gz"
        exit 0
      fi
      previous="$argument"
    done
    exit 65
  fi

  if [[ "$*" == *"tar -tzf /backup/api-files.tar.gz"* || "$*" == *"tar -tzf /backup/basebackup.tar.gz"* ]]; then
    exit 0
  fi

  if [[ "$*" == *"tar -C /target -xzf /backup/basebackup.tar.gz"* ]]; then
    exit 0
  fi

  if [[ "$*" == *" -d "* || "${2:-}" == "-d" ]]; then
    printf '%s\n' 'fixture-restore-container-id'
    exit 0
  fi
fi

if [[ "${1:-}" == "exec" ]]; then
  if [[ "$*" == *"pg_is_in_recovery"* ]]; then
    printf '%s\n' "${FAKE_PITR_IN_RECOVERY:-f}"
    exit 0
  fi
  if [[ "$*" == *" pg_isready "* || "$*" == *" createdb "* ]]; then
    exit 0
  fi
  if [[ "$*" == *" pg_restore "* ]]; then
    cat >/dev/null
    exit 0
  fi
  if [[ "$*" == *" psql "* ]]; then
    printf '%s\n' '1'
    exit 0
  fi
fi

if [[ "${1:-}" == "rm" ]]; then
  exit 0
fi

exit 64
EOF

cat >"$FAKE_BIN/curl" <<'EOF'
#!/usr/bin/env bash
set -u

url="${!#}"
printf '%s\n' "$*" >>"$FAKE_CURL_LOG"

case "$url" in
  */health/live)
    printf '%s' 'Healthy'
    ;;
  */health/ready)
    if [[ "${FAKE_CURL_MODE:-success}" == "fail-ready" ]]; then
      exit 22
    fi
    printf '%s' 'Healthy'
    ;;
  */api/v1/ping)
    printf '%s' '{"status":"ok"}'
    ;;
  https://monitor.invalid/check|https://monitor.invalid/check/fail)
    ;;
  *)
    exit 22
    ;;
esac
EOF

chmod +x "$FAKE_BIN/docker" "$FAKE_BIN/curl" "$FAKE_BIN/flock" "$FAKE_BIN/sleep" "$FAKE_BIN/mountpoint"

run_backup() {
  local archive_failure="${1:-0}"
  local docker_mode="${2:-success}"
  local curl_mode="${3:-success}"
  local flock_failure="${4:-0}"
  local mirror_dir="${5:-}"
  local wal_archived="${6:-t}"
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  mkdir -p "$TMP_DIR/home/backups/vystaveno/wal-archive"
  env -i \
    HOME="$TMP_DIR/home" \
    FAKE_WAL_ARCHIVED="$wal_archived" \
    PATH="$FAKE_BIN:$PATH" \
    TMPDIR="$TMP_DIR" \
    FAKE_DOCKER_LOG="$DOCKER_LOG" \
    FAKE_CURL_LOG="$CURL_LOG" \
    FAKE_DOCKER_ARCHIVE_FAIL="$archive_failure" \
    FAKE_DOCKER_MODE="$docker_mode" \
    FAKE_CURL_MODE="$curl_mode" \
    FAKE_FLOCK_FAIL="$flock_failure" \
    FAKE_EXPECTED_FINAL_DIR="$backup_root/20260711T120000Z" \
    VYSTAVENO_PROJECT_DIR="$PROJECT_FIXTURE" \
    VYSTAVENO_OPS_ENV="$OPS_ENV_FIXTURE" \
    VYSTAVENO_BACKUP_TIMESTAMP="20260711T120000Z" \
    VYSTAVENO_BACKUP_MIN_FREE_BYTES=1 \
    VYSTAVENO_BACKUP_MIRROR_DIR="$mirror_dir" \
    bash "$OPS_DIR/vps-backup.sh"
}

run_health() {
  local mode="$1"
  local include_restore_stamp="${2:-1}"
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  local timestamp_dir="$backup_root/20260711T120000Z"
  rm -rf "$backup_root"
  mkdir -p "$timestamp_dir"
  printf '%s\n' 'BACKUP_FORMAT_VERSION=1' >"$timestamp_dir/manifest.env"
  ln -s "$(basename "$timestamp_dir")" "$backup_root/latest"
  if [[ "$include_restore_stamp" == "1" ]]; then
    printf 'COMPLETED_AT_EPOCH=%s\n' "$(date +%s)" >"$backup_root/.last-restore-check"
  fi
  env -i \
    HOME="$TMP_DIR/home" \
    PATH="$FAKE_BIN:$PATH" \
    TMPDIR="$TMP_DIR" \
    FAKE_CURL_LOG="$CURL_LOG" \
    FAKE_CURL_MODE="$mode" \
    VYSTAVENO_PROJECT_DIR="$PROJECT_FIXTURE" \
    VYSTAVENO_OPS_ENV="$OPS_ENV_FIXTURE" \
    VYSTAVENO_HEALTH_CHECK_COMPOSE=0 \
    VYSTAVENO_MIN_DISK_FREE_PERCENT=0 \
    bash "$OPS_DIR/vps-health-check.sh"
}

run_verify() {
  local in_recovery="${1:-f}"
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  local timestamp_dir="$backup_root/20260711T120000Z"
  rm -rf "$backup_root"
  mkdir -p "$timestamp_dir" "$TMP_DIR/home/backups/vystaveno/wal-archive"
  printf '%s\n' dump >"$timestamp_dir/database.dump"
  printf '%s\n' files >"$timestamp_dir/api-files.tar.gz"
  printf '%s\n' base >"$timestamp_dir/basebackup.tar.gz"
  printf 'BACKUP_FORMAT_VERSION=2\nPITR_TARGET_UTC=2026-07-11 12:00:00\n' >"$timestamp_dir/manifest.env"
  (cd "$timestamp_dir" && sha256sum database.dump api-files.tar.gz basebackup.tar.gz manifest.env >SHA256SUMS)
  ln -s "$(basename "$timestamp_dir")" "$backup_root/latest"
  env -i HOME="$TMP_DIR/home" PATH="$FAKE_BIN:$PATH" TMPDIR="$TMP_DIR" \
    FAKE_DOCKER_LOG="$DOCKER_LOG" FAKE_PITR_IN_RECOVERY="$in_recovery" \
    VYSTAVENO_PROJECT_DIR="$PROJECT_FIXTURE" \
    VYSTAVENO_OPS_ENV="$OPS_ENV_FIXTURE" bash "$OPS_DIR/vps-verify-backup.sh"
}

# Health se zapnutými kontrolami databáze (archivace WAL, velikost pg_wal, replikační zpoždění).
run_health_db() {
  local archiver="${1:-ok|12}"
  local wal_bytes="${2:-1048576}"
  local replication="${3:-1|1024}"
  local replica_enabled="${4:-1}"
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  local timestamp_dir="$backup_root/20260711T120000Z"
  rm -rf "$backup_root"
  mkdir -p "$timestamp_dir" "$TMP_DIR/home/backups/vystaveno/wal-archive"
  printf '%s\n' 'BACKUP_FORMAT_VERSION=2' >"$timestamp_dir/manifest.env"
  ln -s "$(basename "$timestamp_dir")" "$backup_root/latest"
  printf 'COMPLETED_AT_EPOCH=%s\n' "$(date +%s)" >"$backup_root/.last-restore-check"
  env -i \
    HOME="$TMP_DIR/home" \
    PATH="$FAKE_BIN:$PATH" \
    TMPDIR="$TMP_DIR" \
    FAKE_CURL_LOG="$CURL_LOG" \
    FAKE_DOCKER_LOG="$DOCKER_LOG" \
    FAKE_CURL_MODE=success \
    FAKE_DOCKER_ROOT="$TMP_DIR" \
    FAKE_ARCHIVER_STATUS="$archiver" \
    FAKE_WAL_DIR_BYTES="$wal_bytes" \
    FAKE_REPLICATION="$replication" \
    VYSTAVENO_PROJECT_DIR="$PROJECT_FIXTURE" \
    VYSTAVENO_OPS_ENV="$OPS_ENV_FIXTURE" \
    VYSTAVENO_REPLICA_ENABLED="$replica_enabled" \
    VYSTAVENO_MIN_DISK_FREE_PERCENT=0 \
    bash "$OPS_DIR/vps-health-check.sh"
}

test_backup_success() {
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  local final_dir="$backup_root/20260711T120000Z"
  : >"$DOCKER_LOG"

  if ! run_backup 0 >"$TMP_DIR/backup-success.out" 2>&1; then
    cat "$TMP_DIR/backup-success.out" >&2
    fail "successful backup scenario failed"
  fi

  if [[ ! -d "$final_dir" ]]; then
    cat "$TMP_DIR/backup-success.out" >&2
    find "$TMP_DIR/home" -maxdepth 6 -print >&2
    fail "successful backup has no final directory"
  fi
  assert_file "$final_dir/database.dump"
  assert_file "$final_dir/api-files.tar.gz"
  assert_file "$final_dir/manifest.env"
  assert_file "$final_dir/SHA256SUMS"
  assert_contains "$final_dir/manifest.env" 'CREATED_AT_UTC=20260711T120000Z'
  (cd "$final_dir" && sha256sum --check SHA256SUMS >/dev/null)
  [[ -L "$backup_root/latest" ]] || fail "latest is not a symlink"
  [[ "$(readlink "$backup_root/latest")" == "20260711T120000Z" ]] || fail "latest points to the wrong backup"
  ! find "$backup_root" -maxdepth 1 -type d -name '.partial-*' | grep -q . || fail "successful backup left a partial directory"
  assert_count 1 ' stop -t 30 api' "$DOCKER_LOG"
  assert_count 1 ' start api' "$DOCKER_LOG"

  # PITR: fyzická base záloha + zafixovaný cíl obnovy. Bez obojího by šlo obnovit jen na noční snapshot.
  assert_file "$final_dir/basebackup.tar.gz"
  assert_contains "$final_dir/manifest.env" 'PITR_TARGET_UTC=2026-07-11 12:00:00'
  assert_contains "$DOCKER_LOG" 'pg_basebackup'
  assert_contains "$DOCKER_LOG" 'pg_switch_wal'
}

test_backup_requires_archived_wal() {
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  rm -rf "$backup_root"
  : >"$DOCKER_LOG"

  if run_backup 0 success success 0 '' f >"$TMP_DIR/wal-failure.out" 2>&1; then
    fail "backup unexpectedly succeeded when WAL was not archived"
  fi
  assert_contains "$TMP_DIR/wal-failure.out" 'WAL se nedoarchivoval'
  [[ ! -e "$backup_root/20260711T120000Z" ]] || fail "unarchived WAL published a backup"
}

test_backup_archive_failure() {
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  rm -rf "$backup_root"
  : >"$DOCKER_LOG"

  if run_backup 1 >"$TMP_DIR/backup-failure.out" 2>&1; then
    fail "backup unexpectedly succeeded when archive creation failed"
  fi

  [[ ! -e "$backup_root/20260711T120000Z" ]] || fail "failed backup published a final directory"
  ! find "$backup_root" -maxdepth 1 -type d -name '.partial-*' | grep -q . || fail "failed backup left a partial directory"
  assert_count 1 ' stop -t 30 api' "$DOCKER_LOG"
  assert_count 1 ' start api' "$DOCKER_LOG"
}

test_backup_mirror_copy() {
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  local mirror="$TMP_DIR/offsite-mirror"
  rm -rf "$backup_root" "$mirror"
  mkdir -p "$mirror"
  : >"$DOCKER_LOG"

  if ! run_backup 0 success success 0 "$mirror" >"$TMP_DIR/mirror-success.out" 2>&1; then
    cat "$TMP_DIR/mirror-success.out" >&2
    fail "backup with mounted mirror failed"
  fi
  assert_file "$mirror/20260711T120000Z/database.dump"
  assert_file "$mirror/20260711T120000Z/api-files.tar.gz"
  [[ -L "$mirror/latest" ]] || fail "mirror latest is not a symlink"
  (cd "$mirror/20260711T120000Z" && sha256sum --check SHA256SUMS >/dev/null)
}

test_backup_dump_failure() {
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  rm -rf "$backup_root"
  : >"$DOCKER_LOG"

  if run_backup 0 dump-fail >"$TMP_DIR/dump-failure.out" 2>&1; then
    fail "backup unexpectedly succeeded when pg_dump failed"
  fi
  [[ ! -e "$backup_root/20260711T120000Z" ]] || fail "failed dump published a backup"
  assert_count 1 ' start api' "$DOCKER_LOG"
}

test_backup_stop_failure() {
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  rm -rf "$backup_root"
  : >"$DOCKER_LOG"

  if run_backup 0 stop-fail >"$TMP_DIR/stop-failure.out" 2>&1; then
    fail "backup unexpectedly succeeded when API stop failed"
  fi
  [[ ! -e "$backup_root/20260711T120000Z" ]] || fail "stop failure published a backup"
  assert_count 1 ' start api' "$DOCKER_LOG"
}

test_backup_readiness_failure() {
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  rm -rf "$backup_root"
  : >"$DOCKER_LOG"

  if run_backup 0 success fail-ready >"$TMP_DIR/readiness-failure.out" 2>&1; then
    fail "backup unexpectedly succeeded when API readiness failed"
  fi
  [[ ! -e "$backup_root/20260711T120000Z" ]] || fail "readiness failure published a backup"
  assert_contains "$TMP_DIR/readiness-failure.out" 'API po snapshotu nenaběhlo'
  assert_count 2 ' start api' "$DOCKER_LOG"
}

test_backup_lock_failure() {
  local backup_root="$TMP_DIR/home/backups/vystaveno/automatic"
  rm -rf "$backup_root"
  : >"$DOCKER_LOG"

  if run_backup 0 success success 1 >"$TMP_DIR/lock-failure.out" 2>&1; then
    fail "backup unexpectedly ignored an occupied lock"
  fi
  assert_contains "$TMP_DIR/lock-failure.out" 'Jiná záloha nebo deploy už běží'
  [[ ! -e "$backup_root/20260711T120000Z" ]] || fail "locked backup published data"
  [[ ! -s "$DOCKER_LOG" ]] || fail "locked backup reached Docker"
}

test_config_is_not_executed() {
  local unsafe_env="$TMP_DIR/fixtures/unsafe.env"
  local marker="$TMP_DIR/config-was-executed"
  cat >"$unsafe_env" <<EOF
VYSTAVENO_BASE_URL=https://fixture.invalid
EVIL=\$(touch $marker)
EOF
  chmod 600 "$unsafe_env"

  if env -i HOME="$TMP_DIR/home" PATH="$FAKE_BIN:$PATH" VYSTAVENO_PROJECT_DIR="$PROJECT_FIXTURE" \
    VYSTAVENO_OPS_ENV="$unsafe_env" bash "$OPS_DIR/vps-health-check.sh" >"$TMP_DIR/unsafe-config.out" 2>&1; then
    fail "unsafe config unexpectedly passed validation"
  fi
  [[ ! -e "$marker" ]] || fail "configuration was executed as shell code"
  assert_contains "$TMP_DIR/unsafe-config.out" 'Nepovolený klíč EVIL'
}

test_health_success() {
  : >"$CURL_LOG"
  if ! run_health success >"$TMP_DIR/health-success.out" 2>&1; then
    cat "$TMP_DIR/health-success.out" >&2
    fail "successful health scenario failed"
  fi

  assert_contains "$CURL_LOG" 'https://fixture.invalid/health/live'
  assert_contains "$CURL_LOG" 'https://fixture.invalid/health/ready'
  assert_contains "$CURL_LOG" 'https://fixture.invalid/api/v1/ping'
  assert_contains "$CURL_LOG" 'https://monitor.invalid/check'
  assert_contains "$TMP_DIR/health-success.out" 'Health check prošel: https://fixture.invalid'
}

test_health_failure() {
  : >"$CURL_LOG"
  if run_health fail-ready >"$TMP_DIR/health-failure.out" 2>&1; then
    fail "health check unexpectedly succeeded when readiness failed"
  fi

  assert_contains "$TMP_DIR/health-failure.out" 'health/ready je nedostupný'
  assert_contains "$CURL_LOG" 'https://monitor.invalid/check/fail'
  assert_count 0 'https://fixture.invalid/api/v1/ping' "$CURL_LOG"
}

test_restore_check_records_success() {
  local stamp="$TMP_DIR/home/backups/vystaveno/automatic/.last-restore-check"
  : >"$DOCKER_LOG"
  if ! run_verify >"$TMP_DIR/restore-success.out" 2>&1; then
    cat "$TMP_DIR/restore-success.out" >&2
    fail "restore-check scenario failed"
  fi
  assert_file "$stamp"
  assert_contains "$stamp" 'COMPLETED_AT_EPOCH='
  assert_contains "$TMP_DIR/restore-success.out" 'Obnova prošla v izolaci'
  assert_contains "$DOCKER_LOG" '--network none'
  assert_contains "$DOCKER_LOG" '--memory 1536m'
}

test_restore_check_recovers_to_target_time() {
  local stamp="$TMP_DIR/home/backups/vystaveno/automatic/.last-restore-check"
  : >"$DOCKER_LOG"
  if ! run_verify >"$TMP_DIR/pitr-success.out" 2>&1; then
    cat "$TMP_DIR/pitr-success.out" >&2
    fail "PITR restore-check scenario failed"
  fi
  assert_contains "$TMP_DIR/pitr-success.out" 'Obnova na konkrétní čas prošla'
  assert_contains "$stamp" 'PITR_VERIFIED_TARGET=2026-07-11 12:00:00'
  # Obnova musí běžet z fyzické base zálohy a číst WAL archiv jen pro čtení.
  assert_contains "$DOCKER_LOG" 'tar -C /target -xzf /backup/basebackup.tar.gz'
  assert_contains "$DOCKER_LOG" '/var/lib/vystaveno/wal-archive:ro'
}

test_restore_check_fails_without_promote() {
  : >"$DOCKER_LOG"
  if run_verify t >"$TMP_DIR/pitr-stuck.out" 2>&1; then
    fail "restore-check unexpectedly passed while recovery never promoted"
  fi
  assert_contains "$TMP_DIR/pitr-stuck.out" 'nedoběhla do povýšení clusteru'
  [[ ! -f "$TMP_DIR/home/backups/vystaveno/automatic/.last-restore-check" ]] ||
    fail "failed PITR check recorded a successful restore marker"
}

test_health_reports_wal_and_replication() {
  if ! run_health_db >"$TMP_DIR/health-db.out" 2>&1; then
    cat "$TMP_DIR/health-db.out" >&2
    fail "health with database checks failed"
  fi
  assert_contains "$TMP_DIR/health-db.out" 'Replika je připojená, replikační zpoždění 1024 B'

  if run_health_db 'failing|12' >"$TMP_DIR/health-archiver.out" 2>&1; then
    fail "health unexpectedly passed while WAL archiving was failing"
  fi
  assert_contains "$TMP_DIR/health-archiver.out" 'Archivace WAL selhává'

  if run_health_db 'ok|12' 9999999999 >"$TMP_DIR/health-walsize.out" 2>&1; then
    fail "health unexpectedly passed while pg_wal was over the limit"
  fi
  assert_contains "$TMP_DIR/health-walsize.out" 'Adresář pg_wal narostl nad limit'

  if run_health_db 'ok|12' 1048576 '0|0' >"$TMP_DIR/health-replica.out" 2>&1; then
    fail "health unexpectedly passed without a connected replica"
  fi
  assert_contains "$TMP_DIR/health-replica.out" 'Hot standby replika není připojená'

  if run_health_db 'ok|12' 1048576 '1|999999999' >"$TMP_DIR/health-lag.out" 2>&1; then
    fail "health unexpectedly passed with replication lag over the limit"
  fi
  assert_contains "$TMP_DIR/health-lag.out" 'Replikační zpoždění překročilo limit'

  # Bez repliky se replikace nehlídá — jinak by každá instalace bez standby hlásila chybu.
  if ! run_health_db 'ok|12' 1048576 '0|0' 0 >"$TMP_DIR/health-noreplica.out" 2>&1; then
    cat "$TMP_DIR/health-noreplica.out" >&2
    fail "health failed on an installation without a replica"
  fi
}

test_health_requires_restore_check() {
  if run_health success 0 >"$TMP_DIR/health-no-restore.out" 2>&1; then
    fail "health unexpectedly passed without restore-check marker"
  fi
  assert_contains "$TMP_DIR/health-no-restore.out" 'Chybí úspěšný restore-check zálohy'
}

test_backup_success
printf 'ok - successful backup is complete and atomic\n'
test_backup_requires_archived_wal
printf 'ok - backup without archived WAL is not published\n'
test_backup_archive_failure
printf 'ok - archive failure restarts API and is not published\n'
test_backup_mirror_copy
printf 'ok - mounted mirror receives a verified atomic copy\n'
test_backup_dump_failure
printf 'ok - dump failure restarts API and is not published\n'
test_backup_stop_failure
printf 'ok - stop failure attempts recovery and is not published\n'
test_backup_readiness_failure
printf 'ok - readiness failure remains unpublished\n'
test_backup_lock_failure
printf 'ok - occupied lock blocks backup\n'
test_config_is_not_executed
printf 'ok - ops config is parsed, never executed\n'
test_restore_check_records_success
printf 'ok - isolated restore-check records monitored success\n'
test_restore_check_recovers_to_target_time
printf 'ok - restore-check proves recovery to a concrete point in time\n'
test_restore_check_fails_without_promote
printf 'ok - restore-check fails when recovery never reaches the target\n'
test_health_reports_wal_and_replication
printf 'ok - health reports WAL archiving, pg_wal size and replication lag\n'
test_health_success
printf 'ok - health check success\n'
test_health_failure
printf 'ok - health check failure\n'
test_health_requires_restore_check
printf 'ok - health requires a recent restore-check\n'
printf 'All VPS reliability tests passed.\n'

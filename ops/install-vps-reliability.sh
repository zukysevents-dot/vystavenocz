#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/vps-common.sh
source "$SCRIPT_DIR/lib/vps-common.sh"

require_command crontab
require_command docker
require_command flock
require_command curl

CRON_START='# BEGIN VYSTAVENO RELIABILITY V1'
CRON_END='# END VYSTAVENO RELIABILITY V1'

[[ "$SCRIPT_DIR" =~ ^/[A-Za-z0-9._/-]+$ && "$OPS_LOG_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] ||
  die "Cesty pro cron smějí obsahovat jen bezpečné znaky bez mezer a %."
[[ "$SCRIPT_DIR" != *%* && "$OPS_LOG_DIR" != *%* ]] || die "Znak % není v cron cestě povolen."

prepare_backup_root
mkdir -p "$OPS_LOG_DIR"
chmod 700 "$OPS_LOG_DIR"

if [[ ! -e "$OPS_ENV" ]]; then
  domain="$(read_domain || true)"
  env_tmp="$(mktemp "$PROJECT_DIR/.ops.env.tmp.XXXXXX")"
  trap 'rm -f "${env_tmp:-}"' EXIT
  chmod 600 "$env_tmp"
  cat >"$env_tmp" <<EOF
VYSTAVENO_BASE_URL=https://${domain:-vystaveno.cz}
VYSTAVENO_BACKUP_RETENTION_DAYS=14
VYSTAVENO_MAX_BACKUP_AGE_SECONDS=108000
VYSTAVENO_MAX_RESTORE_CHECK_AGE_SECONDS=691200
VYSTAVENO_MIN_DISK_FREE_PERCENT=10
# Volitelné: Healthchecks.io nebo kompatibilní ping URL.
VYSTAVENO_MONITOR_PING_URL=
# Volitelné: už připojený samostatný šifrovaný off-site mount.
VYSTAVENO_BACKUP_MIRROR_DIR=
EOF
  mv "$env_tmp" "$OPS_ENV"
  trap - EXIT
fi
[[ -f "$OPS_ENV" && ! -L "$OPS_ENV" ]] || die "$OPS_ENV musí být běžný soubor."
chmod 600 "$OPS_ENV"
load_ops_config

docker pull "$HELPER_IMAGE" >/dev/null
docker pull "$RESTORE_POSTGRES_IMAGE" >/dev/null

current_cron="$(mktemp)"
new_cron="$(mktemp)"
trap 'rm -f "$current_cron" "$new_cron"' EXIT
crontab -l >"$current_cron" 2>/dev/null || true
awk -v start="$CRON_START" -v end="$CRON_END" '
  $0 == start { skip=1; next }
  $0 == end { skip=0; next }
  !skip { print }
' "$current_cron" >"$new_cron"

cat >>"$new_cron" <<EOF
$CRON_START
CRON_TZ=UTC
*/5 * * * * $SCRIPT_DIR/vps-health-check.sh >> $OPS_LOG_DIR/health.log 2>&1
30 2 * * * $SCRIPT_DIR/vps-backup.sh >> $OPS_LOG_DIR/backup.log 2>&1
15 4 * * 0 $SCRIPT_DIR/vps-verify-backup.sh >> $OPS_LOG_DIR/restore-check.log 2>&1
$CRON_END
EOF
crontab "$new_cron"

log "Reliability cron je nainstalovaný. Konfigurace: $OPS_ENV"
log "Denní backup 02:30 UTC, health každých 5 minut, restore-check v neděli 04:15 UTC."

#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/vps-common.sh
source "$SCRIPT_DIR/lib/vps-common.sh"

require_command docker
require_command flock
require_command git
require_command curl

BACKEND_DIR="$PROJECT_DIR/../vystaveno-api"
domain="${VYSTAVENO_DOMAIN:-$(read_domain || true)}"
BASE_URL="${VYSTAVENO_BASE_URL:-${domain:+https://$domain}}"
IPV6_CHANGED=0
IPV6_ORIGINAL=''
DEPLOY_SUCCEEDED=0

[[ -d "$BACKEND_DIR/.git" ]] || die "Backend repo není vedle frontendu: $BACKEND_DIR"
[[ -n "$BASE_URL" ]] || die "Nastav VYSTAVENO_BASE_URL nebo DOMAIN v .env."
acquire_ops_lock
mkdir -p "$OPS_LOG_DIR"
chmod 700 "$OPS_LOG_DIR"

for repo in "$PROJECT_DIR" "$BACKEND_DIR"; do
  git -C "$repo" diff --quiet || die "Repo $repo má necommitnuté trackované změny."
  git -C "$repo" diff --cached --quiet || die "Repo $repo má staged změny."
done

old_frontend="$(git -C "$PROJECT_DIR" rev-parse HEAD)"
old_backend="$(git -C "$BACKEND_DIR" rev-parse HEAD)"
old_images="$(compose images --quiet 2>/dev/null | sort -u | tr '\n' ' ')"
deploy_record="$OPS_LOG_DIR/deploy-$(date -u +'%Y%m%dT%H%M%SZ').env"

restore_ipv6() {
  if [[ "$IPV6_CHANGED" == "1" && -n "$IPV6_ORIGINAL" ]]; then
    sudo sysctl -w "net.ipv6.conf.all.disable_ipv6=$IPV6_ORIGINAL" >/dev/null || true
    IPV6_CHANGED=0
  fi
}

finish_deploy() {
  local rc=$?
  trap - EXIT INT TERM
  restore_ipv6
  {
    printf 'COMPLETED_AT_UTC=%s\n' "$(date -u +'%Y%m%dT%H%M%SZ')"
    printf 'STATUS=%s\n' "$([[ "$DEPLOY_SUCCEEDED" == "1" ]] && printf success || printf failed)"
    printf 'EXIT_CODE=%s\n' "$rc"
    printf 'OLD_FRONTEND_COMMIT=%s\n' "$old_frontend"
    printf 'OLD_BACKEND_COMMIT=%s\n' "$old_backend"
    printf 'NEW_FRONTEND_COMMIT=%s\n' "$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || printf unknown)"
    printf 'NEW_BACKEND_COMMIT=%s\n' "$(git -C "$BACKEND_DIR" rev-parse HEAD 2>/dev/null || printf unknown)"
    printf 'OLD_IMAGE_IDS=%q\n' "$old_images"
    printf 'NEW_IMAGE_IDS=%q\n' "$(compose images --quiet 2>/dev/null | sort -u | tr '\n' ' ')"
  } >"$deploy_record"
  chmod 600 "$deploy_record"
  exit "$rc"
}
trap finish_deploy EXIT INT TERM

log "Vytvářím konzistentní pre-deploy zálohu."
"$SCRIPT_DIR/vps-backup.sh"
log "Provádím skutečný izolovaný restore-check pre-deploy zálohy."
"$SCRIPT_DIR/vps-verify-backup.sh" "$BACKUP_ROOT/latest"

log "Stahuji pouze fast-forward změny z main."
git -C "$BACKEND_DIR" pull --ff-only origin main
git -C "$PROJECT_DIR" pull --ff-only origin main

if sudo -n true >/dev/null 2>&1; then
  IPV6_ORIGINAL="$(sysctl -n net.ipv6.conf.all.disable_ipv6 2>/dev/null || true)"
  if [[ "$IPV6_ORIGINAL" =~ ^[01]$ ]]; then
    sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null
    IPV6_CHANGED=1
  fi
fi

log "Sestavuji a spouštím produkční stack."
compose up -d --build
restore_ipv6

ready=0
for _ in $(seq 1 45); do
  if [[ "$(curl -fsS --max-time 5 "$BASE_URL/health/ready" 2>/dev/null || true)" == "Healthy" ]]; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" != "1" ]]; then
  log "Předchozí frontend commit: $old_frontend" >&2
  log "Předchozí backend commit: $old_backend" >&2
  die "Deploy nenaběhl do ready stavu. Nevracej DB naslepo; pokračuj recovery runbookem."
fi

"$SCRIPT_DIR/vps-health-check.sh"
DEPLOY_SUCCEEDED=1
log "Deploy je hotový a zdravý. Záznam: $deploy_record"

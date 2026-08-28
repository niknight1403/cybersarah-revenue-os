#!/usr/bin/env bash
set -Eeuo pipefail

# Read-only healthcheck for CyberSarah services after SSH login.
# No environment files, credentials, response bodies, or secret values are read.

failures=0

pass() { printf 'OK   %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1"; failures=$((failures + 1)); }

check_systemd() {
  local unit="$1"
  if systemctl is-active --quiet "$unit"; then
    pass "systemd:$unit active"
  else
    fail "systemd:$unit inactive"
  fi
}

check_port() {
  local port="$1"
  if ss -H -ltn | awk -v p=":$port" '$4 ~ p"$" { found=1 } END { exit(found ? 0 : 1) }'; then
    pass "tcp:$port listening"
  else
    fail "tcp:$port not listening"
  fi
}

check_http() {
  local url="$1"
  local code
  code="$(curl -kLsS --max-time 8 -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    pass "http:$url -> 200"
  else
    fail "http:$url -> ${code:-unreachable}"
  fi
}

printf '%s\n' "CYBERSARAH_HEALTHCHECK host=$(hostname -s)"
printf '%s\n' '--- systemd ---'
systemd_units="${HEALTHCHECK_SYSTEMD_UNITS:-pm2-cybersarah.service cybersarah-peer.service cybersarah-disk-check-ntfy.timer nginx}"
for unit in $systemd_units; do
  check_systemd "$unit"
done

printf '%s\n' '--- ports ---'
ports="${HEALTHCHECK_PORTS:-80 443 3000}"
for port in $ports; do
  check_port "$port"
done

printf '%s\n' '--- http ---'
urls="${HEALTHCHECK_URLS:-http://127.0.0.1:3000/api/healthz http://127.0.0.1:3000/healthz https://127.0.0.1/healthz}"
for url in $urls; do
  check_http "$url"
done

printf 'HEALTHCHECK_STATUS=%s\n' "$([[ "$failures" -eq 0 ]] && echo PASS || echo FAIL)"
exit "$failures"

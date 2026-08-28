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

check_tls_certificate() {
  local domain="$1"
  local minimum_days="${HEALTHCHECK_TLS_MIN_DAYS:-14}"
  local certificate_file end_date end_epoch now_epoch remaining_days
  certificate_file="$(mktemp)"
  trap 'rm -f "$certificate_file"' RETURN

  if ! timeout 12 openssl s_client -connect "$domain:443" -servername "$domain" -verify_hostname "$domain" -verify_return_error </dev/null 2>/dev/null | openssl x509 -outform PEM >"$certificate_file" 2>/dev/null; then
    fail "tls:$domain certificate/hostname verification failed"
    return
  fi

  end_date="$(openssl x509 -in "$certificate_file" -noout -enddate 2>/dev/null | cut -d= -f2-)"
  if [[ -z "$end_date" ]] || ! end_epoch="$(date -d "$end_date" +%s 2>/dev/null)"; then
    fail "tls:$domain expiry date unreadable"
    return
  fi

  now_epoch="$(date +%s)"
  remaining_days=$(( (end_epoch - now_epoch) / 86400 ))
  if (( remaining_days < minimum_days )); then
    fail "tls:$domain expires in ${remaining_days}d (minimum ${minimum_days}d)"
  else
    pass "tls:$domain valid; expires ${end_date}; ${remaining_days}d remaining"
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

printf '%s\n' '--- public tls ---'
public_domains="${HEALTHCHECK_PUBLIC_DOMAINS:-}"
if [[ -z "$public_domains" ]]; then
  fail 'tls:HEALTHCHECK_PUBLIC_DOMAINS not configured'
else
  for domain in $public_domains; do
    check_tls_certificate "$domain"
  done
fi

printf 'HEALTHCHECK_STATUS=%s\n' "$([[ "$failures" -eq 0 ]] && echo PASS || echo FAIL)"
exit "$failures"

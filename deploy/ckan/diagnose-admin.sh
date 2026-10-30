#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.ckan}"
CKAN_CONTAINER="${CKAN_CONTAINER:-upstream-ckan-1}"
NGINX_CONTAINER="${NGINX_CONTAINER:-upstream-nginx-1}"
CADDY_CONTAINER="${CADDY_CONTAINER:-upstream-edge-tunnel-1}"
CLOUDFLARED_CONTAINER="${CLOUDFLARED_CONTAINER:-upstream-cloudflared-1}"
if [[ -z "${CKAN_HOST:-}" && -f "$ENV_FILE" ]]; then
  CKAN_HOST="$(python3 - "$ENV_FILE" <<'PYENV'
from pathlib import Path
import re, sys
for line in Path(sys.argv[1]).read_text().splitlines():
    match = re.match(r'^CKAN_HOST=(.*)$', line)
    if match:
        print(match.group(1).strip().strip('"').strip("'"))
        break
PYENV
)"
fi
CKAN_HOST="${CKAN_HOST:-ckan.wajokab.go.id}"

for name in "$CKAN_CONTAINER" "$NGINX_CONTAINER" "$CADDY_CONTAINER" "$CLOUDFLARED_CONTAINER"; do
  if ! docker inspect "$name" >/dev/null 2>&1; then
    printf 'Container tidak ditemukan: %s\n' "$name"
  fi
done

printf '\n== CKAN status ==\n'
docker inspect "$CKAN_CONTAINER" --format 'state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}not-configured{{end}}' 2>&1 || true

printf '\n== CKAN direct endpoint probes (inside CKAN container) ==\n'
docker exec -i -e "CKAN_HOST=$CKAN_HOST" "$CKAN_CONTAINER" python - <<'PY'
import os
import urllib.error
import urllib.request

admin_host = os.environ["CKAN_HOST"]
probes = (
    ("/user/login", {200, 302}, "login harus dapat dirender sebelum autentikasi"),
    ("/dashboard/datasets", {302}, "dashboard anonim harus dialihkan ke login"),
    ("/api/action/status_show", {401}, "Action API pada hostname admin harus menolak sesi anonim"),
)
for path, expected, purpose in probes:
    url = "http://127.0.0.1:5000" + path
    req = urllib.request.Request(url, headers={"Host": admin_host, "X-Forwarded-Host": admin_host, "X-Forwarded-Proto": "https"})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            status = response.status
            body = response.read(900).decode("utf-8", "replace").replace("\n", " ")
    except urllib.error.HTTPError as error:
        status = error.code
        body = error.read(900).decode("utf-8", "replace").replace("\n", " ")
    except Exception as error:
        print(f"{path}: ERROR {type(error).__name__}: {error} ({purpose})")
        continue
    marker = "EXPECTED" if status in expected else "UNEXPECTED"
    print(f"{path}: HTTP {status} [{marker}]; {purpose}; {body[:500]}")
PY

printf '\n== Recent CKAN errors ==\n'
docker logs --since=15m "$CKAN_CONTAINER" 2>&1 | grep -Ei 'error|exception|traceback|jinja|500|failed' | tail -80 || true

printf '\n== Recent Nginx errors ==\n'
docker logs --since=15m "$NGINX_CONTAINER" 2>&1 | grep -Ei 'error|exception|upstream| 500 |failed|timed out' | tail -60 || true

printf '\n== Recent Caddy logs ==\n'
docker logs --since=15m "$CADDY_CONTAINER" 2>&1 | tail -60 || true

printf '\n== Recent Cloudflared logs ==\n'
docker logs --since=15m "$CLOUDFLARED_CONTAINER" 2>&1 | tail -40 || true

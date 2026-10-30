#!/usr/bin/env bash
set -euo pipefail

CKAN_CONTAINER="${CKAN_CONTAINER:-upstream-ckan-1}"
NGINX_CONTAINER="${NGINX_CONTAINER:-upstream-nginx-1}"
CADDY_CONTAINER="${CADDY_CONTAINER:-upstream-edge-tunnel-1}"
CLOUDFLARED_CONTAINER="${CLOUDFLARED_CONTAINER:-upstream-cloudflared-1}"

for name in "$CKAN_CONTAINER" "$NGINX_CONTAINER" "$CADDY_CONTAINER" "$CLOUDFLARED_CONTAINER"; do
  if ! docker inspect "$name" >/dev/null 2>&1; then
    printf 'Container tidak ditemukan: %s\n' "$name"
  fi
done

printf '\n== CKAN status ==\n'
docker inspect "$CKAN_CONTAINER" --format 'state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}not-configured{{end}}' 2>&1 || true

printf '\n== CKAN direct endpoint probes (inside CKAN container) ==\n'
docker exec -i "$CKAN_CONTAINER" python - <<'PY'
import urllib.error
import urllib.request

for path in ("/api/action/status_show", "/user/login", "/dashboard/datasets"):
    url = "http://127.0.0.1:5000" + path
    request = urllib.request.Request(url, headers={"Host": "ckan.silirdev.com", "X-Forwarded-Proto": "https"})
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            body = response.read(900).decode("utf-8", "replace").replace("\n", " ")
            print(f"{path}: HTTP {response.status}; {body[:500]}")
    except urllib.error.HTTPError as error:
        body = error.read(900).decode("utf-8", "replace").replace("\n", " ")
        print(f"{path}: HTTP {error.code}; {body[:700]}")
    except Exception as error:
        print(f"{path}: ERROR {type(error).__name__}: {error}")
PY

printf '\n== Recent CKAN errors ==\n'
docker logs --since=15m "$CKAN_CONTAINER" 2>&1 | grep -Ei 'error|exception|traceback|jinja|500|failed' | tail -80 || true

printf '\n== Recent Nginx errors ==\n'
docker logs --since=15m "$NGINX_CONTAINER" 2>&1 | grep -Ei 'error|exception|upstream| 500 |failed|timed out' | tail -60 || true

printf '\n== Recent Caddy logs ==\n'
docker logs --since=15m "$CADDY_CONTAINER" 2>&1 | tail -60 || true

printf '\n== Recent Cloudflared logs ==\n'
docker logs --since=15m "$CLOUDFLARED_CONTAINER" 2>&1 | tail -40 || true

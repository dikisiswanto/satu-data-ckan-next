#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-}"
case "$PROFILE" in
  manual|cloudflare|cloudflare-access) ;;
  -h|--help|help)
    cat <<'USAGE'
Validasi CKAN dan invalidasi cache portal Next.js secara manual.

Penggunaan:
  bash ./deploy/ckan/revalidate-public-cache.sh cloudflare
  bash ./deploy/ckan/revalidate-public-cache.sh manual
  bash ./deploy/ckan/revalidate-public-cache.sh cloudflare-access

Memerlukan CKAN dan Next.js yang berjalan pada jaringan Compose serta rahasia
CKAN_REVALIDATE_SECRET yang sama di service CKAN dan Next.js.
USAGE
    exit 0
    ;;
  *) echo "Profil wajib manual, cloudflare, atau cloudflare-access." >&2; exit 2 ;;
esac

bash "$ROOT/deploy/ckan/compose.sh" "$PROFILE" exec -T ckan python3 - <<'PY'
import hashlib
import hmac
import json
import os
import time
import urllib.request
import uuid

base = "http://127.0.0.1:5000/api/3/action/"
for action in ("status_show", "package_search?q=%2A%3A%2A&rows=0&start=0"):
    with urllib.request.urlopen(base + action, timeout=8) as response:
        payload = json.load(response)
    if payload.get("success") is not True:
        raise SystemExit("Validasi CKAN gagal pada action: " + action.split("?", 1)[0])

url = os.environ.get("CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_URL", "").strip()
secret = os.environ.get("CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_SECRET", "").strip()
if not url or len(secret) < 32:
    raise SystemExit("URL webhook atau rahasia invalidasi belum dikonfigurasi pada container CKAN.")

timestamp = str(int(time.time()))
body = json.dumps({
    "event": "manual.revalidate",
    "event_id": uuid.uuid4().hex,
    "reason": "operator_requested",
}, separators=(",", ":"), sort_keys=True).encode("utf-8")
signature = hmac.new(secret.encode("utf-8"), timestamp.encode("ascii") + b"." + body, hashlib.sha256).hexdigest()
request = urllib.request.Request(
    url,
    data=body,
    headers={
        "Content-Type": "application/json",
        "X-Wajo-Timestamp": timestamp,
        "X-Wajo-Signature": "sha256=" + signature,
    },
    method="POST",
)
with urllib.request.urlopen(request, timeout=8) as response:
    result = json.load(response)
if result.get("success") is not True or result.get("revalidated") is not True:
    raise SystemExit("Portal publik menolak permintaan invalidasi cache.")
print("CKAN status_show: PASS")
print("CKAN package_search: PASS")
print("Next.js cache invalidation: PASS")
PY

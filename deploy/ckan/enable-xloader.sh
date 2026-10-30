#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/.env.ckan"

usage() {
  cat <<'USAGE'
Buat/sinkronkan token API XLoader setelah CKAN pertama kali sehat.

Penggunaan:
  ./deploy/ckan/enable-xloader.sh manual
  ./deploy/ckan/enable-xloader.sh cloudflare
  ./deploy/ckan/enable-xloader.sh cloudflare-access

Token disimpan hanya di .env.ckan (permission 600), tidak ditampilkan.
USAGE
}

if [[ $# -ne 1 ]]; then usage; exit 2; fi
PROFILE="$1"
case "$PROFILE" in
  manual|cloudflare|cloudflare-access) ;;
  -h|--help|help) usage; exit 0 ;;
  *) echo "Profil tidak valid: $PROFILE (pilih manual, cloudflare, atau cloudflare-access)." >&2; usage; exit 2 ;;
esac
[[ -f "$ENV_FILE" ]] || { echo "File .env.ckan belum ada; jalankan bootstrap terlebih dahulu." >&2; exit 2; }

read_env() {
  python3 - "$ENV_FILE" "$1" <<'PY'
from pathlib import Path
import re, sys
path, wanted = Path(sys.argv[1]), sys.argv[2]
for line in path.read_text().splitlines():
    match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
    if match and match.group(1) == wanted:
        print(match.group(2).strip().strip('"').strip("'"))
        break
PY
}

SYSADMIN="$(read_env CKAN_SYSADMIN_NAME)"
SYSADMIN="${SYSADMIN:-ckan_admin}"
TOKEN="$(read_env CKANEXT__XLOADER__API_TOKEN)"
if [[ -z "$TOKEN" || "$TOKEN" == "NOT_SET" ]]; then
  echo "Membuat token XLoader melalui CKAN CLI (token tidak akan ditampilkan)..."
  # compose.sh also emits synchronization logs. Capture output and use only the
  # last non-empty CLI line; do not print the captured value to the terminal.
  TOKEN_OUTPUT="$("$ROOT/deploy/ckan/compose.sh" "$PROFILE" exec -T ckan \
    ckan -c /srv/app/ckan.ini user token add "$SYSADMIN" xloader -q)"
  TOKEN="$(printf '%s\n' "$TOKEN_OUTPUT" | awk 'NF { value=$NF } END { print value }' | tr -d '\r\t')"
  unset TOKEN_OUTPUT
  if [[ ! "$TOKEN" =~ ^[A-Za-z0-9._~-]{30,}$ ]]; then
    echo "Gagal membaca token XLoader dari CKAN CLI. Pastikan CKAN sehat dan pengguna sysadmin '$SYSADMIN' sudah tersedia; tidak ada token yang ditulis." >&2
    exit 3
  fi
  python3 - "$ENV_FILE" "$TOKEN" <<'PY'
from pathlib import Path
import re, sys
path, token = Path(sys.argv[1]), sys.argv[2]
key = "CKANEXT__XLOADER__API_TOKEN"
lines = path.read_text().splitlines()
written, output = False, []
for line in lines:
    match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=', line)
    if match and match.group(1) == key:
        if not written:
            output.append(f"{key}={token}")
            written = True
    else:
        output.append(line)
if not written:
    output.append(f"{key}={token}")
path.write_text("\n".join(output) + "\n")
path.chmod(0o600)
PY
elif [[ ! "$TOKEN" =~ ^[A-Za-z0-9._~-]{30,}$ ]]; then
  echo "Nilai CKANEXT__XLOADER__API_TOKEN di .env.ckan tidak tampak valid. Jalankan kembali enable-xloader setelah memperbaiki token; rahasia tidak ditampilkan." >&2
  exit 3
else
  echo "Token XLoader telah tersedia; tidak membuat token baru."
fi

# Force the CKAN process and worker to load the same secret from .env.ckan.
"$ROOT/deploy/ckan/compose.sh" "$PROFILE" up -d --force-recreate ckan xloader-worker
chmod 600 "$ENV_FILE"
echo "XLoader disiapkan. Token tersimpan privat di .env.ckan dan tidak dicetak ke terminal."

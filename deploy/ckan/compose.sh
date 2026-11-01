#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UPSTREAM="$ROOT/deploy/ckan/upstream"
ENV_FILE="$ROOT/.env.ckan"

usage() {
  cat <<'USAGE'
Gunakan satu file konfigurasi: .env.ckan

Persiapan (sekali):
  cp .env.ckan.example .env.ckan
  bash ./deploy/ckan/bootstrap-upstream.sh

Perintah:
  bash ./deploy/ckan/compose.sh manual up -d --build                    # root CKAN host -> login form
  bash ./deploy/ckan/compose.sh cloudflare up -d --build                # Tunnel + root CKAN host -> login form
  bash ./deploy/ckan/compose.sh cloudflare-access up -d --build        # Tunnel + Cloudflare Access (optional)
  bash ./deploy/ckan/compose.sh manual config
  bash ./deploy/ckan/compose.sh manual ps
  bash ./deploy/ckan/compose.sh manual logs -f ckan nextjs
  bash ./deploy/ckan/compose.sh manual down
  bash ./deploy/ckan/enable-xloader.sh manual  # setelah stack sehat

Gunakan tepat satu profil ingress: manual, cloudflare, ATAU cloudflare-access.
CKAN_ADMIN_GATE_MODE=none (default) langsung menampilkan form login CKAN pada root host admin.
Pakai basic_auth untuk menambahkan gerbang Caddy opsional pada manual/cloudflare.
Pakai cloudflare_access hanya jika Cloudflare Access application + allow-list CKAN_HOST sudah aktif.
USAGE
}

if [[ $# -lt 1 ]]; then usage; exit 2; fi
PROFILE="$1"; shift
case "$PROFILE" in
  manual) COMPOSE_PROFILE="manual"; COMPOSE_FILE_PROFILE="manual" ;;
  cloudflare) COMPOSE_PROFILE="cloudflare"; COMPOSE_FILE_PROFILE="cloudflare" ;;
  cloudflare-access) COMPOSE_PROFILE="cloudflare"; COMPOSE_FILE_PROFILE="cloudflare-access" ;;
  -h|--help|help) usage; exit 0 ;;
  *) echo "Profil tidak valid: $PROFILE (pilih manual, cloudflare, atau cloudflare-access)." >&2; usage; exit 2 ;;
esac

[[ -f "$ENV_FILE" ]] || { echo "File $ENV_FILE belum ada. Salin .env.ckan.example lalu jalankan bootstrap." >&2; exit 2; }
ADMIN_GATE_MODE="$(python3 - "$ENV_FILE" <<'PYMODE'
from pathlib import Path
import re, sys
values = {}
for line in Path(sys.argv[1]).read_text().splitlines():
    match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
    if match: values[match.group(1)] = match.group(2).strip().strip('"').strip("'")
print(values.get("CKAN_ADMIN_GATE_MODE", "none") or "none")
PYMODE
)"
if [[ "$ADMIN_GATE_MODE" != "none" && "$ADMIN_GATE_MODE" != "basic_auth" && "$ADMIN_GATE_MODE" != "cloudflare_access" ]]; then
  echo "CKAN_ADMIN_GATE_MODE harus none, basic_auth, atau cloudflare_access; nilai saat ini: $ADMIN_GATE_MODE." >&2
  exit 2
fi
if [[ "$PROFILE" == "cloudflare-access" && "$ADMIN_GATE_MODE" != "cloudflare_access" ]]; then
  echo "Profil 'cloudflare-access' membutuhkan CKAN_ADMIN_GATE_MODE=cloudflare_access." >&2; exit 2
fi
if [[ "$PROFILE" != "cloudflare-access" && "$ADMIN_GATE_MODE" == "cloudflare_access" ]]; then
  echo "CKAN_ADMIN_GATE_MODE=cloudflare_access membutuhkan profil cloudflare-access." >&2; exit 2
fi
if [[ "$ADMIN_GATE_MODE" == "basic_auth" && "$PROFILE" == "manual" ]]; then
  EXTRA_GATE_FILE="$ROOT/deploy/ckan/docker-compose.manual-basic-auth.yml"
elif [[ "$ADMIN_GATE_MODE" == "basic_auth" && "$PROFILE" == "cloudflare" ]]; then
  EXTRA_GATE_FILE="$ROOT/deploy/ckan/docker-compose.cloudflare-basic-auth.yml"
else
  EXTRA_GATE_FILE=""
fi
if [[ "$PROFILE" == "cloudflare-access" ]]; then
  echo "Peringatan: pastikan Cloudflare Access application untuk CKAN_HOST sudah aktif dan allow-list hanya berisi admin yang diizinkan." >&2
fi
[[ -f "$UPSTREAM/docker-compose.yml" ]] || { echo "CKAN upstream belum siap. Jalankan ./deploy/ckan/bootstrap-upstream.sh terlebih dahulu." >&2; exit 2; }
[[ ! -e "$UPSTREAM/.env" ]] || { echo "File upstream/.env lama terdeteksi; jalankan ulang bootstrap agar konfigurasi hanya bersumber dari .env.ckan." >&2; exit 2; }
grep -qE '^[[:space:]]*env_file:[[:space:]]*\.env\.generated[[:space:]]*$|^[[:space:]]*-[[:space:]]*\.env\.generated[[:space:]]*$' "$UPSTREAM/docker-compose.yml" || { echo "Compose upstream belum memakai env hasil filter; jalankan ulang bootstrap." >&2; exit 2; }
if grep -qE '^  datapusher:[[:space:]]*$' "$UPSTREAM/docker-compose.yml"; then
  echo "Service DataPusher masih ditemukan. Jalankan ulang bootstrap untuk memakai XLoader saja." >&2
  exit 2
fi
if grep -qE '^[[:space:]]*env_file:[[:space:]]*\.env[[:space:]]*$|^[[:space:]]*-[[:space:]]*\.env[[:space:]]*$' "$UPSTREAM/docker-compose.yml"; then
  echo "Compose upstream masih merujuk .env lama; jalankan ulang bootstrap agar hanya .env.ckan digunakan." >&2
  exit 2
fi
# Older .env.ckan files may predate the public tile setting. Keep the public
# GeoJSON preview on the same attributable OSM base layer instead of passing an
# empty build argument (which otherwise produces a Compose warning).
if ! grep -qE '^NEXT_PUBLIC_MAP_TILE_URL=.+$' "$ENV_FILE"; then
  export NEXT_PUBLIC_MAP_TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
fi

python3 "$ROOT/deploy/ckan/sync-env.py" "$ENV_FILE"
python3 "$ROOT/deploy/ckan/render-upstream-env.py" "$ENV_FILE" "$UPSTREAM/.env.generated"

# The official upstream ckan/ckan-docker-base source is built locally before any Compose start.
# This avoids relying on a Docker Hub 2.12.1 tag before its publication is confirmed.
if [[ "${1:-}" == "up" ]]; then
  bash "$ROOT/deploy/ckan/prepare-ckan-base.sh"
fi

FILES=(
  -f "$UPSTREAM/docker-compose.yml"
  -f "$UPSTREAM/docker-compose.override.yml"
  -f "$ROOT/deploy/ckan/docker-compose.$COMPOSE_FILE_PROFILE.yml"
)
if [[ -n "$EXTRA_GATE_FILE" ]]; then FILES+=( -f "$EXTRA_GATE_FILE" ); fi
exec docker compose \
  --project-directory "$UPSTREAM" \
  --env-file "$ENV_FILE" \
  --profile "$COMPOSE_PROFILE" \
  "${FILES[@]}" "$@"

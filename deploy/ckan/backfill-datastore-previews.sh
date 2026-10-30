#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

usage() {
  cat <<'USAGE'
Memuat resource tabular yang sudah ada ke CKAN DataStore agar pratinjau tabel tersedia.

Penggunaan:
  bash ./deploy/ckan/backfill-datastore-previews.sh cloudflare [all|all-existing|NAMA_DATASET]
  bash ./deploy/ckan/backfill-datastore-previews.sh manual [all|all-existing|NAMA_DATASET]
  bash ./deploy/ckan/backfill-datastore-previews.sh cloudflare-access [all|all-existing|NAMA_DATASET]

Persiapan satu kali:
  bash ./deploy/ckan/apply-datastore-permissions.sh
  bash ./deploy/ckan/enable-xloader.sh cloudflare

Target:
  all          kirim seluruh resource yang cocok ke XLoader (default)
  all-existing muat ulang resource yang sudah tercatat di DataStore
  NAMA_DATASET muat resource pada satu dataset berdasarkan nama/slug

Perintah ini mengantrekan pekerjaan; status akhirnya diperiksa melalui xloader status.
USAGE
}

if [[ $# -lt 1 || $# -gt 2 ]]; then usage; exit 2; fi
PROFILE="$1"
TARGET="${2:-all}"
case "$PROFILE" in
  manual|cloudflare|cloudflare-access) ;;
  -h|--help|help) usage; exit 0 ;;
  *) echo "Profil tidak valid: $PROFILE" >&2; usage; exit 2 ;;
esac
case "$TARGET" in
  all|all-existing) ;;
  -*|*/*|*' '* ) echo "Target dataset tidak valid: $TARGET" >&2; exit 2 ;;
esac

bash "$ROOT/deploy/ckan/compose.sh" "$PROFILE" exec -T ckan \
  ckan -c /srv/app/ckan.ini xloader submit "$TARGET"

echo
echo "Permintaan XLoader sudah dikirim. Pantau progres dengan:"
echo "bash ./deploy/ckan/compose.sh $PROFILE exec -T ckan ckan -c /srv/app/ckan.ini xloader status"

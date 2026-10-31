#!/usr/bin/env bash
# Diagnose and safely repair a single CKAN resource without deleting/recreating it.
# Default mode is read-only. Upload mode is opt-in: --upload /path/to/file.xlsx
set -Eeuo pipefail
IFS=$'\n\t'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATASET_ID="${DATASET_ID:-9c70ae22-cd50-4e14-8887-d7574abfface}"
RESOURCE_ID="${RESOURCE_ID:-3c2e4f10-6c61-4a2c-a3db-b96db879889c}"
REPORTED_FILE_ID="${REPORTED_FILE_ID:-c45b4a89-ee8c-4ee0-8a58-3f5af84a708d}"
PUBLIC_DOWNLOAD_URL="${PUBLIC_DOWNLOAD_URL:-https://data.silirdev.com/dataset/${DATASET_ID}/resource/${RESOURCE_ID}/download/menara-telekomunikasi-di-kabupaten-wajo-tahun-2025.xlsx}"
COMPOSE_PROFILE="${COMPOSE_PROFILE:-cloudflare}"
UPLOAD_FILE=""

usage() {
  cat <<'USAGE'
Diagnose (read-only; does not mutate CKAN):
  bash scripts/repair-ckan-resource.sh
  bash scripts/repair-ckan-resource.sh --diagnose

Replace the file of the EXISTING resource (keeps dataset/resource IDs):
  bash scripts/repair-ckan-resource.sh --upload /path/to/menara-telekomunikasi-di-kabupaten-wajo-tahun-2025.xlsx

Required environment:
  CKAN_API_URL       Optional; defaults from .env.ckan CKAN_ADMIN_URL + /api/3/action
  CKAN_API_TOKEN     Required; can be entered interactively when omitted

Optional overrides:
  DATASET_ID, RESOURCE_ID, REPORTED_FILE_ID, PUBLIC_DOWNLOAD_URL,
  CKAN_DOWNLOAD_ORIGIN, CKAN_FILE_DOWNLOAD_URL,
  COMPOSE_PROFILE (manual|cloudflare|cloudflare-access), BACKUP_DIR

Safety:
  - No package_delete, resource_delete, or FileStore volume deletion is performed.
  - Default mode only reads CKAN metadata and checks public HEAD/download path.
  - Upload mode calls resource_update on the existing RESOURCE_ID only.
USAGE
}

MODE="diagnose"
case "${1:-}" in
  "") ;;
  --diagnose) MODE="diagnose" ;;
  --upload)
    [[ $# -eq 2 ]] || { echo "Gunakan: $0 --upload /path/berkas.xlsx" >&2; exit 2; }
    MODE="upload"
    UPLOAD_FILE="$2"
    ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

for bin in curl jq python3; do
  command -v "$bin" >/dev/null 2>&1 || { echo "Dependency wajib tidak ditemukan: $bin" >&2; exit 2; }
done

if [[ -z "${CKAN_API_URL:-}" && -f "$ROOT/.env.ckan" ]]; then
  CKAN_ADMIN_URL="$(python3 - "$ROOT/.env.ckan" <<'PY'
from pathlib import Path
import re, sys
for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
    match = re.match(r'^CKAN_ADMIN_URL=(.*)$', line.strip())
    if match:
        print(match.group(1).strip().strip('"').strip("'"))
        break
PY
)"
  if [[ -n "$CKAN_ADMIN_URL" ]]; then CKAN_API_URL="${CKAN_ADMIN_URL%/}/api/3/action"; fi
fi
: "${CKAN_API_URL:?Set CKAN_API_URL=https://<CKAN-admin-host>/api/3/action (or configure CKAN_ADMIN_URL in .env.ckan).}"
CKAN_API_URL="${CKAN_API_URL%/}"
if [[ "$CKAN_API_URL" != */api/3/action ]]; then
  echo "CKAN_API_URL harus berakhir dengan /api/3/action; nilai: $CKAN_API_URL" >&2
  exit 2
fi

if [[ -z "${CKAN_API_TOKEN:-}" ]]; then
  read -rsp "CKAN API Token: " CKAN_API_TOKEN
  echo
fi
[[ -n "$CKAN_API_TOKEN" ]] || { echo "CKAN_API_TOKEN kosong." >&2; exit 2; }

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/ckan-resource-repair-backups/${RESOURCE_ID}/${STAMP}}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

api_get() {
  local action="$1" id="$2"
  curl --silent --show-error --fail-with-body \
    --header "Authorization: $CKAN_API_TOKEN" \
    --get --data-urlencode "id=$id" \
    "$CKAN_API_URL/$action"
}

api_post_upload() {
  local path="$1"
  curl --silent --show-error --fail-with-body \
    --header "Authorization: $CKAN_API_TOKEN" \
    --form-string "id=$RESOURCE_ID" \
    --form "upload=@${path};type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \
    "$CKAN_API_URL/resource_update"
}

assert_action_success() {
  local json_file="$1" action="$2"
  if ! jq -e '.success == true and (.result != null)' "$json_file" >/dev/null; then
    echo "CKAN action $action gagal. Respons (tanpa token):" >&2
    jq '{success, error}' "$json_file" >&2 || cat "$json_file" >&2
    return 1
  fi
}

save_action() {
  local action="$1" id="$2" destination="$3"
  api_get "$action" "$id" > "$destination"
  assert_action_success "$destination" "$action"
}

echo "== CKAN resource repair: ${MODE} =="
echo "Dataset : $DATASET_ID"
echo "Resource: $RESOURCE_ID"
echo "Backup  : $BACKUP_DIR"

save_action package_show "$DATASET_ID" "$BACKUP_DIR/package-before.json"
save_action resource_show "$RESOURCE_ID" "$BACKUP_DIR/resource-before.json"

ACTUAL_PACKAGE_ID="$(jq -r '.result.package_id // empty' "$BACKUP_DIR/resource-before.json")"
if [[ "$ACTUAL_PACKAGE_ID" != "$DATASET_ID" ]]; then
  echo "STOP: resource $RESOURCE_ID terikat ke package_id=$ACTUAL_PACKAGE_ID, bukan dataset $DATASET_ID." >&2
  exit 1
fi
RESOURCE_STATE="$(jq -r '.result.state // "unknown"' "$BACKUP_DIR/resource-before.json")"
RESOURCE_NAME="$(jq -r '.result.name // "(tanpa nama)"' "$BACKUP_DIR/resource-before.json")"
RESOURCE_URL="$(jq -r '.result.url // empty' "$BACKUP_DIR/resource-before.json")"
FILE_ID="$REPORTED_FILE_ID"
if [[ "$RESOURCE_URL" =~ /file/(download/)?([a-fA-F0-9-]{32,36})/?$ ]]; then
  FILE_ID="${BASH_REMATCH[2]}"
fi

printf '\nResource metadata:\n'
jq '.result | {id, package_id, name, format, mimetype, url, state, size, hash, last_modified}' "$BACKUP_DIR/resource-before.json"
printf '\nReferenced FileStore ID: %s\n' "$FILE_ID"

FILE_SHOW_OK=0
if api_get file_show "$FILE_ID" > "$BACKUP_DIR/file-before.json" 2> "$BACKUP_DIR/file-show-error.txt" && jq -e '.success == true and (.result != null)' "$BACKUP_DIR/file-before.json" >/dev/null; then
  FILE_SHOW_OK=1
  echo "\nFileStore metadata:"
  jq '.result | {id, name, storage, location, size, content_type, mimetype, state, private, owner_info}' "$BACKUP_DIR/file-before.json"
else
  echo "\nPeringatan: file_show untuk $FILE_ID gagal/tidak ditemukan. Resource metadata tetap berhasil dibaca."
  [[ ! -s "$BACKUP_DIR/file-show-error.txt" ]] || sed -n '1,4p' "$BACKUP_DIR/file-show-error.txt"
fi

# A public HEAD checks the complete Next.js/Caddy/CKAN path without downloading the workbook.
set +e
PUBLIC_STATUS="$(curl --silent --show-error --location --head --max-time 45 --output /dev/null --write-out '%{http_code}' "$PUBLIC_DOWNLOAD_URL" 2>/dev/null)"
PUBLIC_CURL_STATUS=$?
set -e
printf '\nPublic download HEAD: HTTP %s (curl exit %s)\n' "${PUBLIC_STATUS:-unknown}" "$PUBLIC_CURL_STATUS"

CKAN_ORIGIN="${CKAN_DOWNLOAD_ORIGIN:-${CKAN_API_URL%/api/3/action}}"
CKAN_FILE_DOWNLOAD_URL="${CKAN_FILE_DOWNLOAD_URL:-${CKAN_ORIGIN%/}/file/download/${FILE_ID}}"
set +e
CKAN_FILE_STATUS="$(curl --silent --show-error --location --head --max-time 45 --output /dev/null --write-out '%{http_code}' "$CKAN_FILE_DOWNLOAD_URL" 2>/dev/null)"
CKAN_FILE_CURL_STATUS=$?
set -e
printf 'CKAN file.download HEAD: HTTP %s (curl exit %s)\n' "${CKAN_FILE_STATUS:-unknown}" "$CKAN_FILE_CURL_STATUS"

# Inspect the configured local FileStore only. Never delete or move its contents.
if [[ "$FILE_SHOW_OK" -eq 1 ]]; then
  STORAGE="$(jq -r '.result.storage // empty' "$BACKUP_DIR/file-before.json")"
  LOCATION="$(jq -r '.result.location // empty' "$BACKUP_DIR/file-before.json")"
  if [[ -n "$LOCATION" ]]; then
    CID=""
    if [[ -x "$ROOT/deploy/ckan/compose.sh" && -f "$ROOT/.env.ckan" ]]; then
      CID="$(bash "$ROOT/deploy/ckan/compose.sh" "$COMPOSE_PROFILE" ps -q ckan 2>/dev/null | head -n1 || true)"
    fi
    if [[ -n "$CID" ]]; then
      echo "\nMemeriksa kandidat path FileStore di container CKAN (storage=$STORAGE)..."
      set +e
      FOUND_PATH="$(docker exec -i "$CID" python - "$LOCATION" "$STORAGE" <<'PY'
from pathlib import Path, PurePosixPath
import sys
location, storage = sys.argv[1], sys.argv[2]
roots = [Path("/var/lib/ckan/default/resources"), Path("/var/lib/ckan/default")]
raw = Path(location)
candidates = [raw] if raw.is_absolute() else []
rel = PurePosixPath(location.lstrip("/"))
if ".." in rel.parts:
    raise SystemExit("Unsafe CKAN file location; tidak mencoba path traversal.")
for root in roots:
    candidates.append(root.joinpath(*rel.parts))
for candidate in candidates:
    resolved = candidate.resolve()
    if any(resolved != root.resolve() and root.resolve() in resolved.parents for root in roots) and resolved.is_file():
        print(resolved)
        raise SystemExit(0)
print("")
PY
)"
      DOCKER_STATUS=$?
      set -e
      if [[ "$DOCKER_STATUS" -eq 0 && -n "$FOUND_PATH" ]]; then
        echo "File fisik ditemukan: $FOUND_PATH"
        RECOVERED_COPY="$BACKUP_DIR/recovered-${RESOURCE_ID}-$(basename "$FOUND_PATH")"
        if docker cp "$CID:$FOUND_PATH" "$RECOVERED_COPY" >/dev/null 2>&1; then
          echo "Salinan file berhasil dibuat: $RECOVERED_COPY"
          if [[ "$RECOVERED_COPY" == *.xlsx ]] && command -v unzip >/dev/null 2>&1; then
            unzip -t "$RECOVERED_COPY" >/dev/null && echo "Validasi struktur ZIP/XLSX: PASS" || echo "PERINGATAN: file hasil salinan bukan XLSX valid."
          fi
        else
          echo "File ditemukan di container tetapi docker cp gagal; periksa izin Docker." >&2
        fi
      else
        echo "File tidak ditemukan pada kandidat path default FileStore. Ini belum membuktikan kehilangan data: periksa backend/storage konfigurasi non-default."
      fi
    else
      echo "Container CKAN tidak ditemukan melalui Compose profile '$COMPOSE_PROFILE'; pemeriksaan FileStore dilewati."
    fi
  else
    echo "file_show tidak menyediakan field location; pemeriksaan lokasi fisik dilewati."
  fi
fi

if [[ "$MODE" == "upload" ]]; then
  [[ -f "$UPLOAD_FILE" && -r "$UPLOAD_FILE" ]] || { echo "File XLSX tidak ditemukan/tidak dapat dibaca: $UPLOAD_FILE" >&2; exit 2; }
  command -v unzip >/dev/null 2>&1 || { echo "unzip dibutuhkan untuk memvalidasi XLSX." >&2; exit 2; }
  [[ "$(basename "$UPLOAD_FILE" | tr '[:upper:]' '[:lower:]')" == *.xlsx ]] || { echo "File harus berekstensi .xlsx." >&2; exit 2; }
  unzip -t "$UPLOAD_FILE" >/dev/null || { echo "File bukan XLSX/ZIP yang valid. Upload dibatalkan." >&2; exit 2; }
  echo "\nMengganti isi file pada resource yang sama (resource_update)..."
  api_post_upload "$UPLOAD_FILE" > "$BACKUP_DIR/resource-update-response.json"
  assert_action_success "$BACKUP_DIR/resource-update-response.json" resource_update
  UPDATED_RESOURCE_ID="$(jq -r '.result.id // empty' "$BACKUP_DIR/resource-update-response.json")"
  UPDATED_PACKAGE_ID="$(jq -r '.result.package_id // empty' "$BACKUP_DIR/resource-update-response.json")"
  if [[ "$UPDATED_RESOURCE_ID" != "$RESOURCE_ID" || "$UPDATED_PACKAGE_ID" != "$DATASET_ID" ]]; then
    echo "STOP: CKAN mengembalikan identitas resource/dataset yang tidak sesuai. Periksa response tersimpan di $BACKUP_DIR/resource-update-response.json" >&2
    exit 1
  fi
  save_action resource_show "$RESOURCE_ID" "$BACKUP_DIR/resource-after.json"
  echo "\nUpload berhasil. Identitas terjaga:"
  jq '.result | {id, package_id, name, format, mimetype, url, state, size, hash}' "$BACKUP_DIR/resource-after.json"
  echo "\nResource ID dan dataset ID tetap sama. FileStore ID dapat berubah karena file fisik diganti."
fi

echo "\nSelesai. Metadata backup tersimpan di: $BACKUP_DIR"
if [[ "$MODE" == "diagnose" ]]; then
  echo "Mode diagnose bersifat read-only. Untuk mengganti file, jalankan ulang dengan --upload /path/file.xlsx setelah memeriksa salinan/backup XLSX."
fi

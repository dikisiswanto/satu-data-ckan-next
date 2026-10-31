#!/usr/bin/env bash
# End-to-end public check for the dedicated Wajo editorial-media proxy.
set -Eeuo pipefail

BASE_URL="${PUBLIC_SITE_URL:-https://data.silirdev.com}"
FILE_ID="${1:-489a796c-7c87-434d-a777-8c0daf1ade97}"

if [[ ! "$FILE_ID" =~ ^[a-fA-F0-9-]{32,36}$ ]]; then
  echo "ERROR: file ID bukan UUID yang valid." >&2
  exit 2
fi

URL="${BASE_URL%/}/api/editorial-media/${FILE_ID}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
HEADERS="$TMP_DIR/headers.txt"
BODY="$TMP_DIR/body.bin"

printf 'Checking public editorial media: %s\n' "$URL"
HTTP_STATUS="$(curl --silent --show-error --location \
  --connect-timeout 8 --max-time 35 \
  --dump-header "$HEADERS" --output "$BODY" \
  --write-out '%{http_code}' "$URL" || true)"
CONTENT_TYPE="$(awk '{line=tolower($0); if (line ~ /^content-type:/) {sub(/^[^:]*:[[:space:]]*/, "", line); gsub("\\r", "", line); value=line}} END{print value}' "$HEADERS" 2>/dev/null || true)"
SIZE="$(wc -c < "$BODY" | tr -d '[:space:]')"

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "FAIL: endpoint returned HTTP ${HTTP_STATUS:-unknown}; expected 200." >&2
  [[ -n "$CONTENT_TYPE" ]] && echo "Content-Type: $CONTENT_TYPE" >&2
  sed -n '1,20p' "$HEADERS" >&2 || true
  exit 1
fi

if [[ "$CONTENT_TYPE" != image/png* && "$CONTENT_TYPE" != image/jpeg* && "$CONTENT_TYPE" != image/gif* && "$CONTENT_TYPE" != image/webp* ]]; then
  echo "FAIL: response is not an allowed image. Content-Type: ${CONTENT_TYPE:-missing}" >&2
  head -c 300 "$BODY" >&2 || true
  exit 1
fi

python3 - "$BODY" "$CONTENT_TYPE" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
data = p.read_bytes()
mime = sys.argv[2].split(";", 1)[0].strip().lower()
signatures = {
    "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": data.startswith(b"\xff\xd8\xff"),
    "image/gif": data.startswith((b"GIF87a", b"GIF89a")),
    "image/webp": len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}
if not signatures.get(mime, False):
    raise SystemExit("FAIL: signature file tidak cocok dengan Content-Type.")
if not data:
    raise SystemExit("FAIL: response body kosong.")
PY

printf 'PASS: HTTP 200, %s, %s bytes, valid image signature.\n' "$CONTENT_TYPE" "$SIZE"

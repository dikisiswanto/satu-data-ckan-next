#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UPSTREAM="$ROOT/deploy/ckan/upstream"
ENV_FILE="$ROOT/.env.ckan"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE; run bootstrap-upstream.sh first." >&2; exit 2; }
[[ -f "$UPSTREAM/docker-compose.yml" ]] || {
  echo "Official CKAN Compose checkout not found; run bootstrap-upstream.sh first." >&2
  exit 2
}
[[ ! -e "$UPSTREAM/.env" ]] || { echo "Legacy upstream/.env detected; rerun bootstrap to use .env.ckan as the only source." >&2; exit 2; }
grep -qE '^[[:space:]]*env_file:[[:space:]]*\.env\.generated[[:space:]]*$|^[[:space:]]*-[[:space:]]*\.env\.generated[[:space:]]*$' "$UPSTREAM/docker-compose.yml" || { echo "Upstream Compose is not configured for the filtered environment; rerun bootstrap." >&2; exit 2; }
if grep -qE '^[[:space:]]*env_file:[[:space:]]*\.env[[:space:]]*$|^[[:space:]]*-[[:space:]]*\.env[[:space:]]*$' "$UPSTREAM/docker-compose.yml"; then
  echo "Upstream Compose masih merujuk .env lama; jalankan ulang bootstrap." >&2
  exit 2
fi
python3 "$ROOT/deploy/ckan/sync-env.py" "$ENV_FILE"
python3 "$ROOT/deploy/ckan/render-upstream-env.py" "$ENV_FILE" "$UPSTREAM/.env.generated"

COMPOSE=(docker compose --project-directory "$UPSTREAM" --env-file "$ENV_FILE" -f "$UPSTREAM/docker-compose.yml" -f "$UPSTREAM/docker-compose.override.yml")

# Do not run CKAN CLI against a container that is still restarting or unhealthy.
CKAN_CID="$("${COMPOSE[@]}" ps -q ckan | tail -n 1)"
if [[ -z "$CKAN_CID" ]]; then
  echo "Container CKAN belum dibuat. Jalankan Compose untuk service ckan terlebih dahulu." >&2
  exit 3
fi
CKAN_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CKAN_CID" 2>/dev/null || true)"
if [[ "$CKAN_HEALTH" != "healthy" ]]; then
  echo "CKAN belum sehat (status: ${CKAN_HEALTH:-unknown}). Periksa 'compose.sh <profil> logs --tail=120 ckan' dan ulangi setelah status healthy." >&2
  exit 3
fi

# CKAN 2.12 requires its DataStore permissions SQL to be applied after initialization
# and after upgrades. The db service runs the PostgreSQL bootstrap superuser specified
# by POSTGRES_USER; psql stops the transaction if any statement fails.
"${COMPOSE[@]}" exec -T ckan ckan datastore set-permissions   | "${COMPOSE[@]}" exec -T db sh -lc 'psql --set ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "Applied CKAN DataStore permissions. Verify /api/3/action/datastore_search?resource_id=_table_metadata and each published DataStore resource."

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_UPSTREAM="$ROOT/deploy/ckan/upstream-base"
SOURCE_LOCK="$ROOT/deploy/ckan/.ckan-base-source.lock"
BUILD_LOCK="$ROOT/deploy/ckan/.ckan-base-image.lock"
IMAGE="ckan/ckan-base:2.12.1"
EXPECTED_CKAN_REF="ckan-2.12.1"

command -v docker >/dev/null 2>&1 || { echo "Docker diperlukan untuk membangun image dasar CKAN 2.12.1." >&2; exit 1; }
bash "$ROOT/deploy/ckan/sync-ckan-base-source.sh"

source_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$SOURCE_LOCK" | tail -n 1
}
SOURCE_COMMIT="$(source_value commit)"
CKAN_VERSION="$(source_value ckan_version)"
PYTHON_VERSION="$(source_value python_version)"
[[ "$CKAN_VERSION" == "2.12.1" ]] || { echo "CKAN_BASE_VERSION harus tepat 2.12.1; ditemukan $CKAN_VERSION." >&2; exit 2; }
[[ -n "$SOURCE_COMMIT" && -n "$PYTHON_VERSION" ]] || { echo "Lock source CKAN base tidak lengkap." >&2; exit 2; }

IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null || true)"
LOCK_COMMIT=""
LOCK_IMAGE_ID=""
LOCK_PYTHON_BASE_IMAGE_ID=""
if [[ -f "$BUILD_LOCK" ]]; then
  LOCK_COMMIT="$(sed -n 's/^source_commit=//p' "$BUILD_LOCK" | tail -n 1)"
  LOCK_IMAGE_ID="$(sed -n 's/^image_id=//p' "$BUILD_LOCK" | tail -n 1)"
  LOCK_PYTHON_BASE_IMAGE_ID="$(sed -n 's/^python_base_image_id=//p' "$BUILD_LOCK" | tail -n 1)"
fi

# Refresh the upstream Python runtime base before comparing build provenance.
# The official CKAN 2.12 Dockerfile currently declares python:3.14-slim-bookworm.
PYTHON_BASE_IMAGE="python:${PYTHON_VERSION}-slim-bookworm"
docker pull "$PYTHON_BASE_IMAGE"
PYTHON_BASE_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$PYTHON_BASE_IMAGE")"

image_has_expected_release() {
  local envs labels
  envs="$(docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$IMAGE" 2>/dev/null || true)"
  labels="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.source"}}' "$IMAGE" 2>/dev/null || true)"
  grep -Fxq "CKAN_REF=$EXPECTED_CKAN_REF" <<< "$envs" &&
    [[ "$labels" == "https://github.com/ckan/ckan-docker-base" ]]
}

if [[ "${CKAN_BASE_FORCE_REBUILD:-0}" != "1" && -n "$IMAGE_ID" && "$LOCK_COMMIT" == "$SOURCE_COMMIT" && "$LOCK_IMAGE_ID" == "$IMAGE_ID" && "$LOCK_PYTHON_BASE_IMAGE_ID" == "$PYTHON_BASE_IMAGE_ID" ]] && image_has_expected_release; then
  echo "Official CKAN base image already built from upstream commit $SOURCE_COMMIT and Python base $PYTHON_BASE_IMAGE_ID: $IMAGE"
  exit 0
fi

echo "Building $IMAGE from official ckan/ckan-docker-base (CKAN $CKAN_VERSION, Python $PYTHON_VERSION)."
echo "This build uses the upstream build.sh and CKAN release ref $EXPECTED_CKAN_REF."
(
  cd "$BASE_UPSTREAM"
  bash ./build.sh build 2.12 base
)

IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null || true)"
[[ -n "$IMAGE_ID" ]] || { echo "Build selesai tetapi image $IMAGE tidak ditemukan." >&2; exit 5; }
if ! image_has_expected_release; then
  echo "Image $IMAGE tidak memiliki CKAN_REF=$EXPECTED_CKAN_REF dan label source resmi; menolak melanjutkan." >&2
  exit 5
fi
printf 'source_commit=%s\nckan_version=%s\npython_version=%s\npython_base_image_id=%s\nimage_id=%s\n' \
  "$SOURCE_COMMIT" "$CKAN_VERSION" "$PYTHON_VERSION" "$PYTHON_BASE_IMAGE_ID" "$IMAGE_ID" > "$BUILD_LOCK"
echo "Verified local official base image: $IMAGE ($IMAGE_ID)"
echo "Build provenance: upstream commit $SOURCE_COMMIT; Python base $PYTHON_BASE_IMAGE ($PYTHON_BASE_IMAGE_ID)."

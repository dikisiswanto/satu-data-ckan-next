#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_UPSTREAM="$ROOT/deploy/ckan/upstream-base"
SOURCE_LOCK="$ROOT/deploy/ckan/.ckan-base-source.lock"
BASE_REPOSITORY="https://github.com/ckan/ckan-docker-base.git"
BASE_REF="${CKAN_BASE_REPO_REF:-main}"
EXPECTED_CKAN_VERSION="2.12.1"

command -v git >/dev/null 2>&1 || { echo "git diperlukan untuk mengambil ckan/ckan-docker-base." >&2; exit 1; }

if [[ ! -d "$BASE_UPSTREAM/.git" ]]; then
  mkdir -p "$(dirname "$BASE_UPSTREAM")"
  git clone --depth 1 --branch "$BASE_REF" "$BASE_REPOSITORY" "$BASE_UPSTREAM"
else
  origin="$(git -C "$BASE_UPSTREAM" remote get-url origin)"
  if [[ "$origin" != "$BASE_REPOSITORY" && "$origin" != "https://github.com/ckan/ckan-docker-base" ]]; then
    echo "Source directory bukan repository resmi ckan/ckan-docker-base: $origin" >&2
    exit 2
  fi
  git -C "$BASE_UPSTREAM" fetch --depth 1 origin "$BASE_REF"
  git -C "$BASE_UPSTREAM" checkout --detach FETCH_HEAD
  git -C "$BASE_UPSTREAM" reset --hard FETCH_HEAD
  git -C "$BASE_UPSTREAM" clean -fdx
fi

VERSION_FILE="$BASE_UPSTREAM/ckan-2.12/VERSION.txt"
PYTHON_VERSION_FILE="$BASE_UPSTREAM/ckan-2.12/PYTHON_VERSION.txt"
DOCKERFILE="$BASE_UPSTREAM/ckan-2.12/Dockerfile"
BUILD_SCRIPT="$BASE_UPSTREAM/build.sh"
[[ -f "$VERSION_FILE" ]] || { echo "VERSION.txt upstream CKAN 2.12 tidak ditemukan: $VERSION_FILE" >&2; exit 3; }
[[ -f "$PYTHON_VERSION_FILE" ]] || { echo "PYTHON_VERSION.txt upstream CKAN 2.12 tidak ditemukan." >&2; exit 3; }
[[ -f "$DOCKERFILE" && -f "$BUILD_SCRIPT" ]] || { echo "Dockerfile/build.sh resmi ckan-docker-base tidak lengkap." >&2; exit 3; }

ACTUAL_VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
PYTHON_VERSION="$(tr -d '[:space:]' < "$PYTHON_VERSION_FILE")"
if [[ "$ACTUAL_VERSION" != "$EXPECTED_CKAN_VERSION" ]]; then
  echo "Versi source resmi ckan/ckan-docker-base saat ini adalah $ACTUAL_VERSION, bukan $EXPECTED_CKAN_VERSION." >&2
  echo "Deployment dihentikan agar image CKAN tidak tercampur antar-rilis." >&2
  exit 4
fi
if [[ ! "$PYTHON_VERSION" =~ ^3\.[0-9]+$ ]]; then
  echo "PYTHON_VERSION upstream tidak valid: $PYTHON_VERSION" >&2
  exit 4
fi
if ! grep -q 'ARG CKAN_REF' "$DOCKERFILE" || ! grep -q 'https://github.com/ckan/ckan.git' "$DOCKERFILE" || \
  ! grep -Fq 'FROM python:${PYTHON_VERSION}-slim-bookworm AS builder' "$DOCKERFILE" || \
  ! grep -Fq 'FROM python:${PYTHON_VERSION}-slim-bookworm AS base' "$DOCKERFILE"; then
  echo "Dockerfile upstream tidak menunjukkan pola build CKAN resmi yang diharapkan." >&2
  exit 4
fi

COMMIT="$(git -C "$BASE_UPSTREAM" rev-parse HEAD)"
printf 'repository=%s\nref=%s\ncommit=%s\nckan_version=%s\npython_version=%s\n' \
  "$BASE_REPOSITORY" "$BASE_REF" "$COMMIT" "$ACTUAL_VERSION" "$PYTHON_VERSION" > "$SOURCE_LOCK"

printf 'Verified official CKAN base source:\n'
printf '  repository : %s\n  ref        : %s\n  commit     : %s\n  CKAN       : %s\n  Python     : %s\n' \
  "$BASE_REPOSITORY" "$BASE_REF" "$COMMIT" "$ACTUAL_VERSION" "$PYTHON_VERSION"

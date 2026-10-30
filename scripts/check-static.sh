#!/usr/bin/env bash
# Shared static validation entry point for local development and GitHub Actions.
# Invoke with `bash scripts/check-static.sh`; executable mode is not required.
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

run_check() {
  printf '\n==> %s\n' "$*"
  "$@"
}

run_check python3 scripts/check-ci.py
run_check python3 scripts/check-env.py
run_check python3 scripts/check-base.py
run_check python3 scripts/check-theme.py
run_check python3 scripts/check-id-translations.py
run_check python3 scripts/check-auth-middleware.py
run_check python3 scripts/check-build.py
run_check python3 scripts/check-plugins-config.py
run_check node scripts/check-css.mjs
run_check node scripts/check-nav.mjs
run_check node scripts/check-api.mjs
run_check node scripts/check-project.mjs
run_check node scripts/check-imports.mjs
run_check node scripts/check-layout.mjs

printf '\nStatic validation passed.\n'

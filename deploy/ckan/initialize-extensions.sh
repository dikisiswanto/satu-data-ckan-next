#!/usr/bin/env bash
set -euo pipefail

# Harvest workers use the same image/entrypoint but must not race the primary
# CKAN container while it runs database migrations.
if [[ "${CKAN_SKIP_EXTENSION_MIGRATIONS:-false}" == "true" ]]; then
  exit 0
fi

ckan -c /srv/app/ckan.ini db upgrade -p pages
ckan -c /srv/app/ckan.ini db upgrade -p harvest

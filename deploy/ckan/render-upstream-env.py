#!/usr/bin/env python3
"""Render the CKAN-only service environment from the single .env.ckan source.

The generated file is an output, never a user-managed configuration file. It
intentionally excludes Cloudflare tokens, Caddy Basic Auth credentials, and all
Next.js/public-origin settings so these are not injected into CKAN, DB, Solr,
Redis, Nginx, or unrelated services through the upstream env_file. XLoader's
own token and jobs database URI are injected only into CKAN and its worker.
"""
from pathlib import Path
import re
import sys

if len(sys.argv) != 3:
    raise SystemExit("usage: render-upstream-env.py .env.ckan deploy/ckan/upstream/.env.generated")
source, destination = map(Path, sys.argv[1:])
if not source.is_file():
    raise SystemExit(f"Canonical environment file is missing: {source}")

excluded_prefixes = ("NEXT_PUBLIC_", "CKAN_ADMIN_BASIC_AUTH_", "CLOUDFLARE_", "CKANEXT__XLOADER__", "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_")
excluded_keys = {
    "PUBLIC_HOST", "CKAN_HOST", "PUBLIC_SITE_ORIGIN", "CKAN_ADMIN_URL",
    "CKAN_API_INTERNAL_URL", "CKAN_API_TIMEOUT_MS", "CKAN_INDICATOR_TAG", "CKAN_SESSION_COOKIE_NAME",
    "CKAN_INFOGRAPHIC_TAG", "CKAN_PUBLICATION_TAG", "CKAN_REVALIDATE_SECRET",
}
rendered = []
seen = set()
values = {}
for line in source.read_text().splitlines():
    match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
    if not match:
        continue
    key = match.group(1)
    if key in excluded_keys or key.startswith(excluded_prefixes):
        continue
    if key in seen:
        raise SystemExit(f"Duplicate environment key in canonical .env.ckan: {key}")
    seen.add(key)
    values[key] = match.group(2).strip().strip('"').strip("'")
    rendered.append(line)

if not any(line.startswith("CKAN__PLUGINS=") for line in rendered):
    raise SystemExit("CKAN__PLUGINS missing; run bootstrap before rendering the CKAN environment.")

# Scheming expects package-resource references in `module:file` form. A stale
# filesystem path (the former /srv/app/ckanext-schemas/dataset.yaml value)
# makes CKAN crash while loading plugins, before the health check can pass.
required_scheming = {
    "CKAN___SCHEMING__DATASET_SCHEMAS": "ckanext.wajo_theme:schemas/dataset.yaml",
    "CKAN___SCHEMING__ORGANIZATION_SCHEMAS": "ckanext.wajo_theme:schemas/organization.yaml",
    "CKAN___SCHEMING__GROUP_SCHEMAS": "ckanext.wajo_theme:schemas/group.yaml",
    "CKAN___SCHEMING__PRESETS": "ckanext.scheming:presets.json",
}
for key, expected in required_scheming.items():
    actual = values.get(key, "")
    if actual != expected:
        raise SystemExit(
            f"{key} must be {expected!r}; found {actual!r}. "
            "Run bootstrap-upstream.sh to repair the Scheming module:file configuration."
        )
for obsolete_key in (
    "CKAN__SCHEMING__DATASET_SCHEMAS",
    "CKAN__SCHEMING__ORGANIZATION_SCHEMAS",
    "CKAN__SCHEMING__GROUP_SCHEMAS",
    "CKAN__SCHEMING__PRESETS",
):
    if obsolete_key in values:
        raise SystemExit(
            f"Obsolete Scheming variable {obsolete_key} is still present in .env.ckan; "
            "run bootstrap-upstream.sh to remove it."
        )
if any(line.startswith(prefix) for line in rendered for prefix in (
    "CLOUDFLARE_TUNNEL_TOKEN=", "CKAN_ADMIN_BASIC_AUTH_PASSWORD=", "CKAN_ADMIN_BASIC_AUTH_HASH=", "NEXT_PUBLIC_", "CKANEXT__XLOADER__", "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_", "CKAN_REVALIDATE_SECRET="
)):
    raise SystemExit("Edge credentials or Next.js public variables must not enter CKAN service environment.")

destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text("\n".join(rendered) + "\n")
destination.chmod(0o600)
print(f"Rendered {len(rendered)} CKAN-only variables to {destination}; edge secrets excluded.")

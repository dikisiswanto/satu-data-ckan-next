#!/usr/bin/env python3
"""Guard CKAN 2.12 resource-view plugin IDs in deployment configuration."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
bootstrap = (root / "deploy/ckan/bootstrap-upstream.sh").read_text()
plugin_check = (root / "scripts/check-plugins.py").read_text()
errors: list[str] = []

# Legacy IDs must be removed when an existing .env.ckan is re-bootstrapped.
legacy = {
    "recline_view",
    "recline_grid_view",
    "recline_graph_view",
    "recline_map_view",
    "esri_shapefile_view",
}
portal_line = next((line for line in bootstrap.splitlines() if line.startswith("legacy_view_plugins = {")), "")
if not portal_line or not all(f'"{name}"' in bootstrap.split("legacy_view_plugins = {", 1)[1].split("}", 1)[0] for name in legacy):
    errors.append("Bootstrap harus mengenali semua ID resource-view lama agar dapat membersihkannya dari .env.ckan.")

plugin_block = bootstrap.split("for plugin in (", 1)[1].split("):", 1)[0] if "for plugin in (" in bootstrap else ""
default_views = re.search(r'^values\["CKAN__VIEWS__DEFAULT_VIEWS"\] = "([^"]*)"', bootstrap, re.M)
for name in legacy:
    if f'"{name}"' in plugin_block:
        errors.append(f"Plugin view lama {name} tidak boleh diaktifkan pada CKAN 2.12.")
    if default_views and name in default_views.group(1).split():
        errors.append(f"Plugin view lama {name} tidak boleh menjadi default view CKAN 2.12.")

for name in ("datatables_view", "geo_view", "geojson_view", "wmts_view", "shp_view", "image_view", "text_view"):
    if f'"{name}"' not in plugin_block:
        errors.append(f"Bootstrap harus mengaktifkan resource-view plugin yang valid: {name}.")
    if not default_views or name not in default_views.group(1).split():
        errors.append(f"Plugin {name} harus masuk ke daftar default resource views.")
    if f'"{name}"' not in plugin_check:
        errors.append(f"Smoke test harus memverifikasi entry point plugin {name}.")

if errors:
    print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
    raise SystemExit(1)
print("CKAN 2.12 resource-view configuration passed: DataTables and geoview IDs are valid; removed Recline IDs are filtered.")

#!/usr/bin/env python3
"""Verify pinned packages register the CKAN plugins configured by bootstrap."""
from importlib import import_module
from importlib.metadata import entry_points, version
import sys

registered = {entry.name for entry in entry_points(group="ckan.plugins")}
required = {
    # CKAN 2.12 core plugins.
    "datastore",
    "datatables_view",
    "image_view",
    "text_view",
    "resource_proxy",
    # Installed CKAN extensions.
    "scheming_datasets",
    "pages",
    "wajo_pages",
    "wajo_theme",
    "dcat",
    "dcat_rdf_harvester",
    "structured_data",
    "geo_view",
    "geojson_view",
    "wmts_view",
    "shp_view",
    "harvest",
    "ckan_harvester",
    "xloader",
    "envvars",
}

missing = sorted(required - registered)
if missing:
    sys.exit("Missing CKAN plugin entry points: " + ", ".join(missing))
# Entry-point presence alone is insufficient: XLoader 2.5.2 could be registered
# while its mandatory chardet runtime import was missing. Verify the real modules.
expected_versions = {"ckanext-xloader": "2.6.0", "chardet": "7.6.0"}
for distribution, expected in expected_versions.items():
    try:
        actual = version(distribution)
    except Exception as exc:
        sys.exit(f"Missing required runtime distribution {distribution}: {exc}")
    if actual != expected:
        sys.exit(f"Unexpected {distribution} version: {actual}; expected {expected}")

try:
    from chardet.universaldetector import UniversalDetector
    import_module("ckanext.xloader.plugin")
except Exception as exc:
    sys.exit(f"XLoader runtime import failed (including chardet UniversalDetector): {exc}")

if not callable(UniversalDetector):
    sys.exit("chardet.universaldetector.UniversalDetector is not callable")

print("CKAN extension entry points and XLoader runtime imports verified:", ", ".join(sorted(required)))

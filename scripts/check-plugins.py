#!/usr/bin/env python3
"""Verify pinned packages register the CKAN plugins configured by bootstrap."""
from importlib.metadata import entry_points
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
print("CKAN extension entry points available:", ", ".join(sorted(required)))

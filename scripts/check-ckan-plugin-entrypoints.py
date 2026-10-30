#!/usr/bin/env python3
"""Verify pinned packages register the CKAN plugins configured by bootstrap."""
from importlib.metadata import entry_points
import sys

registered = {entry.name for entry in entry_points(group="ckan.plugins")}
required = {
    "scheming_datasets",
    "pages",
    "datastore",
    "envvars",
    "wajo_theme",
    "dcat",
    "dcat_rdf_harvester",
    "structured_data",
    "geo_view",
    "geojson_view",
    "wmts_view",
    "esri_shapefile_view",
    "harvest",
    "ckan_harvester",
    "resource_proxy",
    "geojson_view",
    "wmts_view",
    "esri_shapefile_view",
    "image_view",
    "text_view",
    "recline_view",
}
missing = sorted(required - registered)
if missing:
    sys.exit("Missing CKAN plugin entry points: " + ", ".join(missing))
print("CKAN extension entry points available:", ", ".join(sorted(required)))

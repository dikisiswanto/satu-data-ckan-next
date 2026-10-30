#!/usr/bin/env python3
"""Verify pinned packages register the CKAN plugins configured by bootstrap."""
from importlib import import_module
from importlib.metadata import entry_points, version
import sys

registered = {entry.name for entry in entry_points(group="ckan.plugins")}
required = {
    # CKAN 2.12 core plugins.
    "datastore",
    "activity",
    "datatables_view",
    "image_view",
    "text_view",
    "resource_proxy",
    # Installed CKAN extensions.
    "scheming_datasets",
    "pages",
    "wajo_pages",
    "wajo_theme",
    "wajo_harvest_i18n",
    "wajo_pages_i18n",
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
# Entry-point presence alone is insufficient: XLoader must also import its
# mandatory chardet runtime module. Verify actual imports and translation domains.
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

try:
    from pathlib import Path
    theme_plugin = import_module("ckanext.wajo_theme.plugin")
    for class_name, domain in (
        ("WajoHarvestTranslationPlugin", "ckanext-harvest"),
        ("WajoPagesTranslationPlugin", "ckanext-pages"),
    ):
        plugin_class = getattr(theme_plugin, class_name)
        translation_plugin = plugin_class()
        i18n_directory = Path(translation_plugin.i18n_directory())
        if translation_plugin.i18n_domain() != domain:
            raise RuntimeError(f"{class_name} has the wrong gettext domain")
        if "id" not in translation_plugin.i18n_locales():
            raise RuntimeError(f"{class_name} does not advertise Indonesian locale")
        if not (i18n_directory / "id/LC_MESSAGES" / f"{domain}.mo").is_file():
            raise RuntimeError(f"Compiled Indonesian catalog is missing for {domain}")
except Exception as exc:
    sys.exit(f"Wajo Admin extension translation runtime check failed: {exc}")

print("CKAN extension entry points, XLoader imports, and Indonesian translation domains verified:", ", ".join(sorted(required)))

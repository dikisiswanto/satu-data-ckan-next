#!/usr/bin/env python3
"""Overlay maintained Wajo Indonesian strings on CKAN's existing core catalog.

CKAN ships/installs its own gettext catalog.  Replacing that file with the small
project-specific catalog would discard upstream Indonesian translations, so
this compiler merges the two: Wajo overrides take precedence, untranslated
custom messages never erase an upstream translation.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def compile_catalog(source: Path, i18n_directory: Path) -> Path:
    try:
        from babel.messages.catalog import Catalog
        from babel.messages.mofile import read_mo, write_mo
        from babel.messages.pofile import read_po
    except ImportError as error:  # pragma: no cover - available in CKAN base image
        raise SystemExit("Babel is required to compile CKAN translations.") from error

    if not source.is_file():
        raise SystemExit(f"Indonesian CKAN catalog not found: {source}")

    with source.open("r", encoding="utf-8") as handle:
        custom_catalog = read_po(handle, locale="id")

    translated = [message for message in custom_catalog if message.id and message.string]
    if len(translated) < 60:
        raise SystemExit(
            f"Indonesian Wajo catalog is unexpectedly small: {len(translated)} translated messages."
        )

    destination = i18n_directory / "id" / "LC_MESSAGES" / "ckan.mo"
    destination.parent.mkdir(parents=True, exist_ok=True)

    # Preserve the base CKAN catalog if the image/package already provides it.
    if destination.is_file():
        with destination.open("rb") as handle:
            merged_catalog = read_mo(handle)
    else:
        merged_catalog = Catalog(locale="id", domain="ckan")

    # Project metadata keeps the merged catalog correctly identified as id_ID.
    merged_catalog.mime_headers = list(custom_catalog.mime_headers)
    merged_catalog.locale = custom_catalog.locale
    merged_catalog.domain = "ckan"

    # Explicit project translations override the core catalog. Empty/fuzzy
    # entries are deliberately ignored so they cannot erase upstream strings.
    for message in translated:
        if "fuzzy" in message.flags:
            continue
        existing_message = merged_catalog.get(message.id, context=message.context)
        if existing_message is not None:
            existing_message.string = message.string
            existing_message.locations = list(dict.fromkeys(
                [*existing_message.locations, *message.locations]
            ))
            existing_message.flags.update(message.flags)
        else:
            merged_catalog.add(
                message.id,
                message.string,
                locations=message.locations,
                flags=message.flags,
                auto_comments=message.auto_comments,
                user_comments=message.user_comments,
                context=message.context,
            )

    with destination.open("wb") as handle:
        write_mo(handle, merged_catalog, use_fuzzy=False)
    return destination


EXTENSION_MODULES = {
    "ckanext-pages": "ckanext.pages",
    "ckanext-harvest": "ckanext.harvest",
    "ckanext-dcat": "ckanext.dcat",
}


def discover_upstream_extension_catalogs(domain: str) -> list[Path]:
    """Find Indonesian catalogs shipped by the corresponding installed extension.

    The Wajo plugins own these gettext domains at runtime, so their compiled
    catalogs must contain both upstream extension strings and local overrides.
    Wheels do not always include every locale file; a missing catalog is valid.
    """
    module_name = EXTENSION_MODULES.get(domain)
    if not module_name:
        return []
    try:
        spec = importlib.util.find_spec(module_name)
    except (ImportError, ModuleNotFoundError, ValueError):
        return []
    if spec is None:
        return []

    package_roots = [Path(root) for root in (spec.submodule_search_locations or [])]
    if not package_roots and spec.origin:
        package_roots = [Path(spec.origin).resolve().parent]

    found: set[Path] = set()
    for package_root in package_roots:
        for locale_dir in (package_root / "i18n", package_root / "locale", package_root / "translations"):
            if not locale_dir.is_dir():
                continue
            # Search only the Indonesian gettext locale to avoid loading other
            # languages or accidentally picking a generated non-runtime file.
            for suffix in ("mo", "po"):
                for catalog_path in locale_dir.rglob(f"{domain}.{suffix}"):
                    parts = catalog_path.parts
                    if "id" in parts and "LC_MESSAGES" in parts:
                        found.add(catalog_path.resolve())
    return sorted(found)


def _overlay_message_catalog(target, source_catalog) -> None:
    """Apply non-empty entries, preserving existing messages not in source."""
    for message in source_catalog:
        if not message.id or not message.string or "fuzzy" in message.flags:
            continue
        existing = target.get(message.id, context=message.context)
        if existing is not None:
            existing.string = message.string
            existing.locations = list(dict.fromkeys([*existing.locations, *message.locations]))
            existing.flags.update(message.flags)
        else:
            target.add(
                message.id,
                message.string,
                locations=message.locations,
                flags=message.flags,
                auto_comments=message.auto_comments,
                user_comments=message.user_comments,
                context=message.context,
            )


def compile_extension_catalog(
    source: Path,
    theme_i18n_directory: Path,
    upstream_catalog_paths: list[Path] | None = None,
) -> Path:
    """Merge installed extension translations with the maintained Wajo overrides."""
    try:
        from babel.messages.catalog import Catalog
        from babel.messages.mofile import read_mo, write_mo
        from babel.messages.pofile import read_po
    except ImportError as error:  # pragma: no cover - available in CKAN base image
        raise SystemExit("Babel is required to compile CKAN extension translations.") from error

    if not source.is_file() or not source.stem.startswith("ckanext-"):
        raise SystemExit(f"Invalid CKAN extension catalog: {source}")
    with source.open("r", encoding="utf-8") as handle:
        custom_catalog = read_po(handle, locale="id")
    translated = [message for message in custom_catalog if message.id and message.string]
    if not translated:
        raise SystemExit(f"CKAN extension catalog has no translated messages: {source}")

    domain = source.stem
    merged_catalog = Catalog(locale="id", domain=domain)
    upstream_paths = upstream_catalog_paths
    if upstream_paths is None:
        upstream_paths = discover_upstream_extension_catalogs(domain)
    merged_count = 0
    for upstream_path in upstream_paths:
        if not upstream_path.is_file():
            continue
        if upstream_path.suffix.lower() == ".po":
            with upstream_path.open("r", encoding="utf-8") as handle:
                upstream_catalog = read_po(handle, locale="id", domain=domain)
        else:
            with upstream_path.open("rb") as handle:
                upstream_catalog = read_mo(handle)
        _overlay_message_catalog(merged_catalog, upstream_catalog)
        merged_count += sum(
            1 for message in upstream_catalog
            if message.id and message.string and "fuzzy" not in message.flags
        )

    # Local translations have higher precedence, but empty/fuzzy entries must
    # never erase a usable upstream translation. Keep the source PO headers.
    _overlay_message_catalog(merged_catalog, custom_catalog)
    merged_catalog.mime_headers = list(custom_catalog.mime_headers)
    merged_catalog.locale = custom_catalog.locale
    merged_catalog.domain = domain

    destination = theme_i18n_directory / "id" / "LC_MESSAGES" / f"{domain}.mo"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as handle:
        write_mo(handle, merged_catalog, use_fuzzy=False)
    print(
        f"Merged {domain}: {merged_count} upstream message(s) + "
        f"{len(translated)} Wajo message(s) -> {destination}"
    )
    return destination


def compile_extension_catalogs(core_source: Path, theme_i18n_directory: Path) -> list[Path]:
    """Compile every additional ckanext-* domain while retaining upstream translations."""
    destinations = []
    for source in sorted(core_source.parent.glob("ckanext-*.po")):
        destinations.append(compile_extension_catalog(source, theme_i18n_directory))
    return destinations


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: compile-id-translations.py <ckan.po> <ckan-i18n-directory> <wajo-theme-i18n-directory>"
        )
    core_source = Path(sys.argv[1])
    destination = compile_catalog(core_source, Path(sys.argv[2]))
    extension_destinations = compile_extension_catalogs(core_source, Path(sys.argv[3]))
    print(f"Merged Indonesian CKAN catalog: {destination}")
    for extension_destination in extension_destinations:
        print(f"Compiled Indonesian extension catalog: {extension_destination}")


if __name__ == "__main__":
    main()

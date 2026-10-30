#!/usr/bin/env python3
"""Overlay maintained Wajo Indonesian strings on CKAN's existing core catalog.

CKAN ships/installs its own gettext catalog.  Replacing that file with the small
project-specific catalog would discard upstream Indonesian translations, so
this compiler merges the two: Wajo overrides take precedence, untranslated
custom messages never erase an upstream translation.
"""
from __future__ import annotations

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


def compile_extension_catalog(source: Path, theme_i18n_directory: Path) -> Path:
    """Compile one extension gettext domain into the installed Wajo package."""
    try:
        from babel.messages.mofile import write_mo
        from babel.messages.pofile import read_po
    except ImportError as error:  # pragma: no cover - available in CKAN base image
        raise SystemExit("Babel is required to compile CKAN extension translations.") from error

    if not source.is_file() or not source.stem.startswith("ckanext-"):
        raise SystemExit(f"Invalid CKAN extension catalog: {source}")
    with source.open("r", encoding="utf-8") as handle:
        catalog = read_po(handle, locale="id")
    translated = [message for message in catalog if message.id and message.string]
    if not translated:
        raise SystemExit(f"CKAN extension catalog has no translated messages: {source}")
    catalog.domain = source.stem
    destination = theme_i18n_directory / "id" / "LC_MESSAGES" / f"{source.stem}.mo"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as handle:
        write_mo(handle, catalog, use_fuzzy=False)
    return destination


def compile_extension_catalogs(core_source: Path, theme_i18n_directory: Path) -> list[Path]:
    """Compile every additional ckanext-* domain beside the core PO source."""
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

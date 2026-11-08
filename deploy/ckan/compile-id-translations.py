#!/usr/bin/env python3
"""Overlay maintained portal Indonesian strings on CKAN's existing core catalog.

CKAN ships/installs its own gettext catalog.  Replacing that file with the small
project-specific catalog would discard upstream Indonesian translations, so
this compiler merges the two: portal overrides take precedence, untranslated
custom messages never erase an upstream translation.
"""
from __future__ import annotations

import importlib.util
import shutil
import sys
from pathlib import Path


def compile_catalog(source: Path, i18n_directory: Path) -> Path:
    try:
        from babel.messages.catalog import Catalog
        from babel.messages.mofile import read_mo, write_mo
        from babel.messages.pofile import read_po, write_po
    except ImportError as error:  # pragma: no cover - available in CKAN base image
        raise SystemExit("Babel is required to compile CKAN translations.") from error

    if not source.is_file():
        raise SystemExit(f"Indonesian CKAN catalog not found: {source}")

    with source.open("r", encoding="utf-8") as handle:
        custom_catalog = read_po(handle, locale="id")

    translated = [message for message in custom_catalog if message.id and message.string]
    if len(translated) < 60:
        raise SystemExit(
            f"Indonesian portal catalog is unexpectedly small: {len(translated)} translated messages."
        )

    destination = i18n_directory / "id" / "LC_MESSAGES" / "ckan.mo"
    destination.parent.mkdir(parents=True, exist_ok=True)

    # Preserve the base CKAN catalog if the image/package already provides it.
    if destination.is_file():
        with destination.open("rb") as handle:
            merged_catalog = read_mo(handle)
    else:
        merged_catalog = Catalog(locale="id", domain="ckan")

    # Some CKAN source distributions include an Indonesian PO but do not ship
    # the matching MO. Consume that official source too so the portal catalog
    # does not silently fall back to English for those messages.
    upstream_po_path = destination.with_suffix(".po")
    if upstream_po_path.is_file():
        with upstream_po_path.open("r", encoding="utf-8") as handle:
            upstream_catalog = read_po(handle, locale="id", domain="ckan")
        _overlay_message_catalog(merged_catalog, upstream_catalog)

    # Project metadata keeps the merged catalog correctly identified as id_ID.
    merged_catalog.mime_headers = list(custom_catalog.mime_headers)
    merged_catalog.locale = custom_catalog.locale
    merged_catalog.domain = "ckan"

    # Explicit project translations override upstream. Empty/fuzzy entries are
    # ignored so they cannot erase a usable translation.
    _overlay_message_catalog(merged_catalog, custom_catalog)

    with destination.open("wb") as handle:
        write_mo(handle, merged_catalog, use_fuzzy=False)
    with upstream_po_path.open("wb") as handle:
        write_po(handle, merged_catalog, include_previous=False)
    available_count = sum(1 for message in merged_catalog if message.id)
    print(
        f"Merged CKAN core: {available_count} available message(s), "
        f"{len(translated)} portal translation(s) -> {destination}"
    )
    return destination


EXTENSION_MODULES = {
    "ckanext-pages": "ckanext.pages",
    "ckanext-harvest": "ckanext.harvest",
    "ckanext-dcat": "ckanext.dcat",
    "ckanext-xloader": "ckanext.xloader",
    "ckanext-geoview": "ckanext.geoview",
    "ckanext-scheming": "ckanext.scheming",
}


def discover_upstream_extension_catalogs(domain: str) -> list[Path]:
    """Find Indonesian catalogs shipped by the corresponding installed extension.

    The portal plugins own these gettext domains at runtime, so their compiled
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


def discover_upstream_extension_template(domain: str) -> Path | None:
    """Find the installed extension's Babel template used by CKAN's JS build."""
    module_name = EXTENSION_MODULES.get(domain)
    if not module_name:
        return None
    try:
        spec = importlib.util.find_spec(module_name)
    except (ImportError, ModuleNotFoundError, ValueError):
        return None
    if spec is None:
        return None

    package_roots = [Path(root) for root in (spec.submodule_search_locations or [])]
    if not package_roots and spec.origin:
        package_roots = [Path(spec.origin).resolve().parent]
    candidates = []
    for package_root in package_roots:
        for locale_dir in (package_root / "i18n", package_root / "locale", package_root / "translations"):
            if locale_dir.is_dir():
                candidates.extend(locale_dir.rglob(f"{domain}.pot"))
    return sorted(path.resolve() for path in candidates)[0] if candidates else None


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
    source: Path | None,
    theme_i18n_directory: Path,
    upstream_catalog_paths: list[Path] | None = None,
    domain: str | None = None,
) -> Path:
    """Merge installed extension translations with the maintained portal overrides."""
    try:
        from babel.messages.catalog import Catalog
        from babel.messages.mofile import read_mo, write_mo
        from babel.messages.pofile import read_po, write_po
    except ImportError as error:  # pragma: no cover - available in CKAN base image
        raise SystemExit("Babel is required to compile CKAN extension translations.") from error

    if source is not None and (not source.is_file() or not source.stem.startswith("ckanext-")):
        raise SystemExit(f"Invalid CKAN extension catalog: {source}")
    if source is not None:
        domain = source.stem
        with source.open("r", encoding="utf-8") as handle:
            custom_catalog = read_po(handle, locale="id", domain=domain)
    elif domain and domain.startswith("ckanext-"):
        custom_catalog = Catalog(locale="id", domain=domain)
    else:
        raise SystemExit(f"Extension domain is required when no local PO is supplied: {domain!r}")
    translated = [message for message in custom_catalog if message.id and message.string]
    if source is not None and not translated:
        raise SystemExit(f"CKAN extension catalog has no translated messages: {source}")

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
    if custom_catalog.mime_headers:
        merged_catalog.mime_headers = list(custom_catalog.mime_headers)
    merged_catalog.locale = custom_catalog.locale
    merged_catalog.domain = domain

    destination = theme_i18n_directory / "id" / "LC_MESSAGES" / f"{domain}.mo"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as handle:
        write_mo(handle, merged_catalog, use_fuzzy=False)
    with destination.with_suffix(".po").open("wb") as handle:
        write_po(handle, merged_catalog, include_previous=False)

    # CKAN's official `translation js` command reads POT files to decide which
    # gettext IDs are used in browser scripts. Reuse the extension template when
    # installed; otherwise emit one from the merged catalog locations.
    template_path = theme_i18n_directory / f"{domain}.pot"
    upstream_template = discover_upstream_extension_template(domain)
    if upstream_template:
        shutil.copyfile(upstream_template, template_path)
    else:
        from babel.messages.catalog import Catalog

        template_catalog = Catalog(domain=domain)
        for message in merged_catalog:
            if not message.id:
                continue
            template_catalog.add(
                message.id,
                None,
                locations=message.locations,
                flags=message.flags,
                auto_comments=message.auto_comments,
                user_comments=message.user_comments,
                context=message.context,
            )
        with template_path.open("wb") as handle:
            write_po(handle, template_catalog, include_previous=False)
    print(
        f"Merged {domain}: {merged_count} upstream message(s) + "
        f"{len(translated)} portal message(s) -> {destination}"
    )
    return destination


def compile_extension_catalogs(core_source: Path, theme_i18n_directory: Path) -> list[Path]:
    """Compile local overrides and supported upstream domains when available."""
    sources = {source.stem: source for source in core_source.parent.glob("ckanext-*.po")}
    # Emit a distinct directory for every managed domain. CKAN's JS compiler
    # keys plugin catalogs by i18n_directory, so sharing one directory silently
    # drops all but the final domain from the browser bundle.
    domains = set(sources) | set(EXTENSION_MODULES)

    destinations = []
    for domain in sorted(domains):
        destinations.append(
            compile_extension_catalog(
                sources.get(domain),
                theme_i18n_directory / domain,
                domain=domain,
            )
        )
    return destinations


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: compile-id-translations.py <ckan.po> <ckan-i18n-directory> <portal-theme-i18n-directory>"
        )
    core_source = Path(sys.argv[1])
    destination = compile_catalog(core_source, Path(sys.argv[2]))
    extension_destinations = compile_extension_catalogs(core_source, Path(sys.argv[3]))
    print(f"Merged Indonesian CKAN catalog: {destination}")
    for extension_destination in extension_destinations:
        print(f"Compiled Indonesian extension catalog: {extension_destination}")


if __name__ == "__main__":
    main()

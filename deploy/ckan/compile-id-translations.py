#!/usr/bin/env python3
"""Compile the maintained Indonesian CKAN catalog into CKAN's core i18n tree."""
from __future__ import annotations

import sys
from pathlib import Path


def compile_catalog(source: Path, i18n_directory: Path) -> Path:
    try:
        from babel.messages.mofile import write_mo
        from babel.messages.pofile import read_po
    except ImportError as error:  # pragma: no cover - available in CKAN base image
        raise SystemExit("Babel is required to compile CKAN translations.") from error

    if not source.is_file():
        raise SystemExit(f"Indonesian CKAN catalog not found: {source}")

    with source.open("r", encoding="utf-8") as handle:
        catalog = read_po(handle, locale="id")

    translated = [message for message in catalog if message.id and message.string]
    if len(translated) < 60:
        raise SystemExit(
            f"Indonesian CKAN catalog is unexpectedly small: {len(translated)} translated messages."
        )

    destination = i18n_directory / "id" / "LC_MESSAGES" / "ckan.mo"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as handle:
        write_mo(handle, catalog, use_fuzzy=False)
    return destination


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(
            "usage: compile-id-translations.py <ckan.po> <ckan-i18n-directory>"
        )
    destination = compile_catalog(Path(sys.argv[1]), Path(sys.argv[2]))
    print(f"Compiled Indonesian CKAN catalog: {destination}")


if __name__ == "__main__":
    main()

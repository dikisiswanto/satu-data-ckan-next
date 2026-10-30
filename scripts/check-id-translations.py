#!/usr/bin/env python3
"""Check maintained Indonesian CKAN messages, placeholders and core merge rules."""
from __future__ import annotations

import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N_DIR = ROOT / "deploy/ckan/theme/ckanext/wajo_theme/i18n/id/LC_MESSAGES"
PO = I18N_DIR / "ckan.po"
EXTENSION_POS = {
    "ckanext-harvest": I18N_DIR / "ckanext-harvest.po",
    "ckanext-pages": I18N_DIR / "ckanext-pages.po",
}
COMPILER = ROOT / "deploy/ckan/compile-id-translations.py"
ERRORS: list[str] = []


def placeholders(value: str) -> set[str]:
    # Preserve named/positional Python interpolation and Jinja-style placeholders.
    return set(re.findall(
        r"%\([^)]+\)[#0 +\-]*[0-9]*(?:\.[0-9]+)?[a-zA-Z]|"
        r"%(?:[#0 +\-]*[0-9]*(?:\.[0-9]+)?[bcdeEfFgGnosxX])|"
        r"\{[a-zA-Z_][a-zA-Z0-9_]*\}",
        value,
    ))


def main() -> None:
    try:
        from babel.messages.mofile import read_mo, write_mo
        from babel.messages.pofile import read_po
    except ImportError as error:
        raise SystemExit("Babel is required for the Indonesian translation checks.") from error

    catalogs = {"ckan": PO, **EXTENSION_POS}
    parsed_catalogs = {}
    for domain, path in catalogs.items():
        if not path.is_file():
            ERRORS.append(f"Maintained Indonesian catalog is missing: {path.name}")
            continue
        with path.open("r", encoding="utf-8") as handle:
            parsed_catalogs[domain] = read_po(handle, locale="id")

    for domain, catalog in parsed_catalogs.items():
        translated = [message for message in catalog if message.id]
        missing = [message for message in translated if not message.string]
        if missing:
            ERRORS.append(f"{domain}: {len(missing)} maintained message(s) have an empty translation.")
        for message in translated:
            if not message.string:
                continue
            source_ids = message.id if isinstance(message.id, tuple) else (message.id,)
            target_values = message.string if isinstance(message.string, tuple) else (message.string,)
            source_token_sets = [placeholders(value) for value in source_ids]
            for target in target_values:
                target_tokens = placeholders(target)
                if target_tokens not in source_token_sets:
                    ERRORS.append(
                        f"{domain}: placeholder mismatch for {source_ids[0]!r}: "
                        f"source={sorted(source_token_sets)}, translation={sorted(target_tokens)}"
                    )
                    break

    core_catalog = parsed_catalogs.get("ckan")
    translated = [message for message in core_catalog if message.id] if core_catalog else []
    required = {
        "Dashboard", "Log in", "Log out", "Save", "Cancel", "Delete", "Edit",
        "Search", "Filter", "Apply", "Clear", "Add Dataset", "Organizations",
        "Groups", "Users", "Resource", "Resources", "Preview", "Create",
        "Update", "Activity Stream", "Administration", "Site Settings",
        "Harvest Sources", "Harvest Jobs", "Pages", "Add Page", "Data Dictionary",
    }
    message_ids = {message.id if isinstance(message.id, str) else message.id[0] for message in translated}
    absent = sorted(required - message_ids)
    if absent:
        ERRORS.append(f"Required CKAN core admin translation keys are missing: {', '.join(absent)}")

    extension_required = {
        "ckanext-harvest": {"Harvest Sources", "Add Harvest Source", "Harvest Jobs", "Run", "Reharvest", "Frequency", "Source URL"},
        "ckanext-pages": {"Pages", "Add Page", "Edit Page", "Delete Page", "Page title", "Page content", "Show in menu"},
    }
    for domain, required_ids in extension_required.items():
        catalog = parsed_catalogs.get(domain)
        available = set()
        if catalog:
            available = {message.id if isinstance(message.id, str) else message.id[0] for message in catalog if message.id}
        absent = sorted(required_ids - available)
        if absent:
            ERRORS.append(f"{domain}: required admin strings are missing: {', '.join(absent)}")

    # Exercise the merge against a fixture base catalog. A custom string should
    # override core, while an unrelated upstream translation must survive.
    spec = __import__("importlib.util").util.spec_from_file_location("compile_id_translations", COMPILER)
    module = __import__("importlib.util").util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    with tempfile.TemporaryDirectory(prefix="wajo-id-catalog-merge-") as tmp:
        locale_root = Path(tmp)
        base_path = locale_root / "id/LC_MESSAGES/ckan.mo"
        base_path.parent.mkdir(parents=True)
        from babel.messages.catalog import Catalog
        base_catalog = Catalog(locale="id", domain="ckan")
        base_catalog.add("Dashboard", "Dasbor upstream")
        base_catalog.add("Core-only label", "Label inti")
        with base_path.open("wb") as handle:
            write_mo(handle, base_catalog)
        module.compile_catalog(PO, locale_root)
        with base_path.open("rb") as handle:
            merged = read_mo(handle)
        if merged.get("Dashboard").string != "Dasbor":
            ERRORS.append("Wajo translation must override an upstream translation for the same msgid.")
        if merged.get("Core-only label").string != "Label inti":
            ERRORS.append("Compiler must preserve upstream Indonesian messages absent from Wajo PO.")
        extension_output = locale_root / "wajo-theme-i18n"
        compiled_extensions = module.compile_extension_catalogs(PO, extension_output)
        if len(compiled_extensions) != len(EXTENSION_POS):
            ERRORS.append("Compiler must produce both Harvest and Pages Indonesian gettext domains.")
        for domain, expected_msgid, expected_msgstr in (
            ("ckanext-harvest", "Harvest Sources", "Sumber pengambilan data"),
            ("ckanext-pages", "Add Page", "Tambah halaman"),
        ):
            path = extension_output / "id/LC_MESSAGES" / f"{domain}.mo"
            if not path.is_file():
                ERRORS.append(f"Compiled extension catalog is missing: {domain}.mo")
                continue
            with path.open("rb") as handle:
                extension_mo = read_mo(handle)
            translated_message = extension_mo.get(expected_msgid)
            if translated_message is None or translated_message.string != expected_msgstr:
                ERRORS.append(f"{domain}: extension message {expected_msgid!r} did not compile correctly.")

    if ERRORS:
        print(f"Indonesian CKAN localization check failed ({len(ERRORS)}):", file=sys.stderr)
        for error in ERRORS:
            print(f"- {error}", file=sys.stderr)
        raise SystemExit(1)

    total_messages = sum(len([message for message in catalog if message.id]) for catalog in parsed_catalogs.values())
    print(
        f"Indonesian CKAN localization check passed: {total_messages} core/extension messages "
        "translated, placeholders preserved, and upstream/domain compilation verified."
    )


if __name__ == "__main__":
    main()

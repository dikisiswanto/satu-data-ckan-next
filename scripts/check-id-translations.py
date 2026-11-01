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
    path.stem: path
    for path in sorted(I18N_DIR.glob("ckanext-*.po"))
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
        from babel.messages.pofile import read_po, write_po
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
        fuzzy = [message for message in translated if "fuzzy" in message.flags]
        if missing:
            ERRORS.append(f"{domain}: {len(missing)} maintained message(s) have an empty translation.")
        if fuzzy:
            ERRORS.append(f"{domain}: {len(fuzzy)} maintained message(s) are marked fuzzy and will be omitted from compiled catalogs.")
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
        "Username", "Email", "Private", "State", "active", "deleted", "Datasets",
        "Update", "Activity Stream", "Administration", "Site Settings",
        "Harvest Sources", "Harvest Jobs", "Pages", "Add Page", "Data Dictionary",
        "Authorization function not found: %s", "Editor", "Member", "View", "Just now",
        "Add {object_type}", "Create {object_type}", "Edit {object_type}", "Save {object_type}",
        "Search {object_type}s...", "Missing value", "The input field %(name)s was not expected.",
        "Please enter an integer value", "Please enter a floating point value", "Must be a Unicode string value",
        "Package resource(s) invalid", "Tag vocabulary \"%s\" does not exist", "Not found",
        "Could not parse as valid JSON", "An organization must be provided", "Organization does not exist",
        "Invalid integer", "Must be a natural number", "Must be a positive integer", "Date format incorrect",
        "Dataset not found: %s", "Resource not found: %s", "User not found: %s", "Group not found: %s",
        "Names must be strings", "That name cannot be used", "Must be at least %s characters long",
        "Name must be a maximum of %i characters long", "That URL is already in use.",
        "Duplicate key \"%s\"", "Group name already exists in database",
        "Cannot modify your own sysadmin privileges", "User names must be strings",
        "The username is already associated with another account. Please use a different username.",
        "Please enter both passwords", "Passwords must be strings", "The passwords you entered do not match",
        "Edit not allowed as it looks like spam. Please avoid links in your description.",
        "There are no views created for this resource yet.", "There is no description for this dataset.", "Not seeing the views you were expecting?",
        "Click here for more information.", "Here are some reasons you may not be seeing expected views:",
        "Explore", "More information", "Go to resource", "API Endpoint", "Views", "No preview available",
        "An error occurred", "Loading data...", "Organization members", "Manage members", "Add member",
        "System Administrator", "Dashboard", "Home", "Help", "Documentation", "Statistics",
        "Access denied", "Internal server error", "Page not found", "Please check the form for errors",
        "There are errors in the form", "Changes saved", "Changes not saved", "Are you sure you want to continue?",
        "Sysadmins", "Config", "Site Title", "Custom Stylesheet", "Site logo", "Administer CKAN",
        "Landing page", "Home page", "Welcome to CKAN", "Placeholder",
        "This is a nice introductory paragraph about CKAN or the site in general. We don't have any copy to go here yet but soon we will",
        "CKAN config options", "Deleted organizations", "There are no organizations to purge",
        "DataStore", "Data Dictionary", "COLUMN FILTER/S", "Double-click to reset filters",
        "No results found", "No datasets found", 'No datasets found for "{query}"',
        "No groups found", 'No groups found for "{query}"',
        "No organizations found", 'No organizations found for "{query}"', "About CKAN",
        "You have not provided a biography.", "This user has no biography.", "Followers",
        "Open ID", "Member Since", "Last Active", "This information is visible to you and admins",
        "Frequency", "Frequency filter", "Filter by frequency",
        "Add information page", "Add news article",
    }
    message_ids = {
        source_id
        for message in translated
        for source_id in (message.id if isinstance(message.id, tuple) else (message.id,))
    }
    absent = sorted(required - message_ids)
    if absent:
        ERRORS.append(f"Required CKAN core admin translation keys are missing: {', '.join(absent)}")
    required_plural_pairs = {
        (
            '{number} dataset found for "{query}"',
            '{number} datasets found for "{query}"',
        ),
        ("{number} dataset found", "{number} datasets found"),
        (
            '{number} group found for "{query}"',
            '{number} groups found for "{query}"',
        ),
        (
            '{number} organization found for "{query}"',
            '{number} organizations found for "{query}"',
        ),
        ("{number} group found", "{number} groups found"),
        ("{number} organization found", "{number} organizations found"),
    }
    actual_plural_pairs = {
        message.id for message in translated if isinstance(message.id, tuple)
    }
    if not required_plural_pairs.issubset(actual_plural_pairs):
        ERRORS.append("CKAN core must contain every dataset/group/organization gettext plural pair (queried and unfiltered) used by CKAN 2.12.")

    expected_translations = {
        "ckan": {
            "Landing page": "Halaman utama",
            "Site Title": "Nama portal",
            "Administer CKAN": "Administrasi CKAN",
            "API Endpoint": "Titik akhir API",
            "No datasets found": "Tidak ada dataset yang ditemukan",
            'No datasets found for "{query}"': 'Tidak ada dataset yang ditemukan untuk "{query}"',
            'No groups found for "{query}"': 'Tidak ada grup yang ditemukan untuk "{query}"',
            'No organizations found for "{query}"': 'Tidak ada organisasi yang ditemukan untuk "{query}"',
            "You have not provided a biography.": "Anda belum mengisi biografi.",
            "This user has no biography.": "Pengguna ini belum mengisi biografi.",
            "Followers": "Pengikut",
            "Username": "Nama pengguna",
            "Email": "Email",
            "Private": "Privat",
            "State": "Status",
            "active": "Aktif",
            "deleted": "Dihapus",
            "Datasets": "Dataset",
            "Open ID": "OpenID",
            "Member Since": "Menjadi anggota sejak",
            "This information is visible to you and admins": "Informasi ini hanya dapat dilihat oleh Anda dan administrator.",
            "Frequency": "Frekuensi",
            "Frequency filter": "Filter frekuensi",
            "Filter by frequency": "Saring berdasarkan frekuensi",
            "Add information page": "Tambah halaman informasi",
            "Add news article": "Tambah artikel berita",
        },
        "ckanext-pages": {
            "Blog": "Berita dan artikel",
            "Add Blog Article": "Tambah artikel berita",
            "Edit Blog Article": "Ubah artikel berita",
        },
    }
    for domain, expected in expected_translations.items():
        catalog = parsed_catalogs.get(domain)
        for source, expected_value in expected.items():
            message = catalog.get(source) if catalog else None
            expected_values = expected_value if isinstance(expected_value, tuple) else (expected_value,)
            actual_values = message.string if message is not None and isinstance(message.string, tuple) else ((message.string,) if message is not None else ())
            if message is None or tuple(actual_values) != tuple(expected_values):
                actual = message.string if message is not None else "<missing>"
                ERRORS.append(f"{domain}: expected {source!r} -> {expected_value!r}, got {actual!r}.")

    # Catch accidental untranslated English entries even when msgstr is non-empty.
    # Canonical identifiers, file/protocol formats and role names may intentionally stay unchanged.
    unchanged_allowlist = {
        "ckan": {"API", "Data", "DataStore", "Dataset", "Editor", "Email", "Format", "Metadata", "Slug", "Status", "Tag", "URL", "URL:", "Label", "ID"},
        "ckanext-dcat": {"GUID", "URI"},
        "ckanext-harvest": {"Status", "URL"},
        "ckanext-pages": {"2005-01-01", "Slug", "Status", "URL"},
    }
    for domain, catalog in parsed_catalogs.items():
        permitted = unchanged_allowlist.get(domain, set())
        for message in catalog:
            if not message.id or not message.string:
                continue
            ids = message.id if isinstance(message.id, tuple) else (message.id,)
            translations = message.string if isinstance(message.string, tuple) else (message.string,)
            for source, translation in zip(ids, translations):
                if source == translation and source not in permitted:
                    ERRORS.append(f"{domain}: source text remains unchanged without an explicit technical-term allowlist: {source!r}")

    extension_required = {
        "ckanext-harvest": {
            "Harvest Sources", "Add Harvest Source", "Harvest Jobs", "Run", "Reharvest", "Frequency", "Frequency filter", "Filter by frequency", "Source URL",
            "Group not found", "Unauthorized to read group %s", "Groups", "Tags", "Formats", "Licence",
            "Not authorized to see this page", "Harvesting source successfully cleared",
            "Harvesting source successfully inactivated", "Harvest source not found",
            "Harvest will start shortly. Refresh this page for updates.",
            "Cannot create new harvest jobs on inactive sources. First, please change the source status to 'active'.",
            "A harvest job has already been scheduled for this source", "Harvest source cleared", "No content found",
            "Harvest job not found", "No jobs yet for this source", "User {0} not authorized to create harvest sources",
            "User not authorized to create a job for source {0}", "Only sysadmins can create harvest jobs for all sources",
            "Only the sysadmins can create harvest objects", "User {0} not authorized to delete harvest source {1}",
            "User {0} not authorized to read harvest source {1}", "User {0} not authorized to see jobs from source {1}",
            "User {0} not authorized to list jobs for source {1}", "User {0} not authorized to update harvest source {1}",
            "Only sysadmins can reimport all harvest objects", "Only sysadmins can run the pending harvest jobs",
            "Only sysadmins can reindex all harvest sources", "There are no datasets associated to this harvest source.",
            "Sorry no harvest sources found for \"{query}\"", "Sorry no harvest sources found",
            "There is no description for this harvest source", "Last Harvest Job", "View full job report",
            "Start a new harvesting job for this harvest source now", "Delete all harvest jobs and existing datasets from this source",
            "Return to the harvest sources list", "Search sources...", "Name Ascending", "Name Descending",
            "Last Modified", "All harvest sources", "Try another search term, browse the sources below or ",
            "add a new one", "Harvest Jobs", "Job: ", "Started:", "Not yet", "Finished:", "Job Report",
            "Back to job list", "Error Summary", "No errors for this job", "Only the 20 most frequent errors are shown",
            "Job Errors", "Document Errors", "Error Report", "documents with errors", "Remote content", "Local content",
        },
        "ckanext-pages": {
            "Pages", "Blog", "What are Pages?", "Add Blog Article", "Edit Blog Article", "eg. Blog Article Title",
            "Add page", "Edit page", "eg. Page Title", "Publish Date", "2005-01-01", "Visibility", "Private", "Public",
            "Menu Order", "Not in Menu", "Enter content here", "My content", "Add", "Are you sure you want to delete this Page?",
            "This page currently has no content", "More", "Edit Article", "Blog Articles", "Add Article", "Confirm Delete",
            "Are you sure you want to delete page - {name}?", "There are currently no blog articles here",
            "There are currently no pages here", "Page name already exists in database", "Not authorized to see this page",
            "User %s not authorized to read this page", "Organization not found", "Unauthorized to read organization %s",
            "Page Not Found", "Unauthorized to delete page", "Group not found", "Unauthorized to read group %s",
            "ERROR: View not found {view_id}", "Your browser does not support iframes.",
            "Unauthorized to create or edit a page", "Only Posting is availiable", "Unauthorized to upload file %s",
        },
        "ckanext-dcat": {
            "URI", "GUID", "Theme", "Identifier", "Alternate identifier", "Issued", "Modified", "Version notes",
            "Language", "Frequency", "Frequency filter", "Filter by frequency", "Conforms to", "Spatial URI", "Start of temporal extent", "End of temporal extent",
            "Publisher URI", "Publisher name", "Publisher email", "Publisher URL", "Publisher type", "Contact name",
            "Contact email", "Contact URI", "Download URL", "Media type", "Size", "Rights", "Created",
        },
    }
    for domain, required_ids in extension_required.items():
        catalog = parsed_catalogs.get(domain)
        available = set()
        if catalog:
            available = {message.id if isinstance(message.id, str) else message.id[0] for message in catalog if message.id}
        absent = sorted(required_ids - available)
        if absent:
            ERRORS.append(f"{domain}: required upstream extension strings are missing: {', '.join(absent)}")

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
        import gettext
        with base_path.open("rb") as handle:
            runtime_catalog = gettext.GNUTranslations(handle)
        dataset_description_prompt = runtime_catalog.gettext("There is no description for this dataset.")
        if dataset_description_prompt != "Belum ada deskripsi untuk dataset ini.":
            ERRORS.append(
                "Compiled CKAN core catalog must render the empty dataset description in Indonesian: "
                f"{dataset_description_prompt!r}."
            )
        search_result = runtime_catalog.ngettext(
            '{number} dataset found for "{query}"',
            '{number} datasets found for "{query}"',
            7,
        ).format(number=7, query="menara")
        if search_result != '7 dataset ditemukan untuk "menara"':
            ERRORS.append(
                "Compiled core gettext plural for queried dataset search must render Indonesian: "
                f"{search_result!r}."
            )
        empty_query_search_result = runtime_catalog.ngettext(
            "{number} dataset found", "{number} datasets found", 7
        ).format(number=7)
        if empty_query_search_result != "7 dataset ditemukan":
            ERRORS.append(
                "Compiled core gettext plural for unfiltered dataset search must render Indonesian: "
                f"{empty_query_search_result!r}."
            )
        percent_search_result = runtime_catalog.ngettext(
            '%(count)s dataset found for "%(query)s".',
            '%(count)s datasets found for "%(query)s".',
            7,
        ) % {"count": 7, "query": "menara"}
        if percent_search_result != '7 dataset ditemukan untuk "menara".':
            ERRORS.append(
                "Compiled core gettext percent-style plural for queried dataset search must render Indonesian: "
                f"{percent_search_result!r}."
            )
        percent_empty_query_result = runtime_catalog.ngettext(
            "%(count)s dataset found.", "%(count)s datasets found.", 7
        ) % {"count": 7}
        if percent_empty_query_result != "7 dataset ditemukan.":
            ERRORS.append(
                "Compiled core gettext percent-style plural for unfiltered dataset search must render Indonesian: "
                f"{percent_empty_query_result!r}."
            )
        search_types = (
            ("dataset", "dataset", "dataset"),
            ("group", "grup", "grup"),
            ("organization", "organisasi", "organisasi"),
        )
        for source_type, translated_type, query_value in search_types:
            for has_query in (True, False):
                suffix = f' for "{{query}}"' if has_query else ""
                singular = f"{{number}} {source_type} found{suffix}"
                plural = f"{{number}} {source_type}s found{suffix}"
                for number in (1, 3):
                    actual = runtime_catalog.ngettext(singular, plural, number).format(
                        number=number, query=query_value
                    )
                    expected = (
                        f'{number} {translated_type} ditemukan untuk "{query_value}"'
                        if has_query else f"{number} {translated_type} ditemukan"
                    )
                    if actual != expected:
                        ERRORS.append(
                            f"Compiled CKAN {source_type} search count must render {expected!r}, got {actual!r}."
                        )

        empty_searches = (
            ('No datasets found', 'Tidak ada dataset yang ditemukan'),
            ('No datasets found for "{query}"', 'Tidak ada dataset yang ditemukan untuk "menara"'),
            ('No groups found', 'Grup tidak ditemukan'),
            ('No groups found for "{query}"', 'Tidak ada grup yang ditemukan untuk "pangan"'),
            ('No organizations found', 'Organisasi tidak ditemukan'),
            ('No organizations found for "{query}"', 'Tidak ada organisasi yang ditemukan untuk "dinas"'),
        )
        for source, expected in empty_searches:
            query = "dinas" if "organization" in source else "pangan" if "group" in source else "menara"
            actual = runtime_catalog.gettext(source).format(query=query)
            if actual != expected:
                ERRORS.append(
                    f"Compiled CKAN empty-search label {source!r} must render {expected!r}, got {actual!r}."
                )
        for source, expected in (
            ("You have not provided a biography.", "Anda belum mengisi biografi."),
            ("This user has no biography.", "Pengguna ini belum mengisi biografi."),
            ("Followers", "Pengikut"),
            ("Username", "Nama pengguna"),
            ("State", "Status"),
            ("active", "Aktif"),
            ("Member Since", "Menjadi anggota sejak"),
        ):
            actual = runtime_catalog.gettext(source)
            if actual != expected:
                ERRORS.append(f"Compiled CKAN user label {source!r} must render {expected!r}, got {actual!r}.")
        for source, expected in (
            ("Frequency", "Frekuensi"),
            ("Frequency filter", "Filter frekuensi"),
            ("Filter by frequency", "Saring berdasarkan frekuensi"),
        ):
            if runtime_catalog.gettext(source) != expected:
                ERRORS.append(f"Compiled core gettext label {source!r} must be {expected!r}.")
        extension_output = locale_root / "wajo-theme-i18n"
        compiled_extensions = module.compile_extension_catalogs(PO, extension_output)
        if len(compiled_extensions) != len(EXTENSION_POS):
            ERRORS.append("Compiler must produce every maintained Indonesian extension gettext domain.")
        # Extension domains must merge, not replace, the upstream extension .mo.
        upstream_extension_path = locale_root / "upstream-pages/id/LC_MESSAGES/ckanext-pages.mo"
        upstream_extension_path.parent.mkdir(parents=True, exist_ok=True)
        upstream_extension = Catalog(locale="id", domain="ckanext-pages")
        upstream_extension.add("Blog", "Blog upstream")
        upstream_extension.add("Upstream-only page label", "Label halaman dari upstream")
        with upstream_extension_path.open("wb") as handle:
            write_mo(handle, upstream_extension)
        merged_extension_path = module.compile_extension_catalog(
            EXTENSION_POS["ckanext-pages"], extension_output, [upstream_extension_path]
        )
        with merged_extension_path.open("rb") as handle:
            merged_extension = read_mo(handle)
        if merged_extension.get("Blog").string != "Berita dan artikel":
            ERRORS.append("Wajo extension translation must override upstream translations for the same msgid.")
        if merged_extension.get("Upstream-only page label").string != "Label halaman dari upstream":
            ERRORS.append("Extension compiler must preserve upstream Indonesian messages absent from Wajo PO.")

        # An upstream extension may ship a PO instead of a compiled MO.
        upstream_po_path = locale_root / "upstream-pages-po/id/LC_MESSAGES/ckanext-pages.po"
        upstream_po_path.parent.mkdir(parents=True, exist_ok=True)
        upstream_po_catalog = Catalog(locale="id", domain="ckanext-pages")
        upstream_po_catalog.add("PO-only page label", "Label PO upstream")
        with upstream_po_path.open("wb") as handle:
            write_po(handle, upstream_po_catalog)
        po_extension_output = locale_root / "upstream-po-output"
        po_merged_path = module.compile_extension_catalog(
            EXTENSION_POS["ckanext-pages"], po_extension_output, [upstream_po_path]
        )
        with po_merged_path.open("rb") as handle:
            po_merged = read_mo(handle)
        if po_merged.get("PO-only page label").string != "Label PO upstream":
            ERRORS.append("Extension compiler must also preserve upstream Indonesian PO catalogs.")

        # A fuzzy Wajo translation must not shadow a valid upstream string.
        fuzzy_source = locale_root / "fixture-theme/ckanext-pages.po"
        fuzzy_source.parent.mkdir(parents=True, exist_ok=True)
        fuzzy_catalog = Catalog(locale="id", domain="ckanext-pages")
        fuzzy_catalog.add("Upstream-only page label", "Terjemahan fuzzy", flags=["fuzzy"])
        with fuzzy_source.open("wb") as handle:
            write_po(handle, fuzzy_catalog)
        fuzzy_extension_output = locale_root / "fuzzy-output"
        fuzzy_merged_path = module.compile_extension_catalog(
            fuzzy_source, fuzzy_extension_output, [upstream_extension_path]
        )
        with fuzzy_merged_path.open("rb") as handle:
            fuzzy_merged = read_mo(handle)
        if fuzzy_merged.get("Upstream-only page label").string != "Label halaman dari upstream":
            ERRORS.append("Fuzzy Wajo extension entries must not replace valid upstream Indonesian messages.")

        for domain, expected_msgid, expected_msgstr in (
            ("ckanext-harvest", "Harvest Sources", "Sumber pengambilan data"),
            ("ckanext-harvest", "Frequency filter", "Filter frekuensi"),
            ("ckanext-pages", "Add Page", "Tambah halaman"),
            ("ckanext-dcat", "Publisher name", "Nama penerbit"),
            ("ckanext-dcat", "Frequency filter", "Filter frekuensi"),
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
        "translated, no accidental source-equals-translation entries, placeholders preserved, "
        "and upstream/domain compilation verified."
    )


if __name__ == "__main__":
    main()

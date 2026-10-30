"""Register Wajo admin theme and editorial metadata schema for ckanext-pages."""

import json

import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
from ckanext.pages.interfaces import IPagesSchema


ALLOWED_CONTENT_BLOCK_TYPES = {
    "hero",
    "rich_text",
    "image",
    "gallery",
    "stats",
    "dataset_links",
    "publication_list",
    "cta",
    "divider",
}
MAX_CONTENT_BLOCKS_BYTES = 80_000
MAX_CONTENT_BLOCK_COUNT = 16


def validate_content_blocks(key, data, errors, context):
    """Reject invalid/unsupported block JSON before saving it to Pages extras."""
    value = data.get(key)
    if value is None or value == "":
        return
    if not isinstance(value, str) or len(value.encode("utf-8")) > MAX_CONTENT_BLOCKS_BYTES:
        errors.setdefault(key, []).append(
            "Content blocks harus berupa JSON dengan ukuran maksimal 80 KB."
        )
        return
    try:
        blocks = json.loads(value)
    except (TypeError, ValueError):
        errors.setdefault(key, []).append("Content blocks harus berupa JSON yang valid.")
        return
    if not isinstance(blocks, list):
        errors.setdefault(key, []).append("Content blocks harus berupa JSON array.")
        return
    if len(blocks) > MAX_CONTENT_BLOCK_COUNT:
        errors.setdefault(key, []).append("Maksimal 16 komponen dalam satu halaman.")
        return
    for index, block in enumerate(blocks):
        if not isinstance(block, dict) or block.get("type") not in ALLOWED_CONTENT_BLOCK_TYPES:
            errors.setdefault(key, []).append(
                f"Komponen nomor {index + 1} harus memakai tipe yang didukung."
            )
            return


class WajoPagesSchemaPlugin(plugins.SingletonPlugin):
    """Add structured editorial fields to the existing CKAN Pages records.

    Keep this plugin before ``pages`` in ``ckan.plugins`` so the Pages extension
    sees these fields when it builds its NAVL schema. Values are stored in the
    extension's existing ``extras`` JSON column; no additional DB table/migration
    is required.
    """

    plugins.implements(IPagesSchema, inherit=True)

    def update_pages_schema(self, schema):
        ignore_missing = toolkit.get_validator("ignore_missing")
        unicode_safe = toolkit.get_validator("unicode_safe")
        boolean_validator = toolkit.get_validator("boolean_validator")

        for field in (
            "excerpt",
            "category",
            "seo_title",
            "seo_description",
            "og_image",
            "template_type",
            "menu_label",
            "menu_order",
        ):
            schema[field] = [ignore_missing, unicode_safe]

        schema["content_blocks"] = [ignore_missing, unicode_safe, validate_content_blocks]

        for field in ("featured", "show_in_menu"):
            schema[field] = [ignore_missing, boolean_validator]

        return schema


class WajoThemePlugin(plugins.SingletonPlugin):
    """Load the Wajo-branded CKAN admin templates and WebAssets bundle."""

    plugins.implements(plugins.IConfigurer)

    def update_config(self, config):
        toolkit.add_template_directory(config, "templates")
        toolkit.add_public_directory(config, "public")
        toolkit.add_resource("assets", "wajo_theme")

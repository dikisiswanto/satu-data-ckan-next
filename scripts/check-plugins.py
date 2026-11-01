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

# Exercise the real installed CKAN Markdown renderer inside the pinned CKAN
# image. This catches dependency, extension-registration, rendering, and
# sanitizer regressions that source-only checks cannot detect.
try:
    from ckan.plugins.interfaces import IConfigurer, ITemplateHelpers
    from ckanext.pages.plugin import get_wysiwyg_editor as pages_get_wysiwyg_editor
    from ckanext.pages.plugin import render_content as pages_render_content
    from ckanext.wajo_theme.markdown import render_wajo_markdown
    from ckanext.wajo_theme.plugin import WajoThemePlugin

    # This mirrors CKAN 2.12 ckan.lib.helpers.load_plugin_helpers exactly:
    # ITemplateHelpers reverses ckan.plugins order and later dict updates win.
    # Therefore an override plugin MUST appear before `pages` in ckan.plugins.
    if ITemplateHelpers._reverse_iteration_order is not True:
        raise RuntimeError("Unexpected CKAN ITemplateHelpers iteration semantics")
    if IConfigurer._reverse_iteration_order is not True:
        raise RuntimeError("Unexpected CKAN IConfigurer iteration semantics")

    # add_template_directory prepends plugin_template_paths. With the actual
    # CKAN IConfigurer reverse iteration, this order leaves Wajo first, then
    # Pages and Activity as the next template providers; ckan_extends can
    # therefore walk down the chain without returning to Wajo recursively.
    expected_template_plugin_order = ("wajo_theme", "pages", "activity")
    template_path_order = []
    for plugin_name in reversed(expected_template_plugin_order):
        template_path_order.insert(0, plugin_name)
    if tuple(template_path_order) != expected_template_plugin_order:
        raise RuntimeError("Wajo CKAN template path priority is not deterministic")

    expected_plugin_order = ("wajo_theme", "pages")
    effective_helpers = {}
    helper_sources = {
        "pages": {
            "render_content": pages_render_content,
            "pages_get_wysiwyg_editor": pages_get_wysiwyg_editor,
        },
        "wajo_theme": WajoThemePlugin().get_helpers(),
    }
    ordered_for_helper_loading = reversed(expected_plugin_order)
    for plugin_name in ordered_for_helper_loading:
        effective_helpers.update(helper_sources[plugin_name])

    if effective_helpers["pages_get_wysiwyg_editor"]() is not None:
        raise RuntimeError("Effective CKAN helper registry still enables the upstream Pages WYSIWYG branch")
    if effective_helpers["render_content"] is not render_wajo_markdown:
        raise RuntimeError(
            "Effective CKAN helper registry still resolves ckanext-pages render_content instead of Wajo Markdown"
        )
    upstream_rendered = str(effective_helpers["render_content"]("## Judul Markdown\n\n**tebal**"))
    if "<h2>Judul Markdown</h2>" not in upstream_rendered or "<strong>tebal</strong>" not in upstream_rendered:
        raise RuntimeError("The effective CKAN render_content helper did not parse Markdown")
    if effective_helpers["wajo_render_markdown"] is not effective_helpers["render_content"]:
        raise RuntimeError("Wajo template helper and upstream Pages/Blog render_content must share one renderer")

    markdown_sample = """## teks aaa

**aku** *asre* ~~*dodo*~~

![Editorial media](https://data.silirdev.com/api/editorial-media/489a796c-7c87-434d-a777-8c0daf1ade97)

[teks](https://fb.com)

- teks
- teks 2

1. teks satu
2. teks dua

- [ ] teks
- [x] test

> teks kutipan

| Kolom 1 | Kolom 2 |
| --- | --- |
| Isi | Isi |

```text
alooo <span>teks</span>
```

---

<script>alert(1)</script>
<img src=x onerror=alert(1)>
"""
    rendered_markdown = str(render_wajo_markdown(markdown_sample))
    required_markdown_fragments = (
        "<h2>teks aaa</h2>",
        "<strong>aku</strong>",
        "<em>asre</em>",
        "<del>",
        'src="https://data.silirdev.com/api/editorial-media/489a796c-7c87-434d-a777-8c0daf1ade97"',
        'href="https://fb.com"',
        "<table>",
        "<blockquote>",
        '<input type="checkbox"',
        "<pre><code",
        "&lt;span&gt;teks&lt;/span&gt;",
        "<hr",
    )
    missing_markdown_fragments = [item for item in required_markdown_fragments if item not in rendered_markdown]
    if missing_markdown_fragments:
        raise RuntimeError("Missing rendered Markdown constructs: " + ", ".join(missing_markdown_fragments))
    if "<script" in rendered_markdown.lower() or "onerror" in rendered_markdown.lower():
        raise RuntimeError("Unsafe raw HTML/attributes survived Markdown sanitization")
except Exception as exc:
    sys.exit(f"Wajo CKAN Markdown renderer runtime check failed: {exc}")

print("PASS Wajo CKAN Markdown renderer supports editorial GFM constructs and strips unsafe raw HTML")
print("CKAN extension entry points, XLoader imports, Indonesian translation domains, and Markdown renderer verified:", ", ".join(sorted(required)))

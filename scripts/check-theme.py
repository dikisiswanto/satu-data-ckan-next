#!/usr/bin/env python3
"""Static regression guard for the Wajo CKAN 2.12 admin theme."""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "deploy/ckan/theme"
PACKAGE = THEME / "ckanext/wajo_theme"
PLUGIN = PACKAGE / "plugin.py"
SETUP = THEME / "setup.py"
BASE = PACKAGE / "templates/base.html"
HEADER = PACKAGE / "templates/header.html"
CSS = PACKAGE / "assets/css/wajo-theme.css"
ASSETS = PACKAGE / "assets/webassets.yml"
LOGO = PACKAGE / "public/logo-kabupaten-wajo.webp"
ENV_EXAMPLE = ROOT / ".env.ckan.example"
BOOTSTRAP = ROOT / "deploy/ckan/bootstrap-upstream.sh"
ERRORS: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        ERRORS.append(message)


def read(path: Path) -> str:
    if not path.is_file():
        ERRORS.append(f"File theme wajib tidak ditemukan: {path.relative_to(ROOT)}")
        return ""
    return path.read_text(encoding="utf-8")


plugin_source = read(PLUGIN)
setup_source = read(SETUP)
base_source = read(BASE)
header_source = read(HEADER)
css_source = read(CSS)
assets_source = read(ASSETS)
env_source = read(ENV_EXAMPLE)
bootstrap_source = read(BOOTSTRAP)

# Catch syntax errors in the Python package without importing CKAN at test time.
for path in (PLUGIN, SETUP):
    source = read(path)
    try:
        ast.parse(source, filename=str(path))
    except SyntaxError as error:
        ERRORS.append(f"Syntax Python error di {path.relative_to(ROOT)}:{error.lineno}: {error.msg}")

# The extension must use CKAN's supported template/public/WebAssets APIs.
for expected in (
    "class WajoThemePlugin(plugins.SingletonPlugin)",
    "plugins.implements(plugins.IConfigurer)",
    'toolkit.add_template_directory(config, "templates")',
    'toolkit.add_public_directory(config, "public")',
    'toolkit.add_resource("assets", "wajo_theme")',
):
    require(expected in plugin_source, f"Registrasi theme CKAN tidak lengkap: {expected}")

require("{% ckan_extends %}" in base_source, "base.html harus mewarisi template base CKAN, bukan menggantikannya.")
styles_block = re.search(r"{%\s*block\s+styles\s*%}([\s\S]*?){%\s*endblock\s*%}", base_source)
styles_body = styles_block.group(1) if styles_block else ""
require(bool(styles_block) and "{{ super() }}" in styles_body, "base.html harus mempertahankan CSS bawaan CKAN melalui block styles + super().")
asset_call = re.compile(r"{%\s*asset\s+(['\"])wajo_theme/wajo_theme\1\s*%}")
require(bool(asset_call.search(styles_body)), "Bundle WebAssets wajo_theme harus dimuat di dalam block styles pada base.html.")
require("{% ckan_extends %}" in header_source, "header.html harus mewarisi header CKAN.")
require("{% block header_logo %}" in header_source, "Override header harus memakai block header_logo CKAN 2.12.1.")
require("h.url_for('dashboard.datasets') if c.userobj else h.url_for('user.login')" in header_source, "Tautan logo harus aman untuk pengguna login maupun belum login.")
require("g.site_title" in header_source and "h.url_for_static_or_external(g.site_logo)" in header_source, "Branding harus tetap mengikuti konfigurasi site title/logo CKAN.")

# Verify WebAssets bundle name and its CSS file are consistent.
require(bool(re.search(r"(?m)^wajo_theme:\s*$", assets_source)), "webassets.yml harus mendeklarasikan bundle wajo_theme.")
require("css/wajo-theme.css" in assets_source, "Bundle wajo_theme harus memuat CSS yang dipelihara.")
require("wajo-theme/%(version)s-wajo-theme.css" in assets_source, "Output bundle harus memakai nama versi agar cache dapat diinvalisasi.")
require("cssrewrite" not in assets_source, "Bundle Wajo tidak boleh menjalankan cssrewrite pada stylesheet tanpa referensi URL; filter ini memicu kegagalan pemetaan asset di CKAN.")

# CKAN's add_public_directory exposes extension public files from URL root.
logo_url = "/logo-kabupaten-wajo.webp"
require(LOGO.is_file() and LOGO.stat().st_size > 0, "Logo publik Wajo tidak ditemukan atau kosong.")
require(f"CKAN__SITE_LOGO={logo_url}" in env_source, "CKAN__SITE_LOGO harus memakai URL root yang sesuai dengan add_public_directory().")
require('site_logo = values.get("CKAN__SITE_LOGO", "/logo-kabupaten-wajo.webp")' in bootstrap_source, "Bootstrap default logo path tidak sinkron dengan public directory.")
require('if site_logo in {"", "/base/logo-kabupaten-wajo.webp"}' in bootstrap_source, "Bootstrap harus memigrasikan path logo lama /base/ yang tidak sesuai.")

# Ensure the extension is packaged and actually installed into the pinned image.
require('"wajo_theme = ckanext.wajo_theme.plugin:WajoThemePlugin"' in setup_source, "Entry point plugin wajo_theme tidak terdaftar pada setup.py.")
require('"wajo_pages = ckanext.wajo_theme.plugin:WajoPagesSchemaPlugin"' in setup_source, "Entry point schema CMS wajo_pages tidak terdaftar pada setup.py.")
require("IPagesSchema" in plugin_source and "def update_pages_schema(self, schema)" in plugin_source, "Plugin Wajo harus memperluas schema ckanext-pages melalui IPagesSchema.")
require("def validate_content_blocks(key, data, errors, context)" in plugin_source and "json.loads(value)" in plugin_source and "MAX_CONTENT_BLOCK_COUNT = 16" in plugin_source, "Schema CMS harus memvalidasi JSON blocks, jumlah komponen, dan tipe yang didukung sebelum tersimpan.")
for field in ("excerpt", "category", "seo_title", "seo_description", "og_image", "template_type", "menu_label", "menu_order", "content_blocks", "featured", "show_in_menu"):
    require(f'"{field}"' in plugin_source, f"Field editorial {field} belum didaftarkan pada schema CKAN Pages.")
manifest = read(THEME / "MANIFEST.in")
for expected in (
    "templates *.html",
    "assets *.yml *.css",
    "public *",
):
    require(expected in manifest, f"MANIFEST.in tidak memasukkan {expected}.")
configurator = read(ROOT / "deploy/ckan/configure-upstream-extensions.py")
require("shutil.copytree(theme_source, theme_destination)" in configurator, "Bootstrap tidak menyalin source extension theme ke build context.")
require("USER root\nRUN python -m pip install --no-cache-dir -r /tmp/portal-ckan-extensions.txt /tmp/portal-ckan-theme" in configurator, "Docker build harus memasang extension/theme secara global sebagai root sebelum kembali ke user runtime CKAN.")
plugin_order_match = re.search(r"for plugin in \(\s*([\s\S]*?)\s*\):", bootstrap_source)
plugin_order = re.findall(r'"([a-z0-9_]+)"', plugin_order_match.group(1)) if plugin_order_match else []
require(
    all(name in plugin_order for name in ("scheming_datasets", "wajo_pages", "pages"))
    and plugin_order.index("scheming_datasets") < plugin_order.index("wajo_pages") < plugin_order.index("pages"),
    "wajo_pages harus dimuat setelah Scheming dan sebelum plugin pages.",
)
require("plugins.append(\"wajo_theme\")" in bootstrap_source, "Plugin theme harus diaktifkan setelah extension yang juga menyediakan template.")
require('plugins.append("envvars")' in bootstrap_source, "Plugin envvars harus tetap berada terakhir.")
workflow = read(ROOT / ".github/workflows/ci.yml")
require("COPY deploy/ckan/theme/ /tmp/portal-ckan-theme/" in workflow, "CI Docker smoke image harus memasukkan source package wajo_theme.")
require("USER root" in workflow and "RUN python -m pip install --no-cache-dir -r /tmp/portal-ckan-extensions.txt /tmp/portal-ckan-theme" in workflow and "check-plugins.py" in workflow, "CI harus memasang extension/theme secara global sebagai root sebelum memeriksa entry point plugin.")
for caddy_name in ("Caddyfile", "Caddyfile.basic-auth", "Caddyfile.tunnel", "Caddyfile.tunnel.access", "Caddyfile.tunnel.basic-auth"):
    caddy = read(ROOT / "deploy/ckan" / caddy_name)
    require("came_from=%2Fdashboard%2Fdatasets" in caddy, f"{caddy_name}: redirect login harus kembali ke dashboard dataset, bukan halaman konfigurasi khusus sysadmin.")
    require("%2Fckan-admin%2Fconfig%2F" not in caddy, f"{caddy_name}: landing admin lama hanya bisa diakses sysadmin dan membingungkan editor.")

# Keep the extension intentionally additive: only common shell templates are overridden.
actual_templates = sorted(path.relative_to(PACKAGE / "templates").as_posix() for path in (PACKAGE / "templates").rglob("*.html"))
require(actual_templates == ["base.html", "ckanext_pages/base_form.html", "header.html"], "Theme hanya boleh mengganti shell bersama dan form editorial Pages, bukan template fitur CKAN lainnya.")
CMS_FORM = PACKAGE / "templates/ckanext_pages/base_form.html"
form_source = read(CMS_FORM)
require("{% ckan_extends %}" in form_source and "{% block extra_pages_form %}" in form_source, "Form CMS harus mewarisi form upstream dan mengisi block extra_pages_form.")
require(all(f'name=\"{field}\"' in form_source for field in ("excerpt", "category", "template_type", "featured", "show_in_menu", "seo_title", "seo_description", "og_image", "content_blocks")), "Form CMS belum menampilkan semua field editorial penting.")
require("errors.content_blocks" in form_source, "Form CMS harus menampilkan kesalahan validasi JSON content blocks.")
require(not re.search(r"{%\s*set\b", form_source), "Form CMS tidak boleh memakai assignment tag Jinja; gunakan ekspresi inline agar kompatibilitas template tetap sederhana.")
prettierignore = read(ROOT / ".prettierignore")
require("deploy/ckan/theme/**/*.html" in prettierignore, "Template CKAN Jinja harus dikecualikan dari Prettier HTML parser.")
require(not re.search(r"<option\b[^>]*\{\{", form_source), "Form CMS tidak boleh menaruh ekspresi Jinja tanpa kutip di atribut option; gunakan conditional yang membungkus option utuh.")

# The CSS must remain parseable and preserve the responsive login fallback.
require(css_source.count("{") == css_source.count("}"), "CSS memiliki jumlah kurung blok yang tidak seimbang.")
require(":has(#field-login)" in css_source, "Layout login khusus tidak ditemukan.")
require("@media (max-width: 991.98px)" in css_source, "Layout login/header harus punya breakpoint tablet/mobile.")
require("@media (prefers-reduced-motion: reduce)" in css_source, "Theme harus menghormati prefers-reduced-motion.")
require(":focus-visible" in css_source, "Focus indicator keyboard tidak ditemukan.")
require("position: fixed" not in css_source, "Theme tidak boleh membuat overlay fixed global yang berpotensi menutup kontrol CKAN.")

# Parse Jinja and CSS with the parsers already present in a CKAN dev environment.
try:
    from jinja2 import DictLoader, Environment

    env = Environment()
    normalized_form = form_source.replace("{% ckan_extends %}", '{% extends "base.html" %}')
    for path, source in ((BASE, base_source), (HEADER, header_source), (CMS_FORM, form_source)):
        normalized = source.replace("{% ckan_extends %}", '{% extends "base.html" %}')
        normalized = re.sub(r"{%\s*asset\s+(['\"]).*?\1\s*%}", "{% set wajo_theme_asset_loaded = true %}", normalized)
        try:
            env.parse(normalized)
        except Exception as error:  # Jinja exceptions differ by version.
            line = getattr(error, "lineno", "?")
            detail = getattr(error, "message", str(error))
            ERRORS.append(f"Template Jinja tidak valid di {path.relative_to(ROOT)}:{line}: {detail}")

    # Exercise select rendering so the selected options remain correct on create/edit.
    render_env = Environment(loader=DictLoader({
        "base.html": '{% block extra_pages_form %}{% endblock %}',
        "form.html": normalized_form,
    }))
    form_template = render_env.get_template("form.html")
    base_data = {
        "excerpt": "", "category": "", "template_type": "standard", "featured": False,
        "show_in_menu": False, "menu_label": "", "menu_order": "", "seo_title": "",
        "seo_description": "", "og_image": "", "content_blocks": "[]",
    }
    for template_type in ("standard", "landing", "policy", "guide", "article", ""):
        data = {**base_data, "template_type": template_type}
        rendered = form_template.render(data=data, errors={"content_blocks": []}, _=lambda value: value)
        expected = template_type or "standard"
        selected = [value for value in ("standard", "landing", "policy", "guide", "article") if f'<option value="{value}" selected="selected">' in rendered]
        if selected != [expected]:
            ERRORS.append(f"Form CMS memilih tata letak yang salah untuk nilai {template_type!r}: {selected}")
    for flag in (False, True, "false", "true", "0", "1", 0, 1, None):
        data = {**base_data, "featured": flag, "show_in_menu": flag}
        rendered = form_template.render(data=data, errors={"content_blocks": []}, _=lambda value: value)
        expected = "true" if flag in (True, "true", "1", 1) else "false"
        if rendered.count(f'<option value="{expected}" selected="selected">') != 2:
            ERRORS.append(f"Form CMS gagal mempertahankan nilai boolean {flag!r}.")
            break
except ImportError:
    ERRORS.append("Jinja2 diperlukan untuk memvalidasi template CKAN; pasang dependency pemeriksaan sebelum menjalankan check-theme.py.")

try:
    import tinycss2

    def collect_css_errors(tokens):
        found = [item for item in tokens if item.type == "error"]
        for item in tokens:
            if item.type == "qualified-rule":
                declarations = tinycss2.parse_declaration_list(item.content, skip_comments=True, skip_whitespace=True)
                found.extend(node for node in declarations if node.type == "error")
            elif item.type == "at-rule" and item.content is not None:
                nested = tinycss2.parse_rule_list(item.content, skip_comments=True, skip_whitespace=True)
                found.extend(collect_css_errors(nested))
        return found

    parsed = tinycss2.parse_stylesheet(css_source, skip_comments=True, skip_whitespace=True)
    css_errors = collect_css_errors(parsed)
    if css_errors:
        ERRORS.append("CSS tidak valid: " + "; ".join(error.message for error in css_errors))
except ImportError:
    pass

if ERRORS:
    print(f"CKAN admin theme regression check failed ({len(ERRORS)}):", file=sys.stderr)
    for error in ERRORS:
        print(f"- {error}", file=sys.stderr)
    raise SystemExit(1)

print("CKAN admin theme/CMS regression check passed: CKAN 2.12 template blocks, Jinja/CSS syntax, WebAssets, logo, Pages schema/form, packaging, plugin order, responsive login, and additive template scope verified.")

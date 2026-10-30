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
PAGE = PACKAGE / "templates/page.html"
CSS = PACKAGE / "assets/css/wajo-theme.css"
DASHBOARD = PACKAGE / "templates/wajo_theme/dashboard.html"
DATA_PREVIEW = PACKAGE / "templates/wajo_theme/data_preview.html"
SIDEBAR = PACKAGE / "templates/wajo_theme/sidebar.html"
ASSETS = PACKAGE / "assets/webassets.yml"
DESIGN_SYSTEM = PACKAGE / "assets/css/wajo-admin-design-system.css"
LOGO = PACKAGE / "public/logo-kabupaten-wajo.webp"
INDONESIAN_PO = PACKAGE / "i18n/id/LC_MESSAGES/ckan.po"
HARVEST_PO = PACKAGE / "i18n/id/LC_MESSAGES/ckanext-harvest.po"
PAGES_PO = PACKAGE / "i18n/id/LC_MESSAGES/ckanext-pages.po"
DCAT_PO = PACKAGE / "i18n/id/LC_MESSAGES/ckanext-dcat.po"
TRANSLATION_COMPILER = ROOT / "deploy/ckan/compile-id-translations.py"
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
page_source = read(PAGE)
css_source = read(CSS)
assets_source = read(ASSETS)
env_source = read(ENV_EXAMPLE)
bootstrap_source = read(BOOTSTRAP)

# Catch syntax errors in the Python package without importing CKAN at test time.
for path in (PLUGIN, SETUP, TRANSLATION_COMPILER):
    source = read(path)
    try:
        ast.parse(source, filename=str(path))
    except SyntaxError as error:
        ERRORS.append(f"Syntax Python error di {path.relative_to(ROOT)}:{error.lineno}: {error.msg}")

# The extension must use CKAN's supported template/public/WebAssets APIs.
for expected in (
    "class WajoThemePlugin(plugins.SingletonPlugin)",
    "plugins.implements(plugins.IConfigurer)",
    "plugins.implements(plugins.IMiddleware)",
    "plugins.implements(plugins.IBlueprint)",
    "def make_middleware(self, app, config):",
    "def get_blueprint(self):",
    'Blueprint("wajo_admin", __name__, url_prefix="/admin")',
    'base.render("wajo_theme/dashboard.html"',
    "current_user.is_authenticated",
    "ckanext.wajo_theme.admin_host",
    "keep_admin_redirect_on_admin_host",
    'toolkit.add_template_directory(config, "templates")',
    'toolkit.add_public_directory(config, "public")',
    'toolkit.add_resource("assets", "wajo_theme")',
):
    require(expected in plugin_source, f"Registrasi theme CKAN tidak lengkap: {expected}")

require('url_prefix="/admin"' in plugin_source, "Ringkasan Wajo Admin harus memiliki URL khusus agar redirect root tidak berputar.")
require("CKAN__AUTH__ROUTE_AFTER_LOGIN=wajo_admin.index" in env_source, "Login CKAN harus diarahkan ke halaman ringkasan Wajo Admin.")
require('values["CKAN__AUTH__ROUTE_AFTER_LOGIN"] = "wajo_admin.index"' in bootstrap_source, "Bootstrap harus mengunci redirect login ke route Wajo Admin.")

require("{% ckan_extends %}" in base_source, "base.html harus mewarisi template base CKAN, bukan menggantikannya.")
styles_block = re.search(r"{%\s*block\s+styles\s*%}([\s\S]*?){%\s*endblock\s*%}", base_source)
styles_body = styles_block.group(1) if styles_block else ""
require(bool(styles_block) and "{{ super() }}" in styles_body, "base.html harus mempertahankan CSS bawaan CKAN melalui block styles + super().")
asset_call = re.compile(r"{%\s*asset\s+(['\"])wajo_theme/wajo_theme\1\s*%}")
require(bool(asset_call.search(styles_body)), "Bundle WebAssets wajo_theme harus dimuat di dalam block styles pada base.html.")
require("{% ckan_extends %}" in header_source, "header.html harus mewarisi header CKAN.")
require("{% block header_wrapper %}" in header_source, "Header Wajo Admin harus menggunakan block header_wrapper CKAN 2.12.1.")
require("h.url_for('wajo_admin.index')" in header_source, "Brand harus mengarah ke ringkasan Wajo Admin.")
require('src="/logo-kabupaten-wajo.webp"' in header_source and "wajo-admin-brand__mark" in header_source, "Header harus memakai logo extension yang diekspos langsung oleh add_public_directory().")
require("wajo-admin-user" in header_source and "h.csrf_input()" in header_source and "user.logout" in header_source, "Topbar harus mempertahankan identitas pengguna dan logout dengan CSRF.")
icon_source = read(PACKAGE / "templates/wajo_theme/icon.html")
require("wajo_theme/icon.html" in read(SIDEBAR) and 'class="fa fa-' in icon_source and "wajo-icons.svg#" not in icon_source and 'src="/logo-kabupaten-wajo.webp"' in header_source, "Ikon admin harus memakai pustaka Font Awesome bawaan CKAN, bukan SVG buatan sendiri, dan logo lokal extension.")
require("{% ckan_extends %}" in page_source, "page.html harus mewarisi shell CKAN agar block admin upstream tetap utuh.")
require("wajo-admin-shell" in page_source and 'wajo_theme/sidebar.html' in page_source and "{{ super() }}" in page_source, "Page shell harus menambahkan sidebar secara aditif tanpa mengganti konten core CKAN.")
require('class="wajo-admin-footer__brand"' in page_source and 'src="/logo-kabupaten-wajo.webp"' in page_source, "Footer admin harus memakai identitas dan logo yang sama dengan header.")

# Verify WebAssets bundle name and its CSS file are consistent.
require(bool(re.search(r"(?m)^wajo_theme:\s*$", assets_source)), "webassets.yml harus mendeklarasikan bundle wajo_theme.")
require("css/wajo-theme.css" in assets_source, "Bundle wajo_theme harus memuat CSS yang dipelihara.")
require("css/wajo-admin-design-system.css" in assets_source, "Bundle harus memuat lapisan design system admin setelah theme dasar.")
require(DESIGN_SYSTEM.is_file(), "File design system Wajo Admin tidak ditemukan.")
design_source = read(DESIGN_SYSTEM)
for token in (
    "--wajo-color-primary: #1d5fa7", "--wajo-color-ink: #1b3440",
    "--wajo-color-muted: #586d76", "--wajo-color-canvas: #f5f7f6",
    "--wajo-color-border: #d8e2e4", "--wajo-font-sans",
    "--wajo-content-max: 1480px", "--wajo-dashboard-max: 1320px",
    "--wajo-form-max: 960px", "--wajo-login-max: 448px",
    "--wajo-sidebar-width: 264px", "--wajo-radius-control: .625rem",
    "--wajo-control-height: 42px", "--wajo-button-height: 40px",
    "--wajo-heading-1: clamp(1.75rem, 2.2vw, 2rem)", "--wajo-text-base: .9375rem",
    "--wajo-shadow-sm",
    "--wajo-color-success: #28784f", "--wajo-color-danger: #b33d46",
):
    require(token in design_source, f"Design token wajib tidak ditemukan: {token}.")
for selector in (
    ".wajo-admin-topbar__inner", ".wajo-admin-shell", ".wajo-admin-workspace #content",
    ".wajo-admin-workspace .module", ".wajo-admin-workspace .table",
    ".wajo-admin-workspace :where(input.form-control", ".wajo-dashboard__metrics",
    ".wajo-login-frame", ".wajo-login-frame .login-main:has(#field-login)",
    ".wajo-admin-workspace .form-actions", ".wajo-admin-workspace .pagination",
    ".wajo-admin-workspace .page-header .page-heading",
    "--wajo-font-mono", ".wajo-admin-workspace .table tbody td",
    ".wajo-login-frame .login-main:has(#field-login) .form-control",
    "@media (max-width: 991.98px)", "@media (max-width: 767.98px)",
    "@media (prefers-reduced-motion: reduce)", "--wajo-heading-1",
    "--wajo-heading-2", "--wajo-text-base",
):
    require(selector in design_source, f"Design system tidak mencakup selector/responsive rule: {selector}.")
require(assets_source.index("css/wajo-theme.css") < assets_source.index("css/wajo-admin-design-system.css"), "Design system harus dimuat setelah CSS theme dasar agar token dan komponen konsisten.")
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
require("class WajoHarvestTranslationPlugin" in plugin_source and "return \"ckanext-harvest\"" in plugin_source, "Harvest extension must register its own Indonesian gettext domain.")
require("class WajoPagesTranslationPlugin" in plugin_source and "return \"ckanext-pages\"" in plugin_source, "Pages extension must register its own Indonesian gettext domain.")
require("class WajoDcatTranslationPlugin" in plugin_source and "return \"ckanext-dcat\"" in plugin_source, "DCAT extension must register its own Indonesian gettext domain.")
require('"wajo_harvest_i18n = ckanext.wajo_theme.plugin:WajoHarvestTranslationPlugin"' in setup_source and '"wajo_pages_i18n = ckanext.wajo_theme.plugin:WajoPagesTranslationPlugin"' in setup_source and '"wajo_dcat_i18n = ckanext.wajo_theme.plugin:WajoDcatTranslationPlugin"' in setup_source, "Entry points for Harvest, Pages, and DCAT Indonesian translation domains must be installed.")
require("IPagesSchema" in plugin_source and "def update_pages_schema(self, schema)" in plugin_source, "Plugin Wajo harus memperluas schema ckanext-pages melalui IPagesSchema.")
require("def validate_content_blocks(key, data, errors, context)" in plugin_source and "json.loads(value)" in plugin_source and "MAX_CONTENT_BLOCK_COUNT = 16" in plugin_source, "Schema CMS harus memvalidasi JSON blocks, jumlah komponen, dan tipe yang didukung sebelum tersimpan.")
for field in ("excerpt", "category", "seo_title", "seo_description", "og_image", "template_type", "menu_label", "menu_order", "content_blocks", "featured", "show_in_menu"):
    require(f'"{field}"' in plugin_source, f"Field editorial {field} belum didaftarkan pada schema CKAN Pages.")
manifest = read(THEME / "MANIFEST.in")
for expected in (
    "templates *.html",
    "assets *.yml *.css",
    "public *",
    "i18n *.po",
):
    require(expected in manifest, f"MANIFEST.in tidak memasukkan {expected}.")
configurator = read(ROOT / "deploy/ckan/configure-upstream-extensions.py")
require("shutil.copytree(theme_source, theme_destination)" in configurator, "Bootstrap tidak menyalin source extension theme ke build context.")
require("compile-id-translations.py" in configurator and "portal-compile-id-translations.py" in configurator and "ckan.po" in configurator, "Docker build harus mengompilasi katalog Bahasa Indonesia ke CKAN core i18n directory.")
require(INDONESIAN_PO.is_file() and INDONESIAN_PO.stat().st_size > 1000, "Katalog terjemahan CKAN Bahasa Indonesia tidak ditemukan atau terlalu kecil.")
for catalog in (HARVEST_PO, PAGES_PO, DCAT_PO):
    require(catalog.is_file() and catalog.stat().st_size > 1000, f"Katalog extension Bahasa Indonesia tidak ditemukan atau terlalu kecil: {catalog.name}.")
require('"i18n/id/LC_MESSAGES/*.po"' in setup_source, "Wheel theme harus menyertakan katalog PO Bahasa Indonesia.")
require("CKAN__LOCALE_DEFAULT=id" in env_source and 'CKAN__LOCALES_OFFERED="id en"' in env_source, "CKAN harus memakai Bahasa Indonesia sebagai locale default dan menyediakan English sebagai pilihan.")
require('values["CKAN__LOCALE_DEFAULT"] = "id"' in bootstrap_source and 'values["CKAN__LOCALES_OFFERED"]' in bootstrap_source, "Bootstrap harus menegakkan locale Bahasa Indonesia walaupun .env lama belum memiliki locale config.")
require("nplurals=1; plural=0;" in INDONESIAN_PO.read_text(encoding="utf-8"), "Katalog Bahasa Indonesia harus menggunakan aturan plural satu bentuk.")
require("USER root\nRUN python -m pip install --no-cache-dir -r /tmp/portal-ckan-extensions.txt /tmp/portal-ckan-theme" in configurator, "Docker build harus memasang extension/theme secara global sebagai root sebelum kembali ke user runtime CKAN.")
plugin_order_match = re.search(r"for plugin in \(\s*([\s\S]*?)\s*\):", bootstrap_source)
plugin_order = re.findall(r'"([a-z0-9_]+)"', plugin_order_match.group(1)) if plugin_order_match else []
require(
    all(name in plugin_order for name in ("scheming_datasets", "wajo_pages", "pages"))
    and plugin_order.index("scheming_datasets") < plugin_order.index("wajo_pages") < plugin_order.index("pages"),
    "wajo_pages harus dimuat setelah Scheming dan sebelum plugin pages.",
)
require('"wajo_harvest_i18n"' in bootstrap_source and '"wajo_pages_i18n"' in bootstrap_source and '"wajo_dcat_i18n"' in bootstrap_source, "Bootstrap harus mengaktifkan domain terjemahan khusus Harvest, Pages, dan DCAT.")
require(all(name in plugin_order for name in ("harvest", "wajo_harvest_i18n", "pages", "wajo_pages_i18n", "wajo_dcat_i18n")) and plugin_order.index("harvest") < plugin_order.index("wajo_harvest_i18n") and plugin_order.index("pages") < plugin_order.index("wajo_pages_i18n") and "dcat" in plugin_order and plugin_order.index("dcat") < plugin_order.index("wajo_dcat_i18n"), "Translation plugin harus diaktifkan bersama extension yang domain terjemahannya ditangani.")
require("plugins.append(\"wajo_theme\")" in bootstrap_source, "Plugin theme harus diaktifkan setelah extension yang juga menyediakan template.")
require('plugins.append("envvars")' in bootstrap_source, "Plugin envvars harus tetap berada terakhir.")
workflow = read(ROOT / ".github/workflows/ci.yml")
require("COPY deploy/ckan/theme/ /tmp/portal-ckan-theme/" in workflow, "CI Docker smoke image harus memasukkan source package wajo_theme.")
require("compile-id-translations.py" in workflow and "/tmp/compile-id-translations.py" in workflow, "CI Docker smoke image harus mengompilasi katalog CKAN Bahasa Indonesia.")
require("read_mo" in TRANSLATION_COMPILER.read_text(encoding="utf-8") and "merged_catalog.add(" in TRANSLATION_COMPILER.read_text(encoding="utf-8"), "Kompilasi Wajo PO harus menggabungkan, bukan menimpa, katalog Bahasa Indonesia bawaan CKAN.")
require("compile_extension_catalogs" in TRANSLATION_COMPILER.read_text(encoding="utf-8") and 'glob("ckanext-*.po")' in TRANSLATION_COMPILER.read_text(encoding="utf-8"), "Compiler harus menemukan dan menghasilkan katalog untuk domain extension terpisah.")
require("check-id-translations.py" in read(ROOT / "scripts/check-static.sh"), "Static CI harus menguji kelengkapan katalog Bahasa Indonesia dan placeholder.")
require("USER root" in workflow and "RUN python -m pip install --no-cache-dir -r /tmp/portal-ckan-extensions.txt /tmp/portal-ckan-theme" in workflow and "check-plugins.py" in workflow, "CI harus memasang extension/theme secara global sebagai root sebelum memeriksa entry point plugin.")
for caddy_name in ("Caddyfile", "Caddyfile.basic-auth", "Caddyfile.tunnel", "Caddyfile.tunnel.access", "Caddyfile.tunnel.basic-auth"):
    caddy = read(ROOT / "deploy/ckan" / caddy_name)
    admin_block = caddy.split("{$CKAN_HOST}", 1)[-1]
    require("reverse_proxy https://nginx:443" in admin_block, f"{caddy_name}: semua route host admin harus diteruskan ke CKAN.")
    require("X-Forwarded-Host {http.request.host}" in admin_block, f"{caddy_name}: hostname asli harus diteruskan ke CKAN untuk auth guard.")
    require("@adminSitemap path" in admin_block, f"{caddy_name}: sitemap host admin harus tetap ditutup.")
    require("redir https://{$PUBLIC_HOST}{uri}" not in admin_block, f"{caddy_name}: route CKAN tidak boleh dialihkan ke Next.js setelah login.")
    require("@adminActions path" not in admin_block, f"{caddy_name}: jangan gunakan allowlist route yang membuat menu/extension CKAN tidak bisa diakses.")
require("/logo-kabupaten-wajo.webp" in plugin_source, "Aset logo perlu dikecualikan secara eksplisit dari login guard.")
require("CKANEXT__WAJO_THEME__ADMIN_HOST" in read(ROOT / "deploy/ckan/sync-env.py"), "Hostname admin yang dipakai auth guard harus diturunkan dari CKAN_HOST.")

# Keep the extension intentionally additive: only common shell templates are overridden.
actual_templates = sorted(path.relative_to(PACKAGE / "templates").as_posix() for path in (PACKAGE / "templates").rglob("*.html"))
require(actual_templates == ["base.html", "ckanext_pages/base_form.html", "header.html", "page.html", "wajo_theme/context_help.html", "wajo_theme/dashboard.html", "wajo_theme/data_preview.html", "wajo_theme/icon.html", "wajo_theme/sidebar.html"], "Theme hanya boleh mengganti shell bersama, dashboard Wajo, sidebar, dan form editorial Pages; route/modul CKAN lain harus tetap native.")
CMS_FORM = PACKAGE / "templates/ckanext_pages/base_form.html"
dashboard_source = read(DASHBOARD)
data_preview_source = read(DATA_PREVIEW)
sidebar_source = read(SIDEBAR)
require("wajo_admin_stats" in dashboard_source and "wajo_admin_recent_datasets" in dashboard_source, "Dashboard harus memakai ringkasan yang disiapkan oleh view CKAN.")
require("h.check_access('package_create')" in dashboard_source and "h.check_access('organization_create')" in dashboard_source, "Quick action dashboard harus menghormati permission CKAN.")
require("h.url_for(dataset_type ~ '.read', id=item.name)" in dashboard_source, "Tautan dataset terbaru harus menggunakan route native CKAN.")
require("request.path" in sidebar_source and "h.url_for('wajo_admin.index')" in sidebar_source, "Sidebar harus mendeteksi route aktif dan memakai route ringkasan Wajo Admin.")
require("h.url_for('dashboard.datasets')" in sidebar_source and "h.url_for('dashboard.organizations')" in sidebar_source and "h.url_for('dashboard.groups')" in sidebar_source, "Sidebar harus mempertahankan route dashboard native pengguna.")
require("/pages" in sidebar_source and "/blog" in sidebar_source and "/harvest" in sidebar_source, "Sidebar harus menyediakan tautan ke Pages, Blog, dan Harvest.")
for required_nav in ("Semua dataset", "Organisasi", "Kategori data", "Publikasi & laporan", "Indikator & statistik", "Infografik", "Halaman portal", "Berita & blog", "Pengambilan data", "DataStore & pratinjau"):
    require(required_nav in sidebar_source, f"Sidebar admin belum menyediakan menu {required_nav}.")
context_help_source = read(PACKAGE / "templates/wajo_theme/context_help.html")
for tag in ("portal-publikasi", "portal-indikator", "portal-infografik"):
    require(tag in context_help_source and "current_dataset_tags" in context_help_source, f"Panduan halaman detail harus mengenali dataset dengan tag {tag}.")
require("Panduan halaman ini" in context_help_source and "guide_action_label" in context_help_source, "Setiap halaman admin harus memiliki panduan kontekstual dan aksi lanjutan.")
require("tags:portal-publikasi" in sidebar_source and "tags:portal-indikator" in sidebar_source and "tags:portal-infografik" in sidebar_source, "Menu publikasi, indikator, dan infografik harus menggunakan tag CKAN yang sama dengan frontend publik.")
require("/admin/data-preview" in sidebar_source, "Sidebar harus menyediakan akses ke panduan DataStore dan pratinjau.")
require("wajo_icon('check'" in data_preview_source and 'data-copy-command' in data_preview_source and 'wajo_admin.data_preview_backfill' in data_preview_source + plugin_source, "Panduan DataStore harus berupa alur UI dengan status, aksi salin perintah, dan tombol backfill.")
require("xloader_submit" in plugin_source and 'def data_preview_backfill()' in plugin_source and 'maximum_jobs = 25' in plugin_source, "Panduan DataStore harus menyediakan antrean backfill terbatas melalui action XLoader.")
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
require(".login-main:has(#field-login)" in css_source, "Layout login harus menargetkan wrapper login CKAN 2.12, bukan selector .main yang tidak digunakan.")
require(".login-wrapper > .login-container" in css_source and ".login-wrapper > .login-form" in css_source, "Login harus memakai layout satu kolom yang sesuai dengan markup CKAN 2.12.")
require("@media (max-width: 991.98px)" in css_source, "Layout login/header harus punya breakpoint tablet/mobile.")
require(re.search(r"@media \(max-width: 991\.98px\)\s*\{[\s\S]{0,500}\.wajo-admin-menu-toggle\s*\{\s*display:\s*inline-flex", css_source), "Tombol navigasi admin harus terlihat dan dapat digunakan pada tablet/mobile.")
require(".wajo-admin-footer__brand img" in css_source, "Logo footer admin harus memiliki ukuran dan object-fit yang eksplisit.")
require("@media (prefers-reduced-motion: reduce)" in css_source, "Theme harus menghormati prefers-reduced-motion.")
require(".wajo-admin-workspace .btn { min-height: var(--wajo-button-height)" in design_source, "Tombol admin harus memakai tinggi kanonis design system.")
require(".wajo-admin-workspace .btn { min-height: 44px; }" in design_source, "Target tombol admin pada mobile harus minimal 44px.")
require(".wajo-admin-workspace .pagination .page-link { min-width: 44px; min-height: 44px; }" in design_source, "Pagination mobile harus memiliki target sentuh yang memadai.")
require("font-size: 1rem; }" in design_source[design_source.find(".wajo-login-frame .login-main:has(#field-login) .form-control"):], "Input login harus memakai ukuran teks yang nyaman dibaca.")
require(":focus-visible" in css_source, "Focus indicator keyboard tidak ditemukan.")
require("position: fixed" not in css_source, "Theme tidak boleh membuat overlay fixed global yang berpotensi menutup kontrol CKAN.")
require(".wajo-admin-topbar" in css_source and ".wajo-admin-shell" in css_source and ".wajo-admin-sidebar" in css_source and ".wajo-dashboard__metrics" in css_source and ".table tbody tr:hover" in css_source, "Theme administrasi harus memiliki topbar, shell, sidebar, dashboard, tabel, dan responsivitas yang konsisten.")
require(".wajo-datastore__layout" in css_source and "@media (max-width: 991.98px)" in css_source and "@media (max-width: 767.98px)" in css_source, "Wizard DataStore harus responsif pada tablet dan ponsel.")
require(".wajo-admin-shell .fa" in css_source and ".wajo-icon" not in css_source, "Ukuran ikon harus konsisten memakai pustaka Font Awesome CKAN, tanpa aturan SVG custom.")

# Parse Jinja and CSS with the parsers already present in a CKAN dev environment.
try:
    from jinja2 import DictLoader, Environment

    env = Environment()
    normalized_form = form_source.replace("{% ckan_extends %}", '{% extends "base.html" %}')
    for path, source in ((BASE, base_source), (HEADER, header_source), (PAGE, page_source), (CMS_FORM, form_source), (DASHBOARD, dashboard_source), (DATA_PREVIEW, data_preview_source), (SIDEBAR, sidebar_source)):
        normalized = source.replace("{% ckan_extends %}", '{% extends "base.html" %}')
        normalized = re.sub(r"{%\s*asset\s+(['\"]).*?\1\s*%}", "{% set wajo_theme_asset_loaded = true %}", normalized)
        try:
            env.parse(normalized)
        except Exception as error:  # Jinja exceptions differ by version.
            line = getattr(error, "lineno", "?")
            detail = getattr(error, "message", str(error))
            ERRORS.append(f"Template Jinja tidak valid di {path.relative_to(ROOT)}:{line}: {detail}")

    # Verify anonymous users get a focused login/public shell while authenticated
    # administrators retain the upstream CKAN header/footer and page content.
    normalized_page = page_source.replace("{% ckan_extends %}", '{% extends "upstream_page.html" %}')
    chrome_env = Environment(loader=DictLoader({
        "upstream_page.html": (
            "{% block header %}UPSTREAM_HEADER{% endblock %}"
            "{% block content %}ADMIN_CONTENT{% endblock %}"
            "{% block footer %}UPSTREAM_FOOTER{% endblock %}"
        ),
        "page.html": normalized_page,
        "wajo_theme/sidebar.html": "WAJO_ADMIN_SIDEBAR",
        "wajo_theme/context_help.html": "WAJO_CONTEXT_HELP",
    }))
    chrome_template = chrome_env.get_template("page.html")
    anonymous_render = chrome_template.render(c={"userobj": None}, g={"site_url": "https://data.example.test"})
    admin_render = chrome_template.render(c={"userobj": object()}, g={"site_url": "https://data.example.test"})
    require("UPSTREAM_HEADER" not in anonymous_render and "UPSTREAM_FOOTER" not in anonymous_render and "WAJO_ADMIN_SIDEBAR" not in anonymous_render and "WAJO_CONTEXT_HELP" not in anonymous_render,
            "Header/footer/sidebar CKAN harus disembunyikan untuk pengguna anonim.")
    require("ADMIN_CONTENT" in anonymous_render,
            "Menyembunyikan chrome anonim tidak boleh menghilangkan konten halaman/login.")
    require("UPSTREAM_HEADER" in admin_render and "wajo-admin-footer" in admin_render and "Portal Satu Data Kabupaten Wajo" in admin_render and "ADMIN_CONTENT" in admin_render and "WAJO_ADMIN_SIDEBAR" in admin_render and "WAJO_CONTEXT_HELP" in admin_render,
            "Topbar, footer bermerek, sidebar Wajo, dan konten CKAN harus tampil untuk administrator yang login.")

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

print("CKAN admin theme/CMS regression check passed: CKAN 2.12 templates, WebAssets, Bahasa Indonesia catalog/default locale, logo, Pages schema/form, packaging, plugin order, responsive login, and additive template scope verified.")

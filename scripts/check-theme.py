#!/usr/bin/env python3
"""Static regression guard for the portal CKAN 2.12 admin theme."""
from __future__ import annotations

import ast
import hashlib
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "deploy/ckan/theme"
PACKAGE = THEME / "ckanext/portal_theme"
PLUGIN = PACKAGE / "plugin.py"
SETUP = THEME / "setup.py"
BASE = PACKAGE / "templates/base.html"
BACK_TO_TOP = PACKAGE / "public/portal-admin-back-to-top.js"
HEADER = PACKAGE / "templates/header.html"
PAGE = PACKAGE / "templates/page.html"
CSS = PACKAGE / "assets/css/portal-theme.css"
DASHBOARD = PACKAGE / "templates/portal_theme/dashboard.html"
DATA_PREVIEW = PACKAGE / "templates/portal_theme/data_preview.html"
SIDEBAR = PACKAGE / "templates/portal_theme/sidebar.html"
PAGES_DETAIL = PACKAGE / "templates/ckanext_pages/page.html"
BLOG_DETAIL = PACKAGE / "templates/ckanext_pages/blog.html"
PAGE_REVISIONS = PACKAGE / "templates/ckanext_pages/page_revisions_preview.html"
BLOG_REVISIONS = PACKAGE / "templates/ckanext_pages/blog_revisions_preview.html"
MARKDOWN_RENDERER = PACKAGE / "markdown.py"
ASSETS = PACKAGE / "assets/webassets.yml"
DESIGN_SYSTEM = PACKAGE / "assets/css/portal-admin-design-system.css"
PUBLIC_MOTION = ROOT / "src/app/styles/public-pages-motion.css"
SCHEMA = PACKAGE / "schemas/dataset.yaml"
LOGO = PACKAGE / "public/institution-logo-default.webp"
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
back_to_top_source = read(BACK_TO_TOP)
header_source = read(HEADER)
page_source = read(PAGE)
css_source = read(CSS)
design_system_source = read(DESIGN_SYSTEM)
assets_source = read(ASSETS)
env_source = read(ENV_EXAMPLE)
bootstrap_source = read(BOOTSTRAP)
public_motion_source = read(PUBLIC_MOTION)

# Login regression contract: centered on desktop, document-scrollable on short
# screens/mobile, concise identity panel, and non-overlapping native inputs.
login_fix = design_system_source.rsplit("/* Login viewport and field spacing regression fix.", 1)[-1]
require("height: auto !important" in login_fix and "overflow-y: auto !important" in login_fix, "Login CKAN harus membiarkan dokumen bertambah tinggi dan dapat discroll pada mobile.")
require("align-content: safe center" in login_fix and "justify-items: center" in login_fix, "Kartu login CKAN harus terpusat saat cukup ruang dan fallback ke atas saat konten overflow.")
require("max-height: none !important" in login_fix and "overflow: visible !important" in login_fix, "Login tidak boleh mengunci tinggi kartu atau memotong konten form.")
require("padding-inline: 3.25rem 2.9rem !important" in login_fix, "Field login/password harus menyediakan ruang dari ikon kiri dan affordance browser di kanan.")
require("position: relative !important" in login_fix and "position: absolute !important" in login_fix, "Ikon username/password harus diposisikan absolute di dalam wrapper input.")
require("padding-inline: 3.25rem 2.9rem !important" in login_fix, "Teks input login/password harus memiliki ruang kiri dari ikon dan ruang kanan untuk affordance browser.")
require("align-content: safe center" in login_fix and "min-height: 100svh" in login_fix, "Area login harus memakai tinggi viewport dan aman dipusatkan tanpa memotong konten.")
require("portal-login-benefits" not in page_source and "portal-login-identity__status" not in page_source, "Kolom identitas login harus ringkas dan tidak dipenuhi daftar teks tambahan.")
require('msgid "Sign in to manage datasets, organizations, and portal content."' in read(INDONESIAN_PO), "Copy ringkas login harus memiliki terjemahan Bahasa Indonesia.")

# The CI failure mode seen in practice is a newer checker committed without the
# matching design-system stylesheet. In a Git checkout, require the exact theme
# inputs to be tracked so a locally present but uncommitted CSS file cannot make
# the developer's machine pass while GitHub Actions fails. Archives without a
# .git worktree still run the source/content checks below.
try:
    git_context = subprocess.run(
        ["git", "-C", str(ROOT), "rev-parse", "--is-inside-work-tree"],
        check=False, capture_output=True, text=True, timeout=5,
    )
except (OSError, subprocess.TimeoutExpired):
    git_context = None
git_revision = None
if git_context and git_context.returncode == 0:
    revision_result = subprocess.run(
        ["git", "-C", str(ROOT), "rev-parse", "--short=12", "HEAD"],
        check=False, capture_output=True, text=True, timeout=5,
    )
    if revision_result.returncode == 0:
        git_revision = revision_result.stdout.strip()
    for tracked_path in (CSS, DESIGN_SYSTEM, ASSETS, PLUGIN, PUBLIC_MOTION):
        relative_path = tracked_path.relative_to(ROOT).as_posix()
        tracked = subprocess.run(
            ["git", "-C", str(ROOT), "ls-files", "--error-unmatch", relative_path],
            check=False, capture_output=True, text=True, timeout=5,
        )
        require(
            tracked.returncode == 0,
            f"Theme source wajib belum masuk Git: {relative_path}. Tambahkan file ini ke commit; file lokal saja tidak ikut ke GitHub Actions.",
        )

# Catch syntax errors in the Python package without importing CKAN at test time.
for path in (PLUGIN, SETUP, TRANSLATION_COMPILER, MARKDOWN_RENDERER):
    source = read(path)
    try:
        ast.parse(source, filename=str(path))
    except SyntaxError as error:
        ERRORS.append(f"Syntax Python error di {path.relative_to(ROOT)}:{error.lineno}: {error.msg}")

# The extension must use CKAN's supported template/public/WebAssets APIs.
for expected in (
    "class PortalThemePlugin(plugins.SingletonPlugin)",
    "plugins.implements(plugins.IConfigurer)",
    "plugins.implements(plugins.IFiles, inherit=True)",
    "def files_file_allows(self, context, file, operation):",
    "plugins.implements(plugins.IMiddleware)",
    "plugins.implements(plugins.IBlueprint)",
    "def make_error_log_middleware(self, app, config):",
    "def _normalize_geojson_resource_format(resource, current=None):",
    "def before_resource_create(self, context, resource):",
    "def before_resource_update(self, context, current, resource):",
    "def make_middleware(self, app, config):",
    "def get_blueprint(self):",
    'Blueprint("portal_admin", __name__, url_prefix="/admin")',
    'base.render("portal_theme/dashboard.html"',
    "current_user.is_authenticated",
    "ckanext.portal_theme.admin_host",
    "keep_admin_redirect_on_admin_host",
    'toolkit.add_template_directory(config, "templates")',
    'toolkit.add_public_directory(config, "public")',
    'toolkit.add_resource("assets", "portal_theme")',
):
    require(expected in plugin_source, f"Registrasi theme CKAN tidak lengkap: {expected}")

require('url_prefix="/admin"' in plugin_source, "Ringkasan Portal Admin harus memiliki URL khusus agar redirect root tidak berputar.")
require(SCHEMA.is_file(), "Schema dataset Portal harus dipaketkan di dalam extension agar Scheming dapat memuatnya sebagai module:file.")
require('values["CKAN___SCHEMING__DATASET_SCHEMAS"] = "ckanext.portal_theme:schemas/dataset.yaml"' in bootstrap_source, "scheming.dataset_schemas harus memakai format module:file yang valid, bukan path filesystem polos.")
require("CKAN__AUTH__ROUTE_AFTER_LOGIN=portal_admin.index" in env_source, "Login CKAN harus diarahkan ke halaman ringkasan Portal Admin.")
require('values["CKAN__AUTH__ROUTE_AFTER_LOGIN"] = "portal_admin.index"' in bootstrap_source, "Bootstrap harus mengunci redirect login ke route Portal Admin.")

require("{% ckan_extends %}" in base_source, "base.html harus mewarisi template base CKAN, bukan menggantikannya.")
styles_block = re.search(r"{%\s*block\s+styles\s*%}([\s\S]*?){%\s*endblock\s*%}", base_source)
styles_body = styles_block.group(1) if styles_block else ""
require(bool(styles_block) and "{{ super() }}" in styles_body, "base.html harus mempertahankan CSS bawaan CKAN melalui block styles + super().")
asset_call = re.compile(r"{%\s*asset\s+(['\"])portal_theme/portal_theme\1\s*%}")
require(bool(asset_call.search(styles_body)), "Bundle WebAssets portal_theme harus dimuat di dalam block styles pada base.html.")
require("{% ckan_extends %}" in header_source, "header.html harus mewarisi header CKAN.")
require("{% block header_wrapper %}" in header_source, "Header Portal Admin harus menggunakan block header_wrapper CKAN 2.12.1.")
require("h.url_for('portal_admin.index')" in header_source, "Brand harus mengarah ke ringkasan Portal Admin.")
require("g.site_logo or '/icons/portal.svg'" in header_source and "portal-admin-brand__mark" in header_source, "Header harus memakai logo konfigurasi dengan fallback generik, bukan aset institusi tertentu.")
require("portal-admin-user" in header_source and "h.csrf_input()" in header_source and "user.logout" in header_source, "Topbar harus mempertahankan identitas pengguna dan logout dengan CSRF.")
require("{{ g.site_title }}" in header_source and "_('Open public portal')" in header_source and "_('Log out')" in header_source, "Identitas topbar harus berasal dari konfigurasi portal dan aksi utama memakai katalog Bahasa Indonesia.")
icon_source = read(PACKAGE / "templates/portal_theme/icon.html")
require("portal_theme/icon.html" in read(SIDEBAR) and 'class="fa fa-' in icon_source and "portal-icons.svg#" not in icon_source and "g.site_logo" in header_source, "Ikon admin harus memakai pustaka Font Awesome bawaan CKAN dan logo dari konfigurasi portal.")
require("fa-solid" in icon_source, "Ikon Portal harus memakai family solid Font Awesome Free yang dibundel CKAN 2.12.1.")
require("'map': 'map-location-dot'" in icon_source, "Aksi data geospasial harus memakai glyph Font Awesome map-location-dot yang jelas.")

icon_template_sources = "\n".join(path.read_text(encoding="utf-8") for path in (PACKAGE / "templates").rglob("*.html"))
icon_calls = set(re.findall(r"portal_icon\('([^']+)'", icon_template_sources))
icon_pairs = re.findall(r"'([^']+)':\s*'([a-z0-9-]+)'", icon_source)
icon_map = dict(icon_pairs)
valid_free_solid_glyphs = {
    "gauge-high", "database", "building", "tags", "file-lines", "arrows-rotate",
    "folder", "users", "gear", "bars", "arrow-up-right-from-square", "sliders",
    "right-from-bracket", "chart-bar", "angle-right", "plus",
    "newspaper", "book", "chart-line", "image", "table", "server",
    "cloud-arrow-down", "shield", "check", "circle-check", "circle-exclamation",
    "triangle-exclamation", "circle-info", "map", "map-location-dot", "pen-to-square", "pencil", "eye",
}
require(icon_calls.issubset(icon_map), f"Semua pemanggilan portal_icon harus memiliki pemetaan: {sorted(icon_calls - icon_map.keys())}.")
require(set(icon_map.values()).issubset(valid_free_solid_glyphs), f"Glyph harus tersedia pada Font Awesome Free Solid CKAN: {sorted(set(icon_map.values()) - valid_free_solid_glyphs)}.")
require("circle-question" in icon_source, "Fallback ikon harus memakai glyph Font Awesome Free circle-question.")
for glyph in ("gauge-high", "building", "image", "file-lines", "newspaper", "folder", "chart-line", "right-from-bracket", "arrow-up-right-from-square", "circle-check", "triangle-exclamation", "shield", "pen-to-square"):
    require(f"'{glyph}'" in icon_source, f"Glyph Font Awesome yang dibutuhkan tidak dipetakan: {glyph}.")
for retired_glyph in ("building-o", "file-text-o", "newspaper-o", "picture-o", "folder-open-o", "line-chart", "sign-out", "tachometer"):
    require(f"'{retired_glyph}'" not in icon_source, f"Nama glyph Font Awesome lama harus diganti: {retired_glyph}.")
require("fonts.googleapis.com/css2?family=Inter" in base_source and "fonts.gstatic.com" in base_source and "display=swap" in base_source, "CKAN admin harus memuat Google Font Inter dengan preconnect dan display swap.")
require("portal-admin-back-to-top.js" in base_source, "Base CKAN harus memuat kontrol kembali ke atas untuk halaman admin.")
require('aria-label", "Kembali ke bagian atas halaman"' in back_to_top_source and 'window.scrollTo({' in back_to_top_source, "Kontrol kembali ke atas CKAN harus memiliki nama aksesibel dan aksi scroll yang nyata.")
require("radial-gradient" not in design_system_source and "linear-gradient" not in design_system_source, "Portal Admin harus menghindari gradient dekoratif pada dashboard dan login.")
# CKAN 2.12 FileStore must be enabled and backed by the persistent upstream ckan_storage volume.
for upload_setting in (
    "CKAN__UPLOADS_ENABLED=true",
    "CKAN__FILES__STORAGE__DEFAULT__TYPE=ckan:fs",
    "CKAN__FILES__STORAGE__DEFAULT__PATH=/var/lib/ckan/default",
    "CKAN__FILES__STORAGE__DEFAULT__INITIALIZE=true",
    "CKAN__MAX_IMAGE_SIZE=5",
    "CKAN__UPLOAD__GROUP__TYPES=image",
    'CKAN__UPLOAD__GROUP__MIMETYPES="image/png image/jpeg image/gif image/webp"',
):
    require(upload_setting in env_source, f"Konfigurasi upload instansi belum lengkap: {upload_setting}.")
    require(upload_setting.split("=", 1)[0] in bootstrap_source, f"Bootstrap tidak menegakkan konfigurasi upload: {upload_setting}.")
organization_schema_source = read(PACKAGE / "schemas/organization.yaml")
group_schema_source = read(PACKAGE / "schemas/group.yaml")
require(re.search(r"field_name:\s*image_url[\s\S]{0,160}preset:\s*organization_url_upload", organization_schema_source), "Logo organisasi harus memakai field image_url CKAN agar image_display_url terisi.")
require(re.search(r"field_name:\s*image_url[\s\S]{0,160}preset:\s*organization_url_upload", group_schema_source), "Gambar kategori harus memakai field image_url CKAN dan preset upload.")
require("ckan_storage" in read(ROOT / "deploy/ckan/docker-compose.override.yml") or "ckan_storage" in read(ROOT / "deploy/ckan/bootstrap-upstream.sh"), "FileStore harus tetap berada pada volume persisten ckan_storage.")
require("{% ckan_extends %}" in page_source, "page.html harus mewarisi shell CKAN agar block admin upstream tetap utuh.")
sidebar_source = read(SIDEBAR)
pages_detail_source = read(PAGES_DETAIL)
blog_detail_source = read(BLOG_DETAIL)
page_revisions_source = read(PAGE_REVISIONS)
blog_revisions_source = read(BLOG_REVISIONS)
markdown_renderer_source = read(MARKDOWN_RENDERER)
require("ckanext_pages_create" not in sidebar_source, "Sidebar tidak boleh memanggil auth action ckanext_pages_create yang tidak didaftarkan ckanext-pages.")
require("h.check_access('ckanext_pages_update')" in sidebar_source, "Aksi tambah halaman/blog harus memakai authorization function ckanext_pages_update.")
require("h.url_for('pages.new')" in sidebar_source and "h.url_for('pages.blog_new')" in sidebar_source, "Link tambah halaman/blog harus memakai endpoint blueprint ckanext-pages yang valid.")
for template_path, template_source in (
    (PAGES_DETAIL, pages_detail_source),
    (BLOG_DETAIL, blog_detail_source),
    (PAGE_REVISIONS, page_revisions_source),
    (BLOG_REVISIONS, blog_revisions_source),
):
    require("h.portal_render_markdown(" in template_source, f"CKAN Pages/Blog harus merender konten Markdown dengan helper aman: {template_path.relative_to(ROOT)}.")
    require("pages_get_wysiwyg_editor" not in template_source and "|safe" not in template_source, f"Konten Pages/Blog harus selalu diparse sebagai Markdown dan tidak boleh dirender sebagai HTML mentah: {template_path.relative_to(ROOT)}.")
require("{% block secondary_content %}{% endblock %}" in blog_detail_source, "Detail Blog CKAN tidak boleh menampilkan sidebar artikel terbaru yang tidak terkait.")
require("'eye': 'eye'" in icon_source, "Ikon pratinjau revisi harus terdaftar sebagai Font Awesome eye.")
require('background-color: transparent !important' in DESIGN_SYSTEM.read_text(encoding="utf-8") and '.badge[data-format="geojson"]' in DESIGN_SYSTEM.read_text(encoding="utf-8"), "Badge GeoJSON harus menimpa stylesheet geoview dengan latar transparan !important.")
for template_path, template_source, edit_route in (
    (PAGES_DETAIL, pages_detail_source, "pages.edit"),
    (BLOG_DETAIL, blog_detail_source, "pages.blog_edit"),
):
    require('class="portal-cms-actions"' in template_source, f"Pages/Blog detail actions need a spaced toolbar: {template_path.relative_to(ROOT)}.")
    require(edit_route in template_source and "portal_icon('edit')" in template_source, f"Edit action must use the explicit portal edit icon: {template_path.relative_to(ROOT)}.")
    require("portal_icon('eye')" in template_source, f"Revision action must use the explicit portal eye icon: {template_path.relative_to(ROOT)}.")
    require("portal-cms-actions" in template_source and "plus-square" not in template_source, f"CMS actions must use a spaced toolbar and must not use a plus icon for editing: {template_path.relative_to(ROOT)}.")
require("class _TaskListTreeprocessor" in markdown_renderer_source and "_StrikethroughProcessor" in markdown_renderer_source, "Renderer admin harus mendukung task-list dan strikethrough.")
require("list-style: disc outside" in design_system_source and "list-style: decimal outside" in design_system_source, "Daftar Markdown pada detail CKAN harus selalu menampilkan marker ul dan ol meskipun ada reset CSS upstream.")
require("_StrikethroughProcessor(_STRIKE_RE.pattern)" in markdown_renderer_source, "Python-Markdown InlineProcessor harus menerima pattern string, bukan compiled regex; jika tidak, detail Pages/Blog menghasilkan HTTP 500.")
require('extensions=["extra", "sane_lists", _PortalMarkdownExtension()]' in markdown_renderer_source, "Renderer admin harus mendukung tabel, fenced code, dan nested/sane lists.")
require("nh3.clean(" in markdown_renderer_source and "_remove_raw_html" in markdown_renderer_source, "Renderer CKAN harus membersihkan output Markdown dan tidak mengaktifkan raw HTML.")
require(
    "ITemplateHelpers" in plugin_source
    and '"portal_render_markdown": render_portal_markdown' in plugin_source
    and '"render_content": render_portal_markdown' in plugin_source
    and '"pages_get_wysiwyg_editor": self._markdown_only_pages_editor' in plugin_source
    and "def _markdown_only_pages_editor(self)" in plugin_source
    and "return None" in plugin_source,
    "Portal harus override helper upstream Pages yang dipakai detail Pages/Blog: render_content wajib mem-parse Markdown dan pages_get_wysiwyg_editor wajib falsey agar HTML mentah tidak pernah dipakai.",
)
require('toolkit.add_template_directory(config, "templates")' in plugin_source, "Template Portal harus didaftarkan melalui plugin_template_paths CKAN.")
require('config["extra_template_paths"]' not in plugin_source, "Template portal tidak boleh didaftarkan ulang melalui extra_template_paths; duplikasi membuat ckan_extends berputar dengan template Midnight Blue.")
require('"portal_theme"' in bootstrap_source, "Plugin theme Portal harus didaftarkan pada urutan plugin CKAN.")
require("portal-admin-shell" in page_source and 'portal_theme/sidebar.html' in page_source and "{{ super() }}" in page_source, "Page shell harus menambahkan sidebar secara aditif tanpa mengganti konten core CKAN.")
require(all(token in page_source for token in ("portal-login-identity", "portal-login-panel", "portal-login-native", "{{ super() }}")), "Login harus memiliki layout autentikasi modern dan tetap membungkus form native CKAN.")
require("field-login" not in page_source and "field-password" not in page_source, "Template login tidak boleh mengganti field autentikasi native CKAN.")
require("_('Manage official data and publications.')" in page_source and "_('Access is limited to authorized data managers.')" in page_source, "Copy halaman login harus menggunakan gettext katalog Bahasa Indonesia.")
require(re.search(r"{%-?\s*block\s+footer\s*-?%}\s*{%-?\s*endblock\s*-?%}", page_source) is not None, "Footer admin harus dihilangkan dari shell CKAN.")

# Verify WebAssets bundle name and its CSS file are consistent.
require(bool(re.search(r"(?m)^portal_theme:\s*$", assets_source)), "webassets.yml harus mendeklarasikan bundle portal_theme.")
require("css/portal-theme.css" in assets_source, "Bundle portal_theme harus memuat CSS yang dipelihara.")
require("css/portal-admin-design-system.css" in assets_source, "Bundle harus memuat lapisan design system admin setelah theme dasar.")
require(DESIGN_SYSTEM.is_file(), "File design system Portal Admin tidak ditemukan.")
require(assets_source.index("css/portal-theme.css") < assets_source.index("css/portal-admin-design-system.css"), "Design system harus dimuat setelah CSS theme dasar agar token dan komponen konsisten.")
require("portal-theme/%(version)s-portal-theme.css" in assets_source, "Output bundle harus memakai nama versi agar cache dapat diinvalisasi.")
require("cssrewrite" not in assets_source, "Bundle portal tidak boleh menjalankan cssrewrite pada stylesheet tanpa referensi URL; filter ini memicu kegagalan pemetaan asset di CKAN.")

# CKAN's add_public_directory exposes extension public files from URL root.
logo_url = "/institution-logo-default.webp"
require(LOGO.is_file() and LOGO.stat().st_size > 0, "Logo publik portal tidak ditemukan atau kosong.")
require(f"PORTAL_LOGO_PATH={logo_url}" in env_source and '"CKAN__SITE_LOGO": logo_path' in read(ROOT / "deploy/ckan/sync-env.py"), "Logo portal harus menjadi default PORTAL_* dan diturunkan ke CKAN site logo.")
require('configured_default_logo = values.get("PORTAL_LOGO_PATH", "/institution-logo-default.webp")' in bootstrap_source, "Bootstrap harus memakai logo dari konfigurasi identitas portal.")
require('if site_logo in {"", "/base/institution-logo-default.webp"}' in bootstrap_source, "Bootstrap harus memigrasikan path logo lama /base/ yang tidak sesuai.")

# Ensure the extension is packaged and actually installed into the pinned image.
require('"portal_theme = ckanext.portal_theme.plugin:PortalThemePlugin"' in setup_source, "Entry point plugin portal_theme tidak terdaftar pada setup.py.")
require('"portal_pages = ckanext.portal_theme.plugin:PortalPagesSchemaPlugin"' in setup_source, "Entry point schema CMS portal_pages tidak terdaftar pada setup.py.")
require("@toolkit.blanket.config_declarations" in plugin_source, "PortalThemePlugin harus mendaftarkan config declaration agar opsi peta tidak memicu warning CKAN 2.11+.")
config_declaration = read(PACKAGE / "config_declaration.yaml")
for key in (
    "ckanext.spatial.common_map.type",
    "ckanext.spatial.common_map.custom.url",
    "ckanext.spatial.common_map.attribution",
):
    require(f"key: {key}" in config_declaration, f"Opsi peta {key} harus dideklarasikan.")
require("class PortalHarvestTranslationPlugin" in plugin_source and "return \"ckanext-harvest\"" in plugin_source, "Harvest extension must register its own Indonesian gettext domain.")
require("class PortalPagesTranslationPlugin" in plugin_source and "return \"ckanext-pages\"" in plugin_source, "Pages extension must register its own Indonesian gettext domain.")
require("class PortalDcatTranslationPlugin" in plugin_source and "return \"ckanext-dcat\"" in plugin_source, "DCAT extension must register its own Indonesian gettext domain.")
require(all(f'"{entry}"' in setup_source for entry in (
    "portal_harvest_i18n = ckanext.portal_theme.plugin:PortalHarvestTranslationPlugin",
    "portal_pages_i18n = ckanext.portal_theme.plugin:PortalPagesTranslationPlugin",
    "portal_dcat_i18n = ckanext.portal_theme.plugin:PortalDcatTranslationPlugin",
    "portal_xloader_i18n = ckanext.portal_theme.plugin:PortalXloaderTranslationPlugin",
    "portal_geoview_i18n = ckanext.portal_theme.plugin:PortalGeoviewTranslationPlugin",
    "portal_scheming_i18n = ckanext.portal_theme.plugin:PortalSchemingTranslationPlugin",
)), "Entry points for every managed Indonesian extension translation domain must be installed.")
require("IPagesSchema" in plugin_source and "def update_pages_schema(self, schema)" in plugin_source, "Plugin Portal harus memperluas schema ckanext-pages melalui IPagesSchema.")
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
    all(name in plugin_order for name in ("scheming_datasets", "portal_pages", "portal_theme", "pages", "activity"))
    and plugin_order.index("scheming_datasets") < plugin_order.index("portal_pages")
    and plugin_order.index("portal_pages") < plugin_order.index("pages")
    and plugin_order.index("portal_theme") < plugin_order.index("pages")
    and plugin_order.index("portal_theme") < plugin_order.index("activity"),
    "Scheming dan portal Pages harus terdaftar sebelum Pages; Portal theme harus sebelum Pages dan Activity karena CKAN membalik urutan IConfigurer/ITemplateHelpers.",
)
translation_plugins = ("portal_harvest_i18n", "portal_pages_i18n", "portal_dcat_i18n", "portal_xloader_i18n", "portal_geoview_i18n", "portal_scheming_i18n")
require(all(f'"{name}"' in bootstrap_source for name in translation_plugins), "Bootstrap harus mengaktifkan semua domain terjemahan extension yang dikelola.")
translation_pairs = (("harvest", "portal_harvest_i18n"), ("pages", "portal_pages_i18n"), ("dcat", "portal_dcat_i18n"), ("xloader", "portal_xloader_i18n"), ("geo_view", "portal_geoview_i18n"), ("scheming_groups", "portal_scheming_i18n"))
require(all(extension in plugin_order and translator in plugin_order and plugin_order.index(extension) < plugin_order.index(translator) for extension, translator in translation_pairs), "Translation plugin harus aktif setelah extension yang katalog domainnya dimuat.")
require('plugins.append("envvars")' in bootstrap_source, "envvars harus tetap menjadi plugin terakhir.")
require('values["CKANEXT__PAGES__EDITOR"]' not in bootstrap_source and "CKANEXT__PAGES__EDITOR=markdown" not in env_source, "CKAN Pages Markdown mode must leave editor unset; the literal markdown value is truthy and triggers the upstream WYSIWYG branch.")
workflow = "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / ".github/workflows").glob("*.yml"))
require("COPY deploy/ckan/theme/ /tmp/portal-ckan-theme/" in workflow, "Extended CKAN smoke image harus memasukkan source package portal_theme.")
require("compile-id-translations.py" in workflow and "/tmp/compile-id-translations.py" in workflow, "Extended CKAN smoke image harus mengompilasi katalog CKAN Bahasa Indonesia.")
require("read_mo" in TRANSLATION_COMPILER.read_text(encoding="utf-8") and "_overlay_message_catalog(merged_catalog" in TRANSLATION_COMPILER.read_text(encoding="utf-8") and "target.add(" in TRANSLATION_COMPILER.read_text(encoding="utf-8"), "Kompilasi portal PO harus menggabungkan, bukan menimpa, katalog Bahasa Indonesia bawaan CKAN.")
require("compile_extension_catalogs" in TRANSLATION_COMPILER.read_text(encoding="utf-8") and 'glob("ckanext-*.po")' in TRANSLATION_COMPILER.read_text(encoding="utf-8"), "Compiler harus menemukan dan menghasilkan katalog untuk domain extension terpisah.")
require('for suffix in ("mo", "po")' in TRANSLATION_COMPILER.read_text(encoding="utf-8"), "Compiler harus menggabungkan katalog upstream extension dalam format MO maupun PO.")
require('"fuzzy" in message.flags' in TRANSLATION_COMPILER.read_text(encoding="utf-8"), "Entri fuzzy tidak boleh menimpa pesan upstream yang telah diterjemahkan.")
require("check-id-translations.py" in read(ROOT / "scripts/check-static.sh"), "Static CI harus menguji kelengkapan katalog Bahasa Indonesia dan placeholder.")
require("USER root" in workflow and "RUN python -m pip install --no-cache-dir -r /tmp/portal-ckan-extensions.txt /tmp/portal-ckan-theme" in workflow and "check-plugins.py" in workflow, "Extended CKAN smoke harus memasang extension/theme secara global sebagai root sebelum memeriksa entry point plugin.")
for caddy_name in ("Caddyfile", "Caddyfile.basic-auth", "Caddyfile.tunnel", "Caddyfile.tunnel.access", "Caddyfile.tunnel.basic-auth"):
    caddy = read(ROOT / "deploy/ckan" / caddy_name)
    admin_block = caddy.split("{$CKAN_HOST}", 1)[-1]
    require("reverse_proxy https://nginx:443" in admin_block, f"{caddy_name}: semua route host admin harus diteruskan ke CKAN.")
    require("X-Forwarded-Host {http.request.host}" in admin_block, f"{caddy_name}: hostname asli harus diteruskan ke CKAN untuk auth guard.")
    require("@adminSitemap path" in admin_block, f"{caddy_name}: sitemap host admin harus tetap ditutup.")
    require("redir https://{$PUBLIC_HOST}{uri}" not in admin_block, f"{caddy_name}: route CKAN tidak boleh dialihkan ke Next.js setelah login.")
    require("@adminActions path" not in admin_block, f"{caddy_name}: jangan gunakan allowlist route yang membuat menu/extension CKAN tidak bisa diakses.")
require('config.get("ckan.site_logo"' in plugin_source and "static_paths.add(logo_path.lower())" in plugin_source, "Aset logo yang dikonfigurasi harus dikecualikan dari login guard secara dinamis.")
require("CKANEXT__PORTAL_THEME__ADMIN_HOST" in read(ROOT / "deploy/ckan/sync-env.py"), "Hostname admin yang dipakai auth guard harus diturunkan dari CKAN_HOST.")

# Keep the extension intentionally additive: only common shell templates are overridden.
actual_templates = sorted(path.relative_to(PACKAGE / "templates").as_posix() for path in (PACKAGE / "templates").rglob("*.html"))
require(actual_templates == ["base.html", "ckanext_pages/base_form.html", "ckanext_pages/blog.html", "ckanext_pages/blog_revisions_preview.html", "ckanext_pages/page.html", "ckanext_pages/page_revisions_preview.html", "header.html", "home/snippets/about_text.html", "home/snippets/promoted.html", "page.html", "portal_theme/context_help.html", "portal_theme/dashboard.html", "portal_theme/data_preview.html", "portal_theme/icon.html", "portal_theme/sidebar.html", "scheming/display_snippets/markdown.html"], "Theme boleh mengganti shell bersama, form dan detail CKAN Pages/Blog, tampilan Markdown Scheming, dashboard/sidebar serta snippet beranda; route dan modul CKAN lain tetap native.")
CMS_FORM = PACKAGE / "templates/ckanext_pages/base_form.html"
dashboard_source = read(DASHBOARD)
require("portal-dashboard__welcome-mark" not in dashboard_source and "portal-login-identity__watermark" not in page_source, "Dashboard dan login tidak boleh menambahkan ornamen identitas yang tidak membawa informasi.")
require("portal_icon('arrow-right')" not in dashboard_source, "Tautan dashboard tidak boleh memakai panah dekoratif berulang.")
data_preview_source = read(DATA_PREVIEW)
require("Portal Data portal" not in sidebar_source and "Kabupaten portal" not in sidebar_source and "portal-admin-sidebar__context" not in sidebar_source and "portal-admin-sidebar__footer" not in sidebar_source, "Sidebar admin harus langsung dimulai dari grup menu tanpa identitas tambahan atau footer.")
require("portal-admin-nav__children" in sidebar_source and "Add information page" in sidebar_source and "Add news article" in sidebar_source, "Aksi tambah CMS harus berada tepat di bawah menu parent-nya.")
require("portal_admin_stats" in dashboard_source and "portal_admin_recent_datasets" in dashboard_source, "Dashboard harus memakai ringkasan yang disiapkan oleh view CKAN.")
require("_('Welcome back')" in dashboard_source and "portal-dashboard__metrics" in dashboard_source, "Dashboard harus memiliki sapaan yang dilokalkan dan panel metrik.")
require("h.check_access('package_create')" in dashboard_source and "h.check_access('organization_create')" in dashboard_source, "Quick action dashboard harus menghormati permission CKAN.")
require("h.url_for(dataset_type ~ '.read', id=item.name)" in dashboard_source, "Tautan dataset terbaru harus menggunakan route native CKAN.")
require("request.path" in sidebar_source and "h.url_for('portal_admin.index')" in sidebar_source, "Sidebar harus mendeteksi route aktif dan memakai route ringkasan Portal Admin.")
require("h.url_for('dashboard.datasets')" in sidebar_source and "h.url_for('dashboard.organizations')" in sidebar_source and "h.url_for('dashboard.groups')" in sidebar_source, "Sidebar harus mempertahankan route dashboard native pengguna.")
require("/pages" in sidebar_source and "/blog" in sidebar_source and "/harvest" in sidebar_source, "Sidebar harus menyediakan tautan ke Pages, Blog, dan Harvest.")
required_nav_translations = {
    "All datasets": "Semua dataset",
    "Organizations": "Organisasi",
    "Data categories": "Kategori data",
    "Publications & reports": "Publikasi & laporan",
    "Indicators & statistics": "Indikator & statistik",
    "Infographics": "Infografik",
    "Portal pages": "Halaman portal",
    "News and articles": "Berita dan artikel",
    "Data harvesting": "Pengambilan data",
    "DataStore & preview": "DataStore & pratinjau",
    "Add thematic category": "Tambah kategori tematik",
    "Add information page": "Tambah halaman informasi",
    "Add news article": "Tambah artikel berita",
}
for msgid, translation in required_nav_translations.items():
    require(f"_('{msgid}')" in sidebar_source, f"Sidebar admin harus memakai gettext untuk {msgid}.")
    require(f'msgid "{msgid}"\nmsgstr "{translation}"' in read(INDONESIAN_PO), f"Label sidebar {msgid} harus tersedia dalam Bahasa Indonesia.")
required_dashboard_translations = {
    "Create content by type": "Buat konten berdasarkan jenis",
    "General dataset": "Dataset umum",
    "Indicator": "Indikator",
    "Infographic": "Infografik",
    "Publication": "Publikasi",
    "Geospatial data": "Data geospasial",
    "Create a thematic category": "Buat kategori tematik",
    "Add general dataset": "Tambah dataset umum",
    "Add geospatial data": "Tambah data geospasial",
}
for msgid, translation in required_dashboard_translations.items():
    require(f"_('{msgid}')" in dashboard_source or f"_('{msgid}')" in sidebar_source, f"Dashboard/admin navigation harus memakai gettext untuk {msgid}.")
    require(f'msgid "{msgid}"\nmsgstr "{translation}"' in read(INDONESIAN_PO), f"Label dasbor {msgid} harus tersedia dalam Bahasa Indonesia.")
require("portal_type='indikator'" in dashboard_source and "portal_type='infografik'" in dashboard_source and "portal_type='publikasi'" in dashboard_source and "portal_type='geospasial'" in dashboard_source, "Dashboard harus menyediakan pintasan tambah konten dengan tipe portal yang telah dipilih.")
require("h.default_group_type('group') ~ '.new'" in dashboard_source, "Pembuatan kategori tematik harus tetap memakai entitas Group CKAN yang terpisah dari tipe dataset.")
require("data-portal-package-portal-type" in page_source, "Form resource harus menerima konteks tipe portal dari dataset induk.")
# Replace CKAN's stock English marketing/placeholder copy on the public home page.
ABOUT_SNIPPET = read(PACKAGE / "templates/home/snippets/about_text.html")
PROMOTED_SNIPPET = read(PACKAGE / "templates/home/snippets/promoted.html")
stock_home_phrases = (
    "Welcome to CKAN",
    "This is a nice introductory paragraph",
    "world’s leading open-source data portal platform",
    "This is a featured section",
    "Placeholder",
)
for phrase in stock_home_phrases:
    require(phrase not in ABOUT_SNIPPET and phrase not in PROMOTED_SNIPPET, f"Teks promosi/placeholder bawaan CKAN harus diganti pada halaman beranda: {phrase}")
require("g.site_title" in ABOUT_SNIPPET and "g.site_description" in ABOUT_SNIPPET and "g.site_title" in PROMOTED_SNIPPET and "g.site_description" in PROMOTED_SNIPPET, "Beranda CKAN harus menggunakan nama dan deskripsi portal dari konfigurasi identitas.")
init_extensions_source = read(ROOT / "deploy/ckan/initialize-extensions.sh")
require("ckan -c /srv/app/ckan.ini translation js" in init_extensions_source, "Katalog terjemahan JavaScript harus dibangun setelah plugin CKAN aktif agar widget browser ikut berbahasa Indonesia.")
context_help_source = read(PACKAGE / "templates/portal_theme/context_help.html")
for tag in ("portal-publikasi", "portal-indikator", "portal-infografik"):
    require(tag in context_help_source and "current_dataset_tags" in context_help_source, f"Panduan halaman detail harus mengenali dataset dengan tag {tag}.")
require("Panduan halaman ini" in context_help_source and "guide_action_label" in context_help_source, "Setiap halaman admin harus memiliki panduan kontekstual dan aksi lanjutan.")
require("tags:portal-publikasi" in sidebar_source and "tags:portal-indikator" in sidebar_source and "tags:portal-infografik" in sidebar_source, "Menu publikasi, indikator, dan infografik harus menggunakan tag CKAN yang sama dengan frontend publik.")
require("/admin/data-preview" in sidebar_source, "Sidebar harus menyediakan akses ke panduan DataStore dan pratinjau.")
require("portal_icon('check'" in data_preview_source and 'data-copy-command' in data_preview_source and 'portal_admin.data_preview_backfill' in data_preview_source + plugin_source, "Panduan DataStore harus berupa alur UI dengan status, aksi salin perintah, dan tombol backfill.")
require("xloader_submit" in plugin_source and 'def data_preview_backfill()' in plugin_source and 'maximum_jobs = 25' in plugin_source, "Panduan DataStore harus menyediakan antrean backfill terbatas melalui action XLoader.")
form_source = read(CMS_FORM)
require("{% ckan_extends %}" in form_source and "{% block extra_pages_form %}" in form_source, "Form CMS harus mewarisi form upstream dan mengisi block extra_pages_form.")
require(all(f'name=\"{field}\"' in form_source for field in ("excerpt", "category", "template_type", "featured", "show_in_menu", "seo_title", "seo_description", "og_image", "content_blocks")), "Form CMS belum menampilkan semua field editorial penting.")
require("errors.content_blocks" in form_source, "Form CMS harus menampilkan kesalahan validasi JSON content blocks.")
require("{% block scripts %}" in form_source and "{{ super() }}" in form_source, "CKAN Pages form must preserve inherited CKAN/portal assets; upstream replaces the scripts block.")
require("'edit': 'pen-to-square'" in icon_source and "'pencil': 'pencil'" in icon_source, "Semantic edit icons must map to Font Awesome Free Solid pencil glyphs, never plus.")
admin_forms_source = read(PACKAGE / "public/portal-admin-forms.js")
require("function enhancePagesAdminUi()" in admin_forms_source and "portal-pages-admin-route" in admin_forms_source, "Pages and News admin routes must receive the editorial layout treatment.")
require("function isPagesAdminListingRoute()" in admin_forms_source and "portal-pages-admin-list-route" in admin_forms_source, "Collection list styling must be scoped separately from Pages/News editor content.")
require("function isBlogAdminRoute()" in admin_forms_source and "portal-blog-admin-route" in admin_forms_source, "News routes must be identifiable independently so only their contextual sidebar is removed.")
require("PortalEditorialAdminRoutes" in admin_forms_source, "Editorial route detection must be exposed for deterministic route regression tests.")
require("fa-pen-to-square" in admin_forms_source and "fa-plus" in admin_forms_source, "Edit actions accidentally rendered with plus icons must be corrected without changing create actions.")
require('String(parts[1] || "").toLowerCase()' in admin_forms_source, "CKAN editorial route detection must tolerate uppercase path segments.")
require(not re.search(r"{%\s*set\b", form_source), "Form CMS tidak boleh memakai assignment tag Jinja; gunakan ekspresi inline agar kompatibilitas template tetap sederhana.")
prettierignore = read(ROOT / ".prettierignore")
require("deploy/ckan/theme/**/*.html" in prettierignore, "Template CKAN Jinja harus dikecualikan dari Prettier HTML parser.")
require(not re.search(r"<option\b[^>]*\{\{", form_source), "Form CMS tidak boleh menaruh ekspresi Jinja tanpa kutip di atribut option; gunakan conditional yang membungkus option utuh.")

require('"config_declaration.yaml"' in setup_source and "include ckanext/portal_theme/config_declaration.yaml" in read(THEME / "MANIFEST.in"), "Config declaration peta harus ikut terpaket bersama extension portal.")
require('"schemas/*.yaml"' in setup_source and "recursive-include ckanext/portal_theme/schemas *.yaml" in read(THEME / "MANIFEST.in"), "Schema Scheming harus masuk ke wheel extension sebagai package data.")

# Parse CKAN Jinja templates and exercise representative CMS form renderings.
try:
    from jinja2 import DictLoader, Environment

    env = Environment()
    normalized_form = form_source.replace("{% ckan_extends %}", '{% extends "base.html" %}')
    for path, source in (
        (BASE, base_source), (HEADER, header_source), (PAGE, page_source),
        (CMS_FORM, form_source), (DASHBOARD, dashboard_source),
        (DATA_PREVIEW, data_preview_source), (SIDEBAR, sidebar_source),
        (PAGES_DETAIL, pages_detail_source), (BLOG_DETAIL, blog_detail_source),
        (PAGE_REVISIONS, page_revisions_source), (BLOG_REVISIONS, blog_revisions_source),
    ):
        normalized = source.replace("{% ckan_extends %}", '{% extends "base.html" %}')
        normalized = re.sub(r"{%\s*asset\s+(['\"]).*?\1\s*%}", "{% set portal_theme_asset_loaded = true %}", normalized)
        normalized = re.sub(r"{%\s*link_for\b[\s\S]*?%}", "{{ '' }}", normalized)
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
        "portal_theme/sidebar.html": "PORTAL_ADMIN_SIDEBAR",
        "portal_theme/context_help.html": "PORTAL_CONTEXT_HELP",
    }))
    chrome_template = chrome_env.get_template("page.html")
    anonymous_render = chrome_template.render(c={"userobj": None}, g={"site_url": "https://data.example.test"}, _=lambda message: message)
    admin_render = chrome_template.render(c={"userobj": object()}, g={"site_url": "https://data.example.test"}, _=lambda message: message)
    require("UPSTREAM_HEADER" not in anonymous_render and "UPSTREAM_FOOTER" not in anonymous_render and "PORTAL_ADMIN_SIDEBAR" not in anonymous_render and "PORTAL_CONTEXT_HELP" not in anonymous_render,
            "Header/footer/sidebar CKAN harus disembunyikan untuk pengguna anonim.")
    require("ADMIN_CONTENT" in anonymous_render,
            "Menyembunyikan chrome anonim tidak boleh menghilangkan konten halaman/login.")
    require("UPSTREAM_HEADER" in admin_render and "UPSTREAM_FOOTER" not in admin_render and "portal-admin-footer" not in admin_render and "ADMIN_CONTENT" in admin_render and "PORTAL_ADMIN_SIDEBAR" in admin_render and "PORTAL_CONTEXT_HELP" in admin_render,
            "Administrator harus mendapatkan topbar, sidebar menu, dan konten CKAN tanpa footer tambahan.")

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

if ERRORS:
    print(f"CKAN admin theme regression check failed ({len(ERRORS)}):", file=sys.stderr)
    print(f"Theme project root: {ROOT}", file=sys.stderr)
    if git_revision:
        print(f"Theme Git revision: {git_revision}", file=sys.stderr)
    print("Theme source files checked:", file=sys.stderr)
    for path in (CSS, DESIGN_SYSTEM, ASSETS, PLUGIN, PUBLIC_MOTION):
        if path.is_file():
            digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            print(f"- {path.relative_to(ROOT)} sha256={digest} bytes={path.stat().st_size}", file=sys.stderr)
        else:
            print(f"- {path.relative_to(ROOT)} MISSING", file=sys.stderr)
    for error in ERRORS:
        print(f"- {error}", file=sys.stderr)
    raise SystemExit(1)

css_fingerprints = "; ".join(
    f"{path.name}={hashlib.sha256(path.read_bytes()).hexdigest()[:12]}"
    for path in (CSS, DESIGN_SYSTEM, ASSETS, PUBLIC_MOTION)
    if path.is_file()
)
print("CKAN admin theme/CMS regression check passed: CKAN 2.12 templates, WebAssets, Bahasa Indonesia catalog/default locale, logo, Pages schema/form, packaging, plugin order, responsive login, and additive template scope verified.")
if git_revision:
    print(f"Theme Git revision: {git_revision}")
print(f"Theme source fingerprint: {css_fingerprints}")

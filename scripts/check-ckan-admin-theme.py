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
require("{% block styles %}" in base_source and "{{ super() }}" in base_source, "base.html harus mempertahankan CSS bawaan CKAN melalui block styles + super().")
require("{% asset 'wajo_theme/wajo_theme' %}" in base_source, "Bundle WebAssets tidak dimuat pada base template.")
require("{% ckan_extends %}" in header_source, "header.html harus mewarisi header CKAN.")
require("{% block header_logo %}" in header_source, "Override header harus memakai block header_logo CKAN 2.12.1.")
require("h.url_for('dashboard.datasets') if c.userobj else h.url_for('user.login')" in header_source, "Tautan logo harus aman untuk pengguna login maupun belum login.")
require("g.site_title" in header_source and "h.url_for_static_or_external(g.site_logo)" in header_source, "Branding harus tetap mengikuti konfigurasi site title/logo CKAN.")

# Verify WebAssets bundle name and its CSS file are consistent.
require(bool(re.search(r"(?m)^wajo_theme:\s*$", assets_source)), "webassets.yml harus mendeklarasikan bundle wajo_theme.")
require("css/wajo-theme.css" in assets_source, "Bundle wajo_theme harus memuat CSS yang dipelihara.")
require("wajo-theme/%(version)s-wajo-theme.css" in assets_source, "Output bundle harus memakai nama versi agar cache dapat diinvalisasi.")

# CKAN's add_public_directory exposes extension public files from URL root.
logo_url = "/logo-kabupaten-wajo.webp"
require(LOGO.is_file() and LOGO.stat().st_size > 0, "Logo publik Wajo tidak ditemukan atau kosong.")
require(f"CKAN__SITE_LOGO={logo_url}" in env_source, "CKAN__SITE_LOGO harus memakai URL root yang sesuai dengan add_public_directory().")
require('site_logo = values.get("CKAN__SITE_LOGO", "/logo-kabupaten-wajo.webp")' in bootstrap_source, "Bootstrap default logo path tidak sinkron dengan public directory.")
require('if site_logo in {"", "/base/logo-kabupaten-wajo.webp"}' in bootstrap_source, "Bootstrap harus memigrasikan path logo lama /base/ yang tidak sesuai.")

# Ensure the extension is packaged and actually installed into the pinned image.
require('"wajo_theme = ckanext.wajo_theme.plugin:WajoThemePlugin"' in setup_source, "Entry point plugin wajo_theme tidak terdaftar pada setup.py.")
manifest = read(THEME / "MANIFEST.in")
for expected in (
    "templates *.html",
    "assets *.yml *.css",
    "public *",
):
    require(expected in manifest, f"MANIFEST.in tidak memasukkan {expected}.")
configurator = read(ROOT / "deploy/ckan/configure-upstream-extensions.py")
require("shutil.copytree(theme_source, theme_destination)" in configurator, "Bootstrap tidak menyalin source extension theme ke build context.")
require("pip install --no-cache-dir -r /tmp/portal-ckan-extensions.txt /tmp/portal-ckan-theme" in configurator, "Docker build tidak memasang package theme.")
require("plugins.append(\"wajo_theme\")" in bootstrap_source, "Plugin theme harus diaktifkan setelah extension yang juga menyediakan template.")
require('plugins.append("envvars")' in bootstrap_source, "Plugin envvars harus tetap berada terakhir.")
workflow = read(ROOT / ".github/workflows/ci.yml")
require("COPY deploy/ckan/theme/ /tmp/portal-ckan-theme/" in workflow, "CI Docker smoke image harus memasukkan source package wajo_theme.")
require("/tmp/portal-ckan-theme" in workflow and "check-ckan-plugin-entrypoints.py" in workflow, "CI harus menginstal theme sebelum memeriksa entry point plugin.")
for caddy_name in ("Caddyfile", "Caddyfile.basic-auth", "Caddyfile.tunnel", "Caddyfile.tunnel.access", "Caddyfile.tunnel.basic-auth"):
    caddy = read(ROOT / "deploy/ckan" / caddy_name)
    require("came_from=%2Fdashboard%2Fdatasets" in caddy, f"{caddy_name}: redirect login harus kembali ke dashboard dataset, bukan halaman konfigurasi khusus sysadmin.")
    require("%2Fckan-admin%2Fconfig%2F" not in caddy, f"{caddy_name}: landing admin lama hanya bisa diakses sysadmin dan membingungkan editor.")

# Keep the extension intentionally additive: only common shell templates are overridden.
actual_templates = sorted(path.relative_to(PACKAGE / "templates").as_posix() for path in (PACKAGE / "templates").rglob("*.html"))
require(actual_templates == ["base.html", "header.html"], "Theme hanya boleh mengganti shell bersama (base/header), bukan template fitur CKAN.")

# The CSS must remain parseable and preserve the responsive login fallback.
require(css_source.count("{") == css_source.count("}"), "CSS memiliki jumlah kurung blok yang tidak seimbang.")
require(":has(#field-login)" in css_source, "Layout login khusus tidak ditemukan.")
require("@media (max-width: 991.98px)" in css_source, "Layout login/header harus punya breakpoint tablet/mobile.")
require("@media (prefers-reduced-motion: reduce)" in css_source, "Theme harus menghormati prefers-reduced-motion.")
require(":focus-visible" in css_source, "Focus indicator keyboard tidak ditemukan.")
require("position: fixed" not in css_source, "Theme tidak boleh membuat overlay fixed global yang berpotensi menutup kontrol CKAN.")

# Parse Jinja and CSS with the parsers already present in a CKAN dev environment.
try:
    from jinja2 import Environment

    env = Environment()
    for path, source in ((BASE, base_source), (HEADER, header_source)):
        normalized = source.replace("{% ckan_extends %}", '{% extends "base.html" %}')
        normalized = re.sub(r"{%\s*asset\s+(['\"]).*?\1\s*%}", "{% set wajo_theme_asset_loaded = true %}", normalized)
        try:
            env.parse(normalized)
        except Exception as error:  # Jinja exceptions differ by version.
            ERRORS.append(f"Template Jinja tidak valid di {path.relative_to(ROOT)}: {error}")
except ImportError:
    pass

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

print("CKAN admin theme regression check passed: CKAN 2.12 template blocks, Jinja/CSS syntax, WebAssets, public logo path, packaging, plugin order, responsive login, and additive-only template scope verified.")

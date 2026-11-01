#!/usr/bin/env python3
"""Guard the split public/CKAN-host routing required by CKAN GeoView."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CADDYFILES = (
    "deploy/ckan/Caddyfile",
    "deploy/ckan/Caddyfile.basic-auth",
    "deploy/ckan/Caddyfile.tunnel",
    "deploy/ckan/Caddyfile.tunnel.access",
    "deploy/ckan/Caddyfile.tunnel.basic-auth",
)

errors: list[str] = []
for relative in CADDYFILES:
    path = ROOT / relative
    source = path.read_text(encoding="utf-8")
    public_start = re.search(r"(?m)^(?:http://)?\{\$PUBLIC_HOST\}\s*\{", source)
    if not public_start:
        errors.append(f"{relative}: blok host publik tidak ditemukan.")
        continue
    remainder = source[public_start.end():]
    admin_start = re.search(r"(?m)^(?:http://)?\{\$CKAN_HOST\}\s*\{", remainder)
    if not admin_start:
        errors.append(f"{relative}: blok host admin tidak ditemukan setelah host publik.")
        continue
    public_block = remainder[:admin_start.start()]

    required = {
        "preflight matcher": "@ckanGeoPreflight {",
        "i18n preflight path": "path /api/i18n/* /api/3/action/resource_proxy /api/action/resource_proxy",
        "preflight method": "method OPTIONS",
        "preflight response": 'respond "" 204',
        "i18n route": "@ckanI18n path /api/i18n/*",
        "i18n reverse proxy": "handle @ckanI18n {\n    header {",
        "deferred exact allowed origin": '>Access-Control-Allow-Origin "https://{$CKAN_HOST}"',
        "resource proxy route": "@ckanResourceProxy path /api/3/action/resource_proxy /api/action/resource_proxy",
        "resource proxy exposed headers": '>Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges, Content-Type"',
        "CKAN upstream": "reverse_proxy https://nginx:443",
    }
    for label, needle in required.items():
        if needle not in public_block:
            errors.append(f"{relative}: {label} belum dikonfigurasi pada host publik.")

    if (
        "Access-Control-Allow-Origin *" in public_block
        or "Access-Control-Allow-Credentials true" in public_block
        or "Access-Control-Allow-Credentials \"true\"" in public_block
    ):
        errors.append(f"{relative}: CORS wildcard/credentials tidak boleh diaktifkan untuk GeoView.")

    if public_block.find("handle @ckanGeoPreflight") > public_block.find("handle @ckanI18n"):
        errors.append(f"{relative}: handler preflight harus mendahului handler i18n.")
    if public_block.find("handle @ckanI18n") > public_block.find("handle {"):
        errors.append(f"{relative}: route i18n harus berada sebelum fallback Next.js.")

    for preserved in (
        "@ckanResourceView path_regexp",
        "@ckanViewerAssets path",
        "@ckanResourceProxy path",
        "@publicResourceDownload path_regexp",
        "reverse_proxy nextjs:3000",
    ):
        if preserved not in public_block:
            errors.append(f"{relative}: route existing {preserved!r} hilang.")

if errors:
    raise SystemExit("\n".join(errors))

print("CKAN GeoView routing passed: /api/i18n and resource_proxy are forwarded to CKAN with narrowly scoped CORS for CKAN_HOST.")

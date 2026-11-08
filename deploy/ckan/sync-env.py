#!/usr/bin/env python3
"""Synchronize derived deployment values from the canonical .env.ckan file.

Institution identity lives in PORTAL_* settings. Legacy NEXT_PUBLIC_* and
CKAN__SITE_* branding keys are still accepted as migration inputs, then
normalized to the canonical identity so Next.js and CKAN never drift apart.
"""
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit("usage: sync-env.py .env.ckan")
path = Path(sys.argv[1])
if not path.is_file():
    raise SystemExit(f"Missing canonical environment file: {path}")
lines = path.read_text().splitlines()
values = {}
for line in lines:
    match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
    if match:
        key, value = match.group(1), match.group(2).strip().strip('"').strip("'")
        if key in values:
            raise SystemExit(f"Duplicate environment key in {path}: {key}")
        values[key] = value

for key in ("PUBLIC_HOST", "CKAN_HOST"):
    host = values.get(key, "").strip()
    labels = host.split(".")
    valid = all(re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?", label) for label in labels)
    if not host or len(host) > 253 or not valid:
        raise SystemExit(f"{key} must be a valid DNS hostname without scheme/path/port: {host!r}")

if values["PUBLIC_HOST"].lower() == values["CKAN_HOST"].lower():
    raise SystemExit("PUBLIC_HOST and CKAN_HOST must be different hostnames so admin routes cannot collide with the public portal.")

# PORTAL_* is the sole institution identity contract. All fallbacks are
# institution-neutral; deployment-specific defaults belong in .env.ckan.example.
def first_value(*candidates: str) -> str:
    for candidate in candidates:
        normalized = str(candidate or "").strip()
        if normalized:
            return normalized
    return ""

region_name = first_value(values.get("PORTAL_INSTITUTION_NAME"), values.get("NEXT_PUBLIC_REGION_NAME"), "Instansi Pengampu")
region_short_name = first_value(
    values.get("PORTAL_INSTITUTION_SHORT_NAME"), values.get("NEXT_PUBLIC_REGION_SHORT_NAME")
) or re.sub(r"^(?:Kabupaten|Kota|Provinsi|Kecamatan)\s+", "", region_name, flags=re.I)
brand_name = first_value(values.get("PORTAL_BRAND_NAME"), values.get("NEXT_PUBLIC_APP_NAME"), values.get("CKAN__SITE_TITLE")) or f"Portal Satu Data {region_name}"
short_name = first_value(values.get("PORTAL_SHORT_NAME"), values.get("NEXT_PUBLIC_SHORT_NAME")) or f"Satu Data {region_short_name}"
organization_name = first_value(values.get("PORTAL_ORGANIZATION_NAME"), values.get("NEXT_PUBLIC_ORGANIZATION_NAME")) or f"Pemerintah {region_name}"
site_description = first_value(values.get("PORTAL_SITE_DESCRIPTION"), values.get("NEXT_PUBLIC_SITE_DESCRIPTION"), values.get("CKAN__SITE_DESCRIPTION")) or f"Portal resmi untuk menemukan, memahami, dan menggunakan data publik {region_name}."
public_subtitle = first_value(values.get("PORTAL_PUBLIC_SUBTITLE"), values.get("NEXT_PUBLIC_PUBLIC_SUBTITLE")) or f"Portal Data {region_name}"
logo_path = first_value(values.get("PORTAL_LOGO_PATH"), values.get("NEXT_PUBLIC_LOGO_PATH"), values.get("CKAN__SITE_LOGO")) or "/icons/portal.svg"
logo_alt = first_value(values.get("PORTAL_LOGO_ALT"), values.get("NEXT_PUBLIC_LOGO_ALT")) or f"Logo {brand_name}"
hero_image = first_value(values.get("PORTAL_HERO_IMAGE"), values.get("NEXT_PUBLIC_HERO_IMAGE")) or "/portal-social.svg"
hero_map_image = first_value(values.get("PORTAL_HERO_MAP_IMAGE"), values.get("NEXT_PUBLIC_HERO_MAP_IMAGE"))
welcome_message = first_value(values.get("PORTAL_WELCOME_MESSAGE"), values.get("NEXT_PUBLIC_WELCOME_MESSAGE"))
regent_name = first_value(values.get("PORTAL_REGENT_NAME"), values.get("NEXT_PUBLIC_REGENT_NAME"))
regent_photo = first_value(values.get("PORTAL_REGENT_PHOTO"), values.get("NEXT_PUBLIC_REGENT_PHOTO"))
deputy_regent_name = first_value(values.get("PORTAL_DEPUTY_REGENT_NAME"), values.get("NEXT_PUBLIC_DEPUTY_REGENT_NAME"))
deputy_regent_photo = first_value(values.get("PORTAL_DEPUTY_REGENT_PHOTO"), values.get("NEXT_PUBLIC_DEPUTY_REGENT_PHOTO"))
brand_profile = first_value(values.get("PORTAL_BRAND_PROFILE"), values.get("NEXT_PUBLIC_BRAND_PROFILE")) or "generic"
identity = {
    "PORTAL_INSTITUTION_NAME": region_name,
    "PORTAL_INSTITUTION_SHORT_NAME": region_short_name,
    "PORTAL_BRAND_NAME": brand_name,
    "PORTAL_SHORT_NAME": short_name,
    "PORTAL_ORGANIZATION_NAME": organization_name,
    "PORTAL_SITE_DESCRIPTION": site_description,
    "PORTAL_PUBLIC_SUBTITLE": public_subtitle,
    "PORTAL_LOGO_PATH": logo_path,
    "PORTAL_LOGO_ALT": logo_alt,
    "PORTAL_HERO_IMAGE": hero_image,
    "PORTAL_BRAND_PROFILE": brand_profile,
}
icon_path = first_value(values.get("PORTAL_ICON_PATH"), values.get("NEXT_PUBLIC_ICON_PATH")) or "/icons/portal.svg"
pwa_icon_192 = first_value(values.get("PORTAL_PWA_ICON_192"), values.get("NEXT_PUBLIC_PWA_ICON_192")) or "/icons/portal.svg"
pwa_icon_512 = first_value(values.get("PORTAL_PWA_ICON_512"), values.get("NEXT_PUBLIC_PWA_ICON_512")) or "/icons/portal.svg"
identity.update({
    "PORTAL_ICON_PATH": icon_path,
    "PORTAL_PWA_ICON_192": pwa_icon_192,
    "PORTAL_PWA_ICON_512": pwa_icon_512,
})

# PPID endpoints and contact details are explicit per-deployment settings.
ppid_name = first_value(values.get("PORTAL_PPID_NAME"), values.get("NEXT_PUBLIC_PPID_NAME"), "PPID instansi")
ppid_url = first_value(values.get("PORTAL_PPID_URL"), values.get("NEXT_PUBLIC_PPID_URL"))
ppid_contact_url = first_value(values.get("PORTAL_PPID_CONTACT_URL"), values.get("NEXT_PUBLIC_PPID_CONTACT_URL"))
ppid_address = first_value(values.get("PORTAL_PPID_ADDRESS"), values.get("NEXT_PUBLIC_PPID_ADDRESS"))
ppid_email = first_value(values.get("PORTAL_PPID_EMAIL"), values.get("NEXT_PUBLIC_PPID_EMAIL"))
ppid_phone = first_value(values.get("PORTAL_PPID_PHONE"), values.get("NEXT_PUBLIC_PPID_PHONE"))

# Shared design tokens have safe neutral defaults and can be overridden per
# deployment without changing component names or source files.
theme_color = first_value(values.get("PORTAL_THEME_COLOR"), values.get("NEXT_PUBLIC_THEME_COLOR"), "#174566")
pwa_background_color = first_value(
    values.get("PORTAL_PWA_BACKGROUND_COLOR"),
    values.get("NEXT_PUBLIC_PWA_BACKGROUND_COLOR"),
    "#f4f6f8",
)
for color_key, color_value in (
    ("PORTAL_THEME_COLOR", theme_color),
    ("PORTAL_PWA_BACKGROUND_COLOR", pwa_background_color),
):
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", color_value):
        raise SystemExit(f"{color_key} must be a six-digit hexadecimal color, e.g. #174566.")

# Cloudflare Full Setup Universal SSL covers only the apex and one subdomain
# level. The public and admin hosts must share a parent DNS zone for CKAN session
# sharing between sibling hosts.
public_labels = values["PUBLIC_HOST"].split(".")
admin_host = values["CKAN_HOST"].lower()
zone_apex = ".".join(public_labels[1:]) if len(public_labels) > 1 else values["PUBLIC_HOST"].lower()
if not admin_host.endswith("." + zone_apex):
    raise SystemExit(
        "CKAN_HOST and PUBLIC_HOST must share the same parent DNS zone so the CKAN session can "
        "authenticate private dataset links on the public host. Use sibling hosts such as "
        "ckan.silirdev.com and data.silirdev.com."
    )
admin_prefix = admin_host[: -(len(zone_apex) + 1)] if admin_host.endswith("." + zone_apex) else ""

cookie_name = values.get("CKAN_SESSION_COOKIE_NAME", "portal_ckan_session").strip() or "portal_ckan_session"
if cookie_name == "ckan":
    cookie_name = "portal_ckan_session"
if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", cookie_name):
    raise SystemExit("CKAN_SESSION_COOKIE_NAME must contain 1-64 letters, numbers, underscores or hyphens.")
if admin_prefix and len(admin_prefix.split(".")) > 1:
    print(
        "Warning: CKAN_HOST is a multi-level hostname and will be preserved. On Cloudflare Full DNS Setup, "
        "Universal SSL does not cover deeper subdomains, and Total TLS does not issue certificates for hostnames "
        "used with Cloudflare Tunnel. Prefer a first-level hostname, or manually order an Advanced Certificate, "
        "upload a custom certificate with the exact SAN, or use CNAME/Partial Setup Universal SSL coverage.",
        file=sys.stderr,
    )

media_owner_type = first_value(values.get("PORTAL_MEDIA_OWNER_TYPE"), "portal_media")
media_owner_id = first_value(values.get("PORTAL_MEDIA_OWNER_ID"), "public-editorial-media")
if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,63}", media_owner_type):
    raise SystemExit("PORTAL_MEDIA_OWNER_TYPE must be a valid CKAN owner type identifier.")
if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}", media_owner_id):
    raise SystemExit("PORTAL_MEDIA_OWNER_ID must contain 1-128 letters, numbers, underscores or hyphens.")

public_url = f"https://{values['PUBLIC_HOST']}"
admin_url = f"https://{values['CKAN_HOST']}"
derived = {
    **identity,
    "NEXT_PUBLIC_REGION_NAME": region_name,
    "NEXT_PUBLIC_REGION_SHORT_NAME": region_short_name,
    "NEXT_PUBLIC_APP_NAME": brand_name,
    "NEXT_PUBLIC_SHORT_NAME": short_name,
    "NEXT_PUBLIC_ORGANIZATION_NAME": organization_name,
    "NEXT_PUBLIC_SITE_DESCRIPTION": site_description,
    "NEXT_PUBLIC_PUBLIC_SUBTITLE": public_subtitle,
    "NEXT_PUBLIC_LOGO_PATH": logo_path,
    "NEXT_PUBLIC_LOGO_ALT": logo_alt,
    "NEXT_PUBLIC_HERO_IMAGE": hero_image,
    "NEXT_PUBLIC_HERO_MAP_IMAGE": hero_map_image,
    "NEXT_PUBLIC_WELCOME_MESSAGE": welcome_message,
    "NEXT_PUBLIC_REGENT_NAME": regent_name,
    "NEXT_PUBLIC_REGENT_PHOTO": regent_photo,
    "NEXT_PUBLIC_DEPUTY_REGENT_NAME": deputy_regent_name,
    "NEXT_PUBLIC_DEPUTY_REGENT_PHOTO": deputy_regent_photo,
    "NEXT_PUBLIC_ICON_PATH": icon_path,
    "NEXT_PUBLIC_PWA_ICON_192": pwa_icon_192,
    "NEXT_PUBLIC_PWA_ICON_512": pwa_icon_512,
    "NEXT_PUBLIC_BRAND_PROFILE": brand_profile,
    "NEXT_PUBLIC_THEME_COLOR": theme_color,
    "NEXT_PUBLIC_PWA_BACKGROUND_COLOR": pwa_background_color,
    "NEXT_PUBLIC_PPID_NAME": ppid_name,
    "NEXT_PUBLIC_PPID_URL": ppid_url,
    "NEXT_PUBLIC_PPID_CONTACT_URL": ppid_contact_url,
    "NEXT_PUBLIC_PPID_ADDRESS": ppid_address,
    "NEXT_PUBLIC_PPID_EMAIL": ppid_email,
    "NEXT_PUBLIC_PPID_PHONE": ppid_phone,
    "CKAN__SITE_TITLE": brand_name,
    "CKAN__SITE_DESCRIPTION": site_description,
    "CKAN__SITE_LOGO": logo_path,
    "PORTAL_PPID_NAME": ppid_name,
    "PORTAL_PPID_URL": ppid_url,
    "PORTAL_PPID_CONTACT_URL": ppid_contact_url,
    "PORTAL_PPID_ADDRESS": ppid_address,
    "PORTAL_PPID_EMAIL": ppid_email,
    "PORTAL_PPID_PHONE": ppid_phone,
    "PORTAL_THEME_COLOR": theme_color,
    "PORTAL_PWA_BACKGROUND_COLOR": pwa_background_color,
    "CKANEXT__PORTAL_THEME__MEDIA_OWNER_TYPE": media_owner_type,
    "CKANEXT__PORTAL_THEME__MEDIA_OWNER_ID": media_owner_id,
    "NEXT_PUBLIC_LEGACY_DATASET_VIEW_COOKIE_NAME": first_value(values.get("PORTAL_LEGACY_DATASET_VIEW_COOKIE_NAME")),
    "NEXT_PUBLIC_LEGACY_PWA_STORAGE_PREFIX": first_value(values.get("PORTAL_LEGACY_PWA_STORAGE_PREFIX")),
    "NEXT_PUBLIC_SITE_URL": public_url,
    "NEXT_PUBLIC_CKAN_ADMIN_URL": admin_url,
    "PUBLIC_SITE_ORIGIN": public_url,
    "CKAN_ADMIN_URL": admin_url,
    "CKAN_SITE_URL": public_url,
    "CKANEXT__PORTAL_THEME__ADMIN_HOST": values["CKAN_HOST"].lower(),
    "CKAN_SESSION_COOKIE_NAME": cookie_name,
    "CKAN___SESSION_COOKIE_NAME": cookie_name,
    "CKAN___SESSION_COOKIE_DOMAIN": "." + zone_apex.lower(),
    "CKAN___SESSION_COOKIE_HTTPONLY": "true",
    "CKAN___SESSION_COOKIE_SECURE": "true",
    "CKAN___SESSION_COOKIE_SAMESITE": "Lax",
}

written, output = set(), []
for line in lines:
    match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=", line)
    key = match.group(1) if match else None
    # Remove the earlier, incorrectly double-underscore form. Those names map
    # to ckan.session_cookie_* (not Flask SESSION_COOKIE_*), invalid in CKAN.
    if key and re.fullmatch(r"CKAN__SESSION_COOKIE_(?:NAME|DOMAIN|HTTPONLY|SECURE|SAMESITE)", key):
        continue
    if key in derived:
        output.append(f"{key}={derived[key]}")
        written.add(key)
    else:
        output.append(line)
for key, value in derived.items():
    if key not in written:
        output.append(f"{key}={value}")
path.write_text("\n".join(output) + "\n")
path.chmod(0o600)
print(f"Synchronized portal identity and public/admin URLs from {path}.")

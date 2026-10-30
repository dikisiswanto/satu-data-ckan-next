#!/usr/bin/env python3
"""Synchronize derived URLs from the only editable deployment env file."""
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

# Cloudflare Full Setup Universal SSL covers only the apex and one subdomain level.
# Deep names remain configurable, but Cloudflare Tunnel needs a certificate that explicitly covers the full hostname.
public_labels = values["PUBLIC_HOST"].split(".")
admin_host = values["CKAN_HOST"].lower()
# PUBLIC_HOST is expected to be a first-level host (data.example.com); its
# suffix identifies the zone apex (example.com) without guessing public suffixes.
zone_apex = ".".join(public_labels[1:]) if len(public_labels) > 1 else values["PUBLIC_HOST"].lower()
admin_prefix = admin_host[: -(len(zone_apex) + 1)] if admin_host.endswith("." + zone_apex) else ""
if admin_prefix and len(admin_prefix.split(".")) > 1:
    print(
        "Warning: CKAN_HOST is a multi-level hostname and will be preserved. On Cloudflare Full DNS Setup, "
        "Universal SSL does not cover deeper subdomains, and Total TLS does not issue certificates for hostnames "
        "used with Cloudflare Tunnel. Prefer a first-level hostname, or manually order an Advanced Certificate, "
        "upload a custom certificate with the exact SAN, or use CNAME/Partial Setup Universal SSL coverage.",
        file=sys.stderr,
    )

public_url = f"https://{values['PUBLIC_HOST']}"
admin_url = f"https://{values['CKAN_HOST']}"
derived = {
    "NEXT_PUBLIC_SITE_URL": public_url,
    "NEXT_PUBLIC_CKAN_ADMIN_URL": admin_url,
    "PUBLIC_SITE_ORIGIN": public_url,
    "CKAN_ADMIN_URL": admin_url,
    "CKAN_SITE_URL": public_url,
}
written, output = set(), []
for line in lines:
    match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=", line)
    key = match.group(1) if match else None
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
print(f"Synchronized public/admin URLs from PUBLIC_HOST and CKAN_HOST in {path}.")

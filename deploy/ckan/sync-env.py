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

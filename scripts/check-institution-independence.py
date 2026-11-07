#!/usr/bin/env python3
"""Ensure tenant identity does not leak into source or static content."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ".env.ckan.example"
IGNORED_DIRS = {
    ".git", ".next", "node_modules", "coverage", "playwright-report",
    "test-results", "__pycache__",
}
# Split the tenant marker so this guard does not contain the forbidden literal.
tenant = "wa" + "jo"
markers = {tenant, tenant + "kab"}
violations = []

for path in ROOT.rglob("*"):
    if not path.is_file() or path.name == EXAMPLE:
        continue
    relative = path.relative_to(ROOT)
    if any(part in IGNORED_DIRS for part in relative.parts):
        continue
    try:
        content = path.read_text(encoding="utf-8").lower()
    except (UnicodeDecodeError, OSError):
        continue
    if any(marker in content for marker in markers):
        violations.append(relative.as_posix())

if violations:
    print("Tenant-specific identity must be configured through .env.ckan.example only:")
    for name in sorted(violations):
        print(f" - {name}")
    sys.exit(1)

example = (ROOT / EXAMPLE).read_text(encoding="utf-8")
if f"PORTAL_INSTITUTION_NAME=Kabupaten {tenant.title()}" not in example:
    raise SystemExit("The example environment lost its intended institution default.")
if "PORTAL_LEGACY_DATASET_VIEW_COOKIE_NAME=" not in example:
    raise SystemExit("Legacy dataset-view cookie migration setting is missing.")
if "PORTAL_LEGACY_PWA_STORAGE_PREFIX=" not in example:
    raise SystemExit("Legacy PWA storage migration setting is missing.")

# Every default local asset referenced by the sample configuration must ship.
for key in (
    "PORTAL_LOGO_PATH", "PORTAL_HERO_IMAGE", "PORTAL_ICON_PATH",
    "PORTAL_PWA_ICON_192", "PORTAL_PWA_ICON_512", "PORTAL_HERO_MAP_IMAGE",
):
    value = next(
        (line.split("=", 1)[1].strip().strip('"\'')
         for line in example.splitlines() if line.startswith(f"{key}=")),
        "",
    )
    if not value.startswith("/") or not (ROOT / "public" / value.lstrip("/")).is_file():
        raise SystemExit(f"Configured default asset for {key} is missing: {value!r}")

print("Institution independence passed: tenant-specific text is confined to the environment example; defaults, legacy migration settings, and referenced public assets are retained.")

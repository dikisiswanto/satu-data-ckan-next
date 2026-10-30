#!/usr/bin/env python3
"""Keep npm scripts and GitHub Actions on one consistent validation contract."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

try:
    package = json.loads((ROOT / "package.json").read_text())
    lock = json.loads((ROOT / "package-lock.json").read_text())
except (OSError, json.JSONDecodeError) as exc:
    raise SystemExit(f"Cannot read package metadata: {exc}")

scripts = package.get("scripts", {})
expected_check = "npm run check:static && npm run lint"
expected_static = "bash scripts/check-static.sh"
if scripts.get("check") != expected_check:
    errors.append(f"package.json scripts.check must be: {expected_check}")
if scripts.get("check:static") != expected_static:
    errors.append(f"package.json scripts.check:static must be: {expected_static}")

root_lock = lock.get("packages", {}).get("", {})
for field in ("name", "version"):
    if root_lock.get(field) != package.get(field):
        errors.append(f"package-lock root {field} must match package.json")

workflow_dir = ROOT / ".github/workflows"
workflows = sorted(workflow_dir.glob("*.yml")) + sorted(workflow_dir.glob("*.yaml"))
if not workflows:
    errors.append("No GitHub Actions workflow found")
for path in workflows:
    content = path.read_text()
    if "npm run check:static" in content:
        errors.append(f"{path.relative_to(ROOT)} must call `bash scripts/check-static.sh`, not a package alias")
    if "compose.sh" in content and re.search(r"compose\.sh[^\n]*(?:executable|chmod \\+x)", content, re.I):
        errors.append(f"{path.relative_to(ROOT)} must not require compose.sh executable mode")
    for legacy in (
        "check-env-single-source.py",
        "check-ckan-base-source.py",
        "check-ckan-admin-theme.py",
        "check-ckan-build-overlay.py",
        "check-ui-css.mjs",
        "check-public-navigation.mjs",
        "check-api-doc-consistency.mjs",
        "check-local-imports.mjs",
    ):
        if legacy in content:
            errors.append(f"{path.relative_to(ROOT)} references obsolete checker {legacy}")

ci = (workflow_dir / "ci.yml").read_text() if (workflow_dir / "ci.yml").is_file() else ""
if "npm run check" not in ci:
    errors.append("ci.yml must run `npm run check` in the public portal verification job")
if "bash scripts/check-static.sh" not in ci:
    errors.append("ci.yml must run the shared static checker directly in deployment-config")

if errors:
    print("\n".join(f"ERROR: {item}" for item in errors), file=sys.stderr)
    raise SystemExit(1)

print("CI contract passed: npm scripts, lockfile, and workflow commands are consistent.")

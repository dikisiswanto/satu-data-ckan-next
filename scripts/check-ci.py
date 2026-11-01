#!/usr/bin/env python3
"""Keep the required CI path small and extended validations explicit/manual."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github/workflows"
CI_PATH = WORKFLOWS / "ci.yml"
EXTENDED_PATH = WORKFLOWS / "extended-validation.yml"
errors: list[str] = []

try:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as exc:
    raise SystemExit(f"Cannot read package metadata: {exc}")

scripts = package.get("scripts", {})
dev_dependencies = package.get("devDependencies", {})
lint_staged = package.get("lint-staged", {})
if "**/*.{js,jsx,mjs,cjs}" not in lint_staged:
    errors.append("lint-staged must include nested CKAN theme JavaScript files in the shared JS/JSX/MJS/CJS rule")
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
if not dev_dependencies.get("eslint"):
    errors.append("ESLint must be declared in devDependencies so npm ci installs the linter used by npm run check")
if "node_modules/eslint" not in lock.get("packages", {}):
    errors.append("package-lock.json must include node_modules/eslint for reproducible CI linting")

workflows = sorted(WORKFLOWS.glob("*.yml")) + sorted(WORKFLOWS.glob("*.yaml"))
if not workflows:
    errors.append("No GitHub Actions workflow found")
for checker in sorted((ROOT / "scripts").glob("*.mjs")):
    if re.search(r"\bconsole\.(?:log|info|debug|trace)\s*\(", checker.read_text(encoding="utf-8")):
        errors.append(f"{checker.relative_to(ROOT)} must use process.stdout.write instead of console.log/info/debug/trace to keep ESLint clean")

for path in workflows:
    content = path.read_text(encoding="utf-8")
    if "npm run check:static" in content:
        errors.append(f"{path.relative_to(ROOT)} must call `npm run check`, not duplicate the static-check package alias")
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

ci = CI_PATH.read_text(encoding="utf-8") if CI_PATH.is_file() else ""
extended = EXTENDED_PATH.read_text(encoding="utf-8") if EXTENDED_PATH.is_file() else ""
if "npm run check" not in ci:
    errors.append("ci.yml must run `npm run check` in the required verification job")
if ci.count("npm run check") != 1:
    errors.append("ci.yml must run the static checks and ESLint exactly once")
install_position = ci.find("npm ci")
check_position = ci.find("npm run check")
if install_position < 0 or check_position < 0 or install_position > check_position:
    errors.append("ci.yml must run `npm ci` before `npm run check`")
for required_command in ("npm run test", "npm run build"):
    if required_command not in ci:
        errors.append(f"ci.yml must include {required_command}")
for removed_job in ("deployment-config:", "ckan-extension-image-smoke:", "npm run test:e2e", "npm run security:check"):
    if removed_job in ci:
        errors.append(f"ci.yml should not include slow/duplicate optional validation: {removed_job}")
job_section = ci.split("jobs:", 1)[1] if "jobs:" in ci else ""
ci_jobs = re.findall(r"^  ([a-z0-9_-]+):\s*$", job_section, re.M)
if ci_jobs != ["verify"]:
    errors.append("ci.yml should contain one required job (`verify`) to avoid duplicate runners")

if "workflow_dispatch:" not in extended:
    errors.append("extended-validation.yml must be opt-in via workflow_dispatch")
for required in (
    "npm run test:e2e",
    "actions/upload-artifact@v4",
    "playwright-report/",
    "test-results/",
    "ckan-extension-image-smoke:",
    "docker build -f Dockerfile.ckan-extension-smoke",
    "npm run security:check",
):
    if required not in extended:
        errors.append(f"extended-validation.yml must preserve optional validation: {required}")
if "node-version-file: .nvmrc" not in ci or "actions/setup-node@v4" not in ci:
    errors.append("ci.yml must use the Node version pinned in .nvmrc")
if "actions/setup-python@v5" not in ci or "requirements-ci.txt" not in ci:
    errors.append("ci.yml must install pinned Python dependencies required by Jinja/CSS semantic checkers")
pip_install_position = ci.find("pip install")
check_position = ci.find("npm run check")
if pip_install_position < 0 or check_position < 0 or pip_install_position > check_position:
    errors.append("ci.yml must install requirements-ci.txt before npm run check")
requirements_path = ROOT / "requirements-ci.txt"
if not requirements_path.is_file():
    errors.append("requirements-ci.txt must pin Python static-check dependencies")
else:
    requirements_text = requirements_path.read_text(encoding="utf-8")
    for dependency in ("Jinja2==", "tinycss2==", "webencodings=="):
        if dependency not in requirements_text:
            errors.append(f"requirements-ci.txt must pin {dependency[:-2]}")
static_runner = (ROOT / "scripts/check-static.sh").read_text(encoding="utf-8")
if "python3 scripts/check-theme-css.py" not in static_runner:
    errors.append("check-static.sh must run the semantic CKAN CSS AST checker")
if "python3 scripts/test-theme-css-formatting.py" not in static_runner:
    errors.append("check-static.sh must prove formatter-only CSS changes do not fail semantic checks")

if errors:
    print("\n".join(f"ERROR: {item}" for item in errors), file=sys.stderr)
    raise SystemExit(1)

print("CI contract passed: one required runner, locked Node/npm dependencies, single static+lint run, unit tests and production build; extended E2E/security/CKAN checks are manual.")

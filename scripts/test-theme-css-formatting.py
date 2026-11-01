#!/usr/bin/env python3
"""Regression tests: CSS formatting must not affect semantic theme validation."""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts/check-theme-css.py"
SOURCE_FILES = (
    Path("deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-theme.css"),
    Path("deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css"),
    Path("src/app/styles/public-pages-motion.css"),
)


def run_checker(root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(CHECKER), "--root", str(root)],
        text=True,
        capture_output=True,
        check=False,
        timeout=15,
    )


def copy_css_fixture(destination: Path) -> None:
    for relative in SOURCE_FILES:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / relative, target)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="wajo-css-format-test-") as temp:
        fixture = Path(temp)
        copy_css_fixture(fixture)

        # Simulate Format Write/Prettier changes that preserve CSS semantics:
        # leading zeroes, wrapped selector lists, and reordered declarations.
        base_path = fixture / SOURCE_FILES[0]
        base = base_path.read_text(encoding="utf-8")
        base = base.replace("--wajo-radius-control: .625rem;", "--wajo-radius-control:\n    0.625rem;")
        base = base.replace("--wajo-text-base: .9375rem;", "--wajo-text-base: 0.9375rem;")
        base_path.write_text(base, encoding="utf-8")

        design_path = fixture / SOURCE_FILES[1]
        design = design_path.read_text(encoding="utf-8")
        design = design.replace(
            '.wajo-admin-workspace :is(#field-tags, [name="tag_string"]),',
            '.wajo-admin-workspace\n  :is(\n    #field-tags,\n    [name="tag_string"]\n  ),',
        )
        design = design.replace(
            "display: block;\n  width: 100%;\n  min-width: 0;",
            "display: block;\n  min-width: 0;\n  width: 100%;",
            1,
        )
        design_path.write_text(design, encoding="utf-8")

        formatted = run_checker(fixture)
        if formatted.returncode != 0:
            print("FAIL: CSS checker rejected formatting-only changes.", file=sys.stderr)
            print(formatted.stdout, file=sys.stderr)
            print(formatted.stderr, file=sys.stderr)
            return 1

        # A real design regression must still fail: removing the shell-wide
        # primary button fill must never be masked by whitespace normalization.
        broken = design.replace(
            "background-color: #176b52 !important;",
            "background-color: transparent !important;",
            1,
        )
        design_path.write_text(broken, encoding="utf-8")
        regressed = run_checker(fixture)
        if regressed.returncode == 0 or "explicit filled background" not in regressed.stderr:
            print("FAIL: CSS checker did not detect a removed primary button fill.", file=sys.stderr)
            print(regressed.stdout, file=sys.stderr)
            print(regressed.stderr, file=sys.stderr)
            return 1

    print("CSS formatter regression tests passed: formatting-only changes pass and real design regressions fail.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

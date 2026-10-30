#!/usr/bin/env python3
"""Build and install pinned CKAN Pages source with missing wheel package data."""
from __future__ import annotations

import importlib
import importlib.util
from importlib.metadata import version as distribution_version
import io
import re
import subprocess
import sys
import tarfile
import tempfile
import tomllib
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

PAGES_REF = "28eba99ad85d3b9037f5aaddad1f083300c69041"
PAGES_URL = f"https://codeload.github.com/ckan/ckanext-pages/tar.gz/{PAGES_REF}"
REQUIRED_FILES = (
    "ckanext/pages/config_declaration.yaml",
    "ckanext/pages/migration/pages/alembic.ini",
    "ckanext/pages/migration/pages/script.py.mako",
)
PACKAGE_DATA = '''
"ckanext.pages" = [
    "config_declaration.yaml",
    "migration/pages/*",
    "migration/pages/versions/*",
]
'''
MANIFEST_LINES = (
    "include ckanext/pages/config_declaration.yaml",
    "recursive-include ckanext/pages/migration *",
)


def patch_package_metadata(source: Path) -> None:
    """Include runtime YAML and Alembic files omitted by upstream wheel metadata."""
    pyproject = source / "pyproject.toml"
    manifest = source / "MANIFEST.in"
    if not pyproject.is_file() or not manifest.is_file():
        raise SystemExit("Pinned ckanext-pages source is missing pyproject.toml or MANIFEST.in")

    text = pyproject.read_text(encoding="utf-8")
    table = re.search(
        r"(?ms)^\[tool\.setuptools\.package-data\]\s*$(.*?)(?=^\[|\Z)",
        text,
    )
    if not table:
        raise SystemExit("Cannot find [tool.setuptools.package-data] in ckanext-pages pyproject.toml")
    body = table.group(1)
    if '"ckanext.pages"' not in body and "'ckanext.pages'" not in body:
        text = text[: table.end()] + PACKAGE_DATA + text[table.end() :]

    parsed = tomllib.loads(text)
    package_data = parsed.get("tool", {}).get("setuptools", {}).get("package-data", {})
    pages_data = package_data.get("ckanext.pages", [])
    for expected in ("config_declaration.yaml", "migration/pages/*", "migration/pages/versions/*"):
        if expected not in pages_data:
            raise SystemExit(f"ckanext-pages package data patch did not include {expected}")
    pyproject.write_text(text, encoding="utf-8")

    manifest_text = manifest.read_text(encoding="utf-8")
    missing = [line for line in MANIFEST_LINES if line not in manifest_text.splitlines()]
    if missing:
        manifest_text = manifest_text.rstrip() + "\n" + "\n".join(missing) + "\n"
        manifest.write_text(manifest_text, encoding="utf-8")


def extract_source(archive_bytes: bytes, destination: Path) -> Path:
    """Safely extract one GitHub codeload archive into a temporary source folder."""
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
        members = archive.getmembers()
        top_levels = {
            PurePosixPath(member.name).parts[0]
            for member in members
            if PurePosixPath(member.name).parts
        }
        if len(top_levels) != 1:
            raise SystemExit("Unexpected ckanext-pages archive layout")
        root_name = next(iter(top_levels))
        for member in members:
            path = PurePosixPath(member.name)
            if path.is_absolute() or ".." in path.parts or member.issym() or member.islnk():
                raise SystemExit(f"Unsafe path in ckanext-pages archive: {member.name}")
        archive.extractall(destination, members=members, filter="data")
    source = destination / root_name
    if not source.is_dir():
        raise SystemExit("Could not locate extracted ckanext-pages source directory")
    return source


def verify_source_assets(source: Path) -> None:
    missing = [relative for relative in REQUIRED_FILES if not (source / relative).is_file()]
    versions = source / "ckanext/pages/migration/pages/versions"
    version_files = sorted(versions.glob("*.py")) if versions.is_dir() else []
    if missing or not version_files:
        details = missing + ([] if version_files else ["ckanext/pages/migration/pages/versions/*.py"])
        raise SystemExit("Pinned ckanext-pages source is incomplete: " + ", ".join(details))


def build_and_install(source: Path, work: Path) -> None:
    wheel_dir = work / "wheelhouse"
    wheel_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            "--no-cache-dir",
            "--no-deps",
            "--no-build-isolation",
            "--wheel-dir",
            str(wheel_dir),
            str(source),
        ],
        check=True,
    )
    wheels = sorted(wheel_dir.glob("ckanext_pages-*.whl"))
    if len(wheels) != 1:
        raise SystemExit(f"Expected one ckanext-pages wheel, found {len(wheels)}")

    with zipfile.ZipFile(wheels[0]) as wheel:
        names = set(wheel.namelist())
        missing = [name for name in REQUIRED_FILES if name not in names]
        has_revisions = any(
            name.startswith("ckanext/pages/migration/pages/versions/") and name.endswith(".py")
            for name in names
        )
        if missing or not has_revisions:
            if not has_revisions:
                missing.append("ckanext/pages/migration/pages/versions/*.py")
            raise SystemExit("Built ckanext-pages wheel is missing runtime files: " + ", ".join(missing))

    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--no-cache-dir", "--no-deps", str(wheels[0])],
        check=True,
    )

    installed_version = distribution_version("ckanext-pages")
    if installed_version != "0.5.2":
        raise SystemExit(f"Unexpected ckanext-pages version: {installed_version}; expected 0.5.2")

    spec = importlib.util.find_spec("ckanext.pages")
    if not spec or not spec.origin:
        raise SystemExit("Installed ckanext-pages module cannot be resolved")
    installed = Path(spec.origin).parent
    installed_missing = [name for name in REQUIRED_FILES if not (installed.parent.parent / name).is_file()]
    installed_versions = installed / "migration/pages/versions"
    if installed_missing or not list(installed_versions.glob("*.py")):
        raise SystemExit("Installed ckanext-pages package does not contain its config/Alembic files")

    # Import the actual plugin class. This exercises CKAN's blanket config
    # declaration loader and catches the exact FileNotFoundError from runtime.
    importlib.import_module("ckanext.pages.plugin")
    importlib.import_module("ckanext.wajo_theme.plugin")
    print(
        f"Installed ckanext-pages {installed_version} from pinned commit {PAGES_REF}; "
        "config declaration and Alembic assets verified."
    )


def main() -> None:
    request = urllib.request.Request(PAGES_URL, headers={"User-Agent": "satu-data-wajo-build/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        archive_bytes = response.read()
    if not archive_bytes:
        raise SystemExit("Downloaded ckanext-pages archive is empty")
    if len(archive_bytes) > 20 * 1024 * 1024:
        raise SystemExit("Downloaded ckanext-pages archive exceeds the 20 MB safety limit")
    with tempfile.TemporaryDirectory(prefix="ckanext-pages-build-") as tmp:
        work = Path(tmp)
        source = extract_source(archive_bytes, work / "source")
        verify_source_assets(source)
        patch_package_metadata(source)
        verify_source_assets(source)
        build_and_install(source, work)


if __name__ == "__main__":
    main()

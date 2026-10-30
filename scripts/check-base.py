#!/usr/bin/env python3
"""Guard that production CKAN is built from the official 2.12.1 base source."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def read(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        ERRORS.append(f"File wajib tidak ditemukan: {relative}")
        return ""
    return path.read_text()


sync_script = read("deploy/ckan/sync-ckan-base-source.sh")
prepare_script = read("deploy/ckan/prepare-ckan-base.sh")
bootstrap = read("deploy/ckan/bootstrap-upstream.sh")
compose = read("deploy/ckan/compose.sh")
root_readme = read("README.md")
deploy_readme = read("deploy/ckan/README.md")
ci_workflow = read(".github/workflows/ci.yml")
gitignore = read(".gitignore")

checks = [
    ("https://github.com/ckan/ckan-docker-base.git" in sync_script, "Source image wajib berasal dari repository resmi ckan/ckan-docker-base."),
    ('BASE_REF="${CKAN_BASE_REPO_REF:-main}"' in sync_script, "Source base harus mengikuti branch main repository resmi."),
    ("ckan-2.12/VERSION.txt" in sync_script and 'EXPECTED_CKAN_VERSION="2.12.1"' in sync_script, "Bootstrap harus memverifikasi VERSION.txt CKAN 2.12 == 2.12.1."),
    ("ckan-2.12/PYTHON_VERSION.txt" in sync_script, "Versi Python harus dibaca dari source Docker base upstream."),
    ("rev-parse HEAD" in sync_script and ".ckan-base-source.lock" in sync_script, "Commit source base harus direkam untuk build reproducible."),
    ("bash ./build.sh build 2.12 base" in prepare_script, "Image dasar harus dibangun melalui build.sh resmi upstream, bukan Dockerfile tiruan."),
    ('IMAGE="ckan/ckan-base:2.12.1"' in prepare_script, "Tag image yang dibangun harus ckan/ckan-base:2.12.1."),
    ('docker pull "$PYTHON_BASE_IMAGE"' in prepare_script and "python_base_image_id" in prepare_script, "Build harus menyegarkan dan merekam digest runtime Python upstream."),
    ('EXPECTED_CKAN_REF="ckan-2.12.1"' in prepare_script and "CKAN_BASE_FORCE_REBUILD" in prepare_script, "Build image wajib menggunakan ref rilis resmi CKAN 2.12.1 dan mendukung forced rebuild."),
    ('org.opencontainers.image.source' in prepare_script and 'https://github.com/ckan/ckan-docker-base' in prepare_script, "Image wajib diverifikasi berasal dari repository resmi."),
    ('"$ROOT/deploy/ckan/sync-ckan-base-source.sh"' in bootstrap, "Bootstrap harus mengambil dan memvalidasi source base resmi."),
    ('"$ROOT/deploy/ckan/prepare-ckan-base.sh"' in compose and '[[ "${1:-}" == "up" ]]' in compose, "Compose up harus membangun/verifikasi base image sebelum build service CKAN."),
    ('https://github.com/ckan/ckan-docker.git' in bootstrap, "Compose orchestration tetap menggunakan repository resmi ckan/ckan-docker."),
    ("prepare-ckan-base.sh" in ci_workflow and "sync-ckan-base-source.sh" in ci_workflow and "docker pull ckan/ckan-base:2.12.1" not in ci_workflow and "docker build --pull -f Dockerfile.ckan-extension-smoke" not in ci_workflow, "CI harus build base image dari source upstream dan tidak mengasumsikan registry tag tersedia."),
    ("upstream-base" in gitignore and ".ckan-base-source.lock" in gitignore and ".ckan-base-image.lock" in gitignore, "Checkout dan lock build upstream harus diabaikan dari Git."),
    ("ckan/ckan-docker-base" in root_readme and "ckan/ckan-docker-base" in deploy_readme, "Dokumentasi deployment harus menyebut sumber image resmi."),
]
for passed, message in checks:
    if not passed:
        ERRORS.append(message)

for relative in ("deploy/ckan/sync-ckan-base-source.sh", "deploy/ckan/prepare-ckan-base.sh", "deploy/ckan/bootstrap-upstream.sh", "deploy/ckan/compose.sh"):
    result = subprocess.run(["bash", "-n", str(ROOT / relative)], capture_output=True, text=True)
    if result.returncode:
        ERRORS.append(f"Syntax Bash gagal pada {relative}: {result.stderr.strip()}")

if ERRORS:
    print("\n".join(f"ERROR: {error}" for error in ERRORS), file=sys.stderr)
    raise SystemExit(1)
print("CKAN base source contract passed: official ckan-docker-base main / CKAN 2.12.1 is synced, built, and verified by the deployment path before Compose up.")

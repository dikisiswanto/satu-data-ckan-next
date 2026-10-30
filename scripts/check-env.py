#!/usr/bin/env python3
"""Static guardrails: .env.ckan is the only deployment configuration source."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
errors: list[str] = []
env_example = root / ".env.ckan.example"
compose_files = [
    root / "deploy/ckan/docker-compose.override.yml",
    root / "deploy/ckan/docker-compose.cloudflare.yml",
    root / "deploy/ckan/docker-compose.manual.yml",
    root / "deploy/ckan/docker-compose.cloudflare-basic-auth.yml",
    root / "deploy/ckan/docker-compose.manual-basic-auth.yml",
]
bootstrap = (root / "deploy/ckan/bootstrap-upstream.sh").read_text()
wrapper = root / "deploy/ckan/compose.sh"
apply_script = (root / "deploy/ckan/apply-datastore-permissions.sh").read_text()
dockerfile = (root / "Dockerfile").read_text()

if not env_example.is_file():
    errors.append(".env.ckan.example tidak ditemukan")
else:
    env_text = env_example.read_text()
    keys = set(re.findall(r"^([A-Za-z_][A-Za-z0-9_]*)=", env_text, re.M))
    duplicates = [key for key in keys if len(re.findall(rf"^{re.escape(key)}=", env_text, re.M)) > 1]
    if duplicates:
        errors.append("Variabel duplikat di .env.ckan.example: " + ", ".join(sorted(duplicates)))
    example_public_host = re.search(r"^PUBLIC_HOST=(.+)$", env_text, re.M)
    example_ckan_host = re.search(r"^CKAN_HOST=(.+)$", env_text, re.M)
    if example_public_host and example_ckan_host:
        public_labels = example_public_host.group(1).strip().split(".")
        apex = ".".join(public_labels[1:])
        admin_host = example_ckan_host.group(1).strip().lower()
        prefix = admin_host[: -(len(apex) + 1)] if admin_host.endswith("." + apex) else ""
        if prefix and len(prefix.split(".")) > 1:
            if "sertifikat" not in env_text.lower() and "ssl" not in env_text.lower():
                errors.append("Hostname admin bertingkat harus disertai catatan cakupan sertifikat Cloudflare")

    # These are supplied by bootstrap only after upstream defaults are merged.
    generated = {
        "CKAN_VERSION", "SOLR_IMAGE_VERSION", "CKAN_SITE_URL", "CKAN_SQLALCHEMY_URL",
        "CKAN_DATASTORE_WRITE_URL", "CKAN_DATASTORE_READ_URL", "POSTGRES_USER", "POSTGRES_DB",
        "CKAN_DB_USER", "CKAN_DB", "DATASTORE_READONLY_USER", "DATASTORE_DB", "NGINX_SSLPORT_HOST",
        "POSTGRES_PASSWORD", "CKAN_DB_PASSWORD", "DATASTORE_READONLY_PASSWORD", "CKAN_SYSADMIN_PASSWORD",
        "CKAN___SECRET_KEY", "CKAN___BEAKER__SESSION__SECRET", "CKAN___API_TOKEN__JWT__ENCODE__SECRET",
        "CKAN___API_TOKEN__JWT__DECODE__SECRET", "CKAN__PLUGINS", "CKAN___SCHEMING__DATASET_SCHEMAS", "CKAN___SCHEMING__ORGANIZATION_SCHEMAS", "CKAN___SCHEMING__GROUP_SCHEMAS", "CKAN___SCHEMING__PRESETS", "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_URL",
        "CKANEXT__PAGES__REVISIONS_LIMIT", "CKANEXT__PAGES__REVISIONS_FORCE_LIMIT", "CKANEXT__PAGES__ALLOW_HTML",
        "CKAN__DATASTORE__SQLSEARCH__ENABLED", "CKAN__HARVEST__MQ__TYPE", "CKAN__HARVEST__MQ__HOSTNAME",
        "CKAN__HARVEST__MQ__PORT", "CKAN__HARVEST__MQ__REDIS_DB", "CKAN__HARVEST__LOG_SCOPE",
        "CKAN__HARVEST__TIMEOUT", "CKAN__VIEWS__DEFAULT_VIEWS",
    }
    for file in compose_files:
        text = file.read_text()
        for key in re.findall(r"\$\{([A-Za-z_][A-Za-z0-9_]*)", text):
            if key not in keys and key not in generated:
                errors.append(f"{file.relative_to(root)} merujuk {key}, tetapi tidak didefinisikan di .env.ckan.example atau bootstrap")
        if re.search(r"\$\{[A-Za-z_][A-Za-z0-9_]*:-", text):
            errors.append(f"{file.relative_to(root)} menggandakan nilai default; letakkan nilai konfigurasi di .env.ckan.example")

if not wrapper.is_file():
    errors.append("deploy/ckan/compose.sh tidak ditemukan")
else:
    # Deployment instructions invoke scripts with `bash`, so a ZIP extracted on
    # Windows or a filesystem without Unix mode bits must still pass this guard.
    syntax = subprocess.run(["bash", "-n", str(wrapper)], capture_output=True, text=True)
    if syntax.returncode:
        errors.append("deploy/ckan/compose.sh memiliki sintaks Bash tidak valid: " + syntax.stderr.strip())
    with tempfile.TemporaryDirectory(prefix="portal-shell-check-") as tmp:
        copied = Path(tmp) / "compose.sh"
        copied.write_bytes(wrapper.read_bytes())
        copied.chmod(0o644)
        help_result = subprocess.run(["bash", str(copied), "--help"], capture_output=True, text=True)
        if help_result.returncode != 0 or "Gunakan satu file konfigurasi" not in help_result.stdout:
            errors.append("compose.sh harus dapat dijalankan melalui Bash tanpa executable bit")
syncer = root / "deploy/ckan/sync-env.py"
if not syncer.is_file() or "PUBLIC_HOST" not in syncer.read_text() or "CKAN_SITE_URL" not in syncer.read_text():
    errors.append("sync-env.py harus menurunkan URL publik/admin dari hostname di .env.ckan")
else:
    sync_text = syncer.read_text()
    if "will be preserved" not in sync_text or "Total TLS does not issue certificates" not in sync_text or "first-level hostname" not in sync_text:
        errors.append("sync-env.py harus memberi peringatan TLS yang akurat untuk host bertingkat pada Cloudflare Tunnel dan merekomendasikan host satu tingkat")
if "CKAN_HOST=ckan.wajokab.go.id" not in env_example.read_text():
    errors.append("Contoh konfigurasi harus memakai hostname admin satu tingkat agar tercakup Universal SSL standar")
if "sync-env.py" not in wrapper.read_text() or "sync-env.py" not in bootstrap:
    errors.append("Bootstrap dan wrapper Compose harus menyinkronkan URL turunan dari hostname")
if env_example.is_file():
    admin_keys = set(re.findall(r"^([A-Za-z_][A-Za-z0-9_]*)=", env_example.read_text(), re.M))
    for key in ("CKAN_SYSADMIN_NAME", "CKAN_SYSADMIN_PASSWORD", "CKAN_SYSADMIN_EMAIL"):
        if key not in admin_keys:
            errors.append(f".env.ckan.example harus mendefinisikan {key} secara eksplisit")
if '"CKAN_SYSADMIN_PASSWORD"' not in bootstrap or "secrets.token_hex(32)" not in bootstrap or '"generate_on_bootstrap"' not in bootstrap:
    errors.append("Bootstrap harus mengganti GENERATE_ON_BOOTSTRAP dengan secret acak sebelum CKAN pertama kali dijalankan")
if env_example.is_file() and "CKAN_SYSADMIN_PASSWORD=GENERATE_ON_BOOTSTRAP" not in env_example.read_text():
    errors.append("Password sysadmin awal harus menggunakan placeholder yang diganti oleh bootstrap")
else:
    with tempfile.TemporaryDirectory(prefix="portal-env-sync-check-") as tmp:
        test_env = Path(tmp) / ".env.ckan"
        test_env.write_text("PUBLIC_HOST=portal.example.test\nCKAN_HOST=admin.example.test\nNEXT_PUBLIC_SITE_URL=https://old.example.test\nCKAN_SITE_URL=https://old.example.test\n")
        result = subprocess.run([sys.executable, str(syncer), str(test_env)], capture_output=True, text=True)
        synced = test_env.read_text()
        expected_urls = (
            "NEXT_PUBLIC_SITE_URL=https://portal.example.test",
            "NEXT_PUBLIC_CKAN_ADMIN_URL=https://admin.example.test",
            "PUBLIC_SITE_ORIGIN=https://portal.example.test",
            "CKAN_ADMIN_URL=https://admin.example.test",
            "CKAN_SITE_URL=https://portal.example.test",
            "CKANEXT__WAJO_THEME__ADMIN_HOST=admin.example.test",
        )
        if result.returncode != 0 or any(value not in synced for value in expected_urls):
            errors.append("sync-env.py tidak memisahkan URL publik dan URL admin setelah hostname diubah")

        staging_env = Path(tmp) / ".env.silirdev.ckan"
        staging_env.write_text("PUBLIC_HOST=data.silirdev.com\nCKAN_HOST=ckan.silirdev.com\n")
        staging_result = subprocess.run([sys.executable, str(syncer), str(staging_env)], capture_output=True, text=True)
        staging_synced = staging_env.read_text()
        if staging_result.returncode != 0 or "NEXT_PUBLIC_CKAN_ADMIN_URL=https://ckan.silirdev.com" not in staging_synced or "CKAN_ADMIN_URL=https://ckan.silirdev.com" not in staging_synced or "NEXT_PUBLIC_SITE_URL=https://data.silirdev.com" not in staging_synced:
            errors.append("Perubahan CKAN_HOST ke ckan.silirdev.com harus otomatis menyelaraskan seluruh tautan admin tanpa mengubah origin portal publik")

        deep_env = Path(tmp) / ".env.deep-host.ckan"
        deep_env.write_text("PUBLIC_HOST=data.silirdev.com\nCKAN_HOST=ckan.data.silirdev.com\n")
        deep_result = subprocess.run([sys.executable, str(syncer), str(deep_env)], capture_output=True, text=True)
        if deep_result.returncode != 0 or "multi-level hostname" not in deep_result.stderr or "Universal SSL" not in deep_result.stderr or "Cloudflare Tunnel" not in deep_result.stderr or "Total TLS does not issue" not in deep_result.stderr:
            errors.append("sync-env.py harus memberi peringatan TLS yang akurat untuk hostname bertingkat pada Cloudflare Tunnel")
if 'render-upstream-env.py' not in bootstrap or 'rm -f "$UPSTREAM/.env"' not in bootstrap:
    errors.append("Bootstrap harus menghasilkan env CKAN terfilter dari .env.ckan dan menghapus .env upstream independen")
if 'env_file_count == 0' not in bootstrap or '.env.generated' not in bootstrap:
    errors.append("Bootstrap harus mengganti service env_file upstream menjadi .env.generated")
if 'render-upstream-env.py' not in wrapper.read_text() or '[[ ! -e "$UPSTREAM/.env" ]]' not in wrapper.read_text():
    errors.append("compose.sh harus merender env terfilter dan menolak sumber .env upstream kedua")
renderer = root / "deploy/ckan/render-upstream-env.py"
if not renderer.is_file():
    errors.append("Renderer environment terfilter tidak ditemukan")
else:
    render_text = renderer.read_text()
    for token in ("CLOUDFLARE_", "CKAN_ADMIN_BASIC_AUTH_", "NEXT_PUBLIC_", "CKANEXT__XLOADER__", "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_"):
        if token not in render_text:
            errors.append(f"Renderer tidak mengecualikan variabel edge sensitif {token}")
    for token in ("module:file configuration", "ckanext.wajo_theme:schemas/dataset.yaml", "ckanext.scheming:presets.json"):
        if token not in render_text:
            errors.append(f"Renderer tidak memvalidasi kontrak Scheming: {token}")
    else:
        with tempfile.TemporaryDirectory(prefix="portal-env-source-check-") as tmp:
            tmp_path = Path(tmp)
            source = tmp_path / ".env.ckan"
            output = tmp_path / ".env.generated"
            source.write_text(
                "CKAN__PLUGINS=\"envvars datastore\"\n"
                "CKAN__UPLOADS_ENABLED=true\n"
                "CKAN__FILES__STORAGE__DEFAULT__TYPE=ckan:fs\n"
                "CKAN__FILES__STORAGE__DEFAULT__PATH=/var/lib/ckan/default\n"
                "CKAN__FILES__STORAGE__DEFAULT__INITIALIZE=true\n"
                "CKAN__MAX_IMAGE_SIZE=5\n"
                "CKAN__UPLOAD__GROUP__TYPES=image\n"
                "CKAN__UPLOAD__GROUP__MIMETYPES=\"image/png image/jpeg image/gif image/webp\"\n"
                "CKAN___SCHEMING__DATASET_SCHEMAS=ckanext.wajo_theme:schemas/dataset.yaml\n"
                "CKAN___SCHEMING__ORGANIZATION_SCHEMAS=ckanext.wajo_theme:schemas/organization.yaml\n"
                "CKAN___SCHEMING__GROUP_SCHEMAS=ckanext.wajo_theme:schemas/group.yaml\n"
                "CKAN___SCHEMING__PRESETS=ckanext.scheming:presets.json\n"
                "CKAN_SQLALCHEMY_URL=postgresql://ckan:secret@db/ckan\n"
                "CLOUDFLARE_TUNNEL_TOKEN=secret-tunnel-token\n"
                "CKAN_ADMIN_BASIC_AUTH_PASSWORD=secret-admin-password\n"
                "CKAN_ADMIN_BASIC_AUTH_HASH='$2a$12$secret-hash'\n"
                "NEXT_PUBLIC_SITE_URL=https://data.example.test\n"
                "PUBLIC_SITE_ORIGIN=https://data.example.test\n"
                "CKANEXT__XLOADER__API_TOKEN=sensitive-xloader-token\n"
                "CKANEXT__XLOADER__JOBS_DB__URI=postgresql://ckan:secret@db/ckan\n"
                "CKANEXT__WAJO_THEME__ADMIN_HOST=admin.example.test\n"
                "CKAN_REVALIDATE_SECRET=sensitive-revalidate-secret\n"
                "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_URL=http://nextjs:3000/api/internal/ckan/revalidate\n"
            )
            result = subprocess.run([sys.executable, str(renderer), str(source), str(output)], capture_output=True, text=True)
            if result.returncode != 0:
                errors.append("Renderer env CKAN gagal pada smoke test: " + result.stderr.strip())
            else:
                generated = output.read_text()
                for secret in ("CLOUDFLARE_TUNNEL_TOKEN", "CKAN_ADMIN_BASIC_AUTH_PASSWORD", "CKAN_ADMIN_BASIC_AUTH_HASH", "NEXT_PUBLIC_SITE_URL", "PUBLIC_SITE_ORIGIN", "CKANEXT__XLOADER__API_TOKEN", "CKANEXT__XLOADER__JOBS_DB__URI", "CKAN_REVALIDATE_SECRET", "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_URL"):
                    if re.search(rf"^{secret}=", generated, re.M):
                        errors.append(f"Renderer env membocorkan variabel edge {secret} ke service CKAN")
                if "CKAN_SQLALCHEMY_URL=" not in generated or "CKANEXT__WAJO_THEME__ADMIN_HOST=admin.example.test" not in generated or output.stat().st_mode & 0o777 != 0o600:
                    errors.append("Renderer env harus mempertahankan konfigurasi CKAN/admin host dan menulis output dengan permission 600")
                for upload_setting in (
                    "CKAN__UPLOADS_ENABLED=true",
                    "CKAN__FILES__STORAGE__DEFAULT__TYPE=ckan:fs",
                    "CKAN__FILES__STORAGE__DEFAULT__PATH=/var/lib/ckan/default",
                    "CKAN__FILES__STORAGE__DEFAULT__INITIALIZE=true",
                    "CKAN__MAX_IMAGE_SIZE=5",
                    "CKAN__UPLOAD__GROUP__TYPES=image",
                    'CKAN__UPLOAD__GROUP__MIMETYPES=\"image/png image/jpeg image/gif image/webp\"',
                ):
                    if upload_setting not in generated:
                        errors.append("Renderer harus meneruskan konfigurasi FileStore upload ke CKAN: " + upload_setting)
                for required_schema in (
                    "CKAN___SCHEMING__DATASET_SCHEMAS=ckanext.wajo_theme:schemas/dataset.yaml",
                    "CKAN___SCHEMING__ORGANIZATION_SCHEMAS=ckanext.wajo_theme:schemas/organization.yaml",
                    "CKAN___SCHEMING__GROUP_SCHEMAS=ckanext.wajo_theme:schemas/group.yaml",
                    "CKAN___SCHEMING__PRESETS=ckanext.scheming:presets.json",
                ):
                    if required_schema not in generated:
                        errors.append("Renderer env harus mempertahankan referensi Scheming module:file: " + required_schema)

                invalid_source = tmp_path / ".env.invalid-scheming.ckan"
                invalid_output = tmp_path / ".env.invalid-scheming.generated"
                invalid_source.write_text(
                    "CKAN__PLUGINS=\"envvars scheming_datasets\"\n"
                    "CKAN___SCHEMING__DATASET_SCHEMAS=/srv/app/ckanext-schemas/dataset.yaml\n"
                    "CKAN___SCHEMING__PRESETS=ckanext.scheming:presets.json\n"
                )
                invalid_result = subprocess.run([sys.executable, str(renderer), str(invalid_source), str(invalid_output)], capture_output=True, text=True)
                if invalid_result.returncode == 0 or "module:file configuration" not in (invalid_result.stdout + invalid_result.stderr):
                    errors.append("Renderer harus menolak Scheming filesystem path sebelum CKAN dapat restart-loop")
if "--env-file \"$ENV_FILE\"" not in wrapper.read_text():
    errors.append("compose.sh harus memakai .env.ckan sebagai satu-satunya env file untuk interpolasi Compose")
if "--env-file \"$UPSTREAM/.env\"" in apply_script:
    errors.append("apply-datastore-permissions.sh tidak boleh menganggap upstream/.env sebagai sumber env kedua")
if re.search(r"^ARG\s+[A-Za-z_][A-Za-z0-9_]*=", dockerfile, re.M):
    errors.append("Dockerfile ARG tidak boleh mengatur nilai konfigurasi deployment; teruskan dari Compose/.env")
if "CKAN_ADMIN_URL=https://" in dockerfile:
    errors.append("Dockerfile tidak boleh meng-hardcode URL admin CKAN runtime")

# Every public build-time variable declared by Dockerfile must be passed from the
# canonical .env.ckan through Compose build.args (not merely runtime environment).
if env_example.is_file():
    docker_args = set(re.findall(r"^ARG\s+(NEXT_PUBLIC_[A-Za-z0-9_]+)\s*$", dockerfile, re.M))
    override_text = (root / "deploy/ckan/docker-compose.override.yml").read_text()
    build_section = override_text.split("  nextjs:", 1)[1].split("\n    restart:", 1)[0]
    build_args = set(re.findall(r"^\s{8}(NEXT_PUBLIC_[A-Za-z0-9_]+):\s*\$\{", build_section, re.M))
    build_arg_names = re.findall(r"^\s{8}(NEXT_PUBLIC_[A-Za-z0-9_]+):\s*\$\{", build_section, re.M)
    for key in sorted({name for name in build_arg_names if build_arg_names.count(name) > 1}):
        errors.append(f"Compose mendefinisikan build arg {key} lebih dari sekali")
    for key in sorted(docker_args - build_args):
        errors.append(f"Dockerfile build ARG {key} tidak diteruskan dari .env.ckan via Compose build.args")
    env_keys = set(re.findall(r"^([A-Za-z_][A-Za-z0-9_]*)=", env_example.read_text(), re.M))
    for key in sorted(build_args - env_keys):
        errors.append(f"Compose build arg {key} tidak didefinisikan di .env.ckan.example")

if errors:
    print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
    raise SystemExit(1)
print("Environment single-source check passed: .env.ckan is canonical, Compose inherits it, and Dockerfile has no deployment defaults.")

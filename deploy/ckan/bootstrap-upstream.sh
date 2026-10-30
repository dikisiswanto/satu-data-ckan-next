#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UPSTREAM="$ROOT/deploy/ckan/upstream"
ENV_FILE="$ROOT/.env.ckan"

if [[ ! -f "$ENV_FILE" ]]; then cp "$ROOT/.env.ckan.example" "$ENV_FILE"; fi
chmod 600 "$ENV_FILE"

# Hostnames are the editable source; derived URLs are synchronized from them.
python3 "$ROOT/deploy/ckan/sync-env.py" "$ENV_FILE"

# Optional perimeter gate. Default none sends the CKAN host root to the native login form.
# CKAN's authentication and role-based authorization remain active for protected actions.
python3 - "$ENV_FILE" <<'PYAUTH'
from pathlib import Path
import re, secrets, shutil, subprocess, sys
path = Path(sys.argv[1])
lines = path.read_text().splitlines()
values = {}
for line in lines:
    match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
    if match: values[match.group(1)] = match.group(2).strip().strip('"').strip("'")
mode = values.get("CKAN_ADMIN_GATE_MODE", "none").strip() or "none"
if mode not in {"none", "basic_auth", "cloudflare_access"}:
    raise SystemExit("CKAN_ADMIN_GATE_MODE harus none, basic_auth, atau cloudflare_access.")
if mode == "none":
    print("Mode none dipilih; host admin akan langsung menampilkan form login CKAN tanpa Basic Auth Caddy. CKAN tetap mengelola autentikasi dan role.")
elif mode == "cloudflare_access":
    print("Cloudflare Access mode dipilih; bootstrap tidak membuat Basic Auth Caddy. Konfigurasikan Access application + allow-list untuk CKAN_HOST sebelum menjalankan cloudflare-access.")
else:
    user = values.get("CKAN_ADMIN_BASIC_AUTH_USER", "ckan-admin").strip() or "ckan-admin"
    password = values.get("CKAN_ADMIN_BASIC_AUTH_PASSWORD", "").strip()
    hash_value = values.get("CKAN_ADMIN_BASIC_AUTH_HASH", "").strip()
    if not hash_value:
        docker = shutil.which("docker")
        if not docker:
            raise SystemExit("Docker dibutuhkan untuk membuat hash akses admin Caddy. Instal Docker, lalu ulangi bootstrap.")
        if not password:
            password = secrets.token_urlsafe(24)
        result = subprocess.run(
            [docker, "run", "--rm", "caddy:2.11.7-alpine", "caddy", "hash-password", "--plaintext", password],
            check=True, capture_output=True, text=True,
        )
        hash_value = result.stdout.strip()
        if not hash_value.startswith("$2"):
            raise SystemExit("Caddy gagal menghasilkan bcrypt hash untuk proteksi admin.")
        updates = {
            "CKAN_ADMIN_BASIC_AUTH_USER": user,
            "CKAN_ADMIN_BASIC_AUTH_PASSWORD": password,
            # Single quotes make Compose treat bcrypt's dollar signs literally.
            "CKAN_ADMIN_BASIC_AUTH_HASH": "'" + hash_value + "'",
        }
        written, out = set(), []
        for line in lines:
            match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=', line)
            key = match.group(1) if match else None
            if key in updates:
                out.append(f"{key}={updates[key]}")
                written.add(key)
            else:
                out.append(line)
        for key, value in updates.items():
            if key not in written: out.append(f"{key}={value}")
        path.write_text("\n".join(out) + "\n")
        path.chmod(0o600)
        print("Generated Caddy admin credentials in .env.ckan (file permissions 600). Read the password there when you first open CKAN Admin.")
    else:
        print("Using existing Caddy Basic Auth credentials from .env.ckan.")
PYAUTH

command -v git >/dev/null 2>&1 || { echo "git is required" >&2; exit 1; }
# CKAN runtime image source: official ckan/ckan-docker-base, branch main, CKAN 2.12.1.
bash "$ROOT/deploy/ckan/sync-ckan-base-source.sh"
if [[ ! -d "$UPSTREAM/.git" ]]; then
  mkdir -p "$(dirname "$UPSTREAM")"
  git clone --depth 1 https://github.com/ckan/ckan-docker.git "$UPSTREAM"
else
  echo "Using existing upstream checkout: $UPSTREAM"
fi

[[ -f "$UPSTREAM/docker-compose.yml" ]] || {
  echo "Official ckan/ckan-docker checkout must contain docker-compose.yml." >&2
  echo "ckan-docker-base contains image definitions, not the full deployment stack." >&2
  exit 2
}

# Keep one editable configuration source: merge upstream defaults into root .env.ckan.
# Existing physical upstream .env values are migrated only when a key is absent from
# .env.ckan. The official Compose env_file is patched to a filtered generated file,
# so edge secrets never get injected into CKAN/database/worker containers.
python3 - "$ROOT" "$UPSTREAM" "$ENV_FILE" <<'PYMERGE'
from pathlib import Path
import re, sys
root, upstream, env_file = map(Path, sys.argv[1:])
current = env_file.read_text().splitlines()
existing = {m.group(1) for line in current if (m := re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=', line))}
legacy_datapusher_keys = {"DATAPUSHER_VERSION", "DATAPUSHER_CONTAINER_NAME", "CKAN__DATAPUSHER__URL", "CKAN__DATAPUSHER__CALLBACK_URL_BASE"}
source_files = []
old_env = upstream / ".env"
if old_env.exists() and not old_env.is_symlink():
    source_files.append(old_env)
template = next((p for p in (upstream / ".env.example", upstream / ".env.template") if p.is_file()), None)
if template is None and not old_env.exists():
    raise SystemExit("Official upstream .env.example/.env.template was not found; refusing to guess CKAN defaults.")
if template:
    source_files.append(template)
additions = []
for source in source_files:
    for line in source.read_text().splitlines():
        match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
        if match and match.group(1) not in existing and match.group(1) not in legacy_datapusher_keys:
            additions.append(line)
            existing.add(match.group(1))
if additions:
    current.extend(["", "# CKAN upstream defaults (merged by bootstrap; edit this .env.ckan file only).", *additions])
env_file.write_text("\n".join(current) + "\n")
env_file.chmod(0o600)
print(f"Merged {len(additions)} missing upstream environment defaults into the single .env.ckan source.")
PYMERGE

# Align the official Compose checkout with the locally built official CKAN 2.12.1 base image.
# The image is built from ckan/ckan-docker-base by prepare-ckan-base.sh before `compose up`.
python3 - "$UPSTREAM" <<'PY'
from pathlib import Path
import re, sys
root = Path(sys.argv[1])
dockerfile = root / "ckan" / "Dockerfile"
if not dockerfile.exists():
    raise SystemExit(f"Expected upstream Dockerfile is missing: {dockerfile}")
text = dockerfile.read_text()
updated, count = re.subn(r'^(FROM\s+ckan/ckan-base:)[^\s]+(.*)$', r'\g<1>2.12.1\g<2>', text, flags=re.M)
if count == 0:
    if not re.search(r'^FROM\s+ckan/ckan-base:2\.12\.1(?:\s|$)', text, flags=re.M):
        raise SystemExit("Could not find a pinned ckan/ckan-base FROM line; inspect the upstream Dockerfile manually.")
else:
    dockerfile.write_text(updated)

compose = root / "docker-compose.yml"
compose_text = compose.read_text()
# Official upstream versions have used both scalar (`env_file: .env`) and
# sequence (`env_file:\n  - .env`) syntax. Rewrite both without changing service structure.
compose_text, scalar_env_count = re.subn(
    r"(^[ \t]*env_file:[ \t]*)\.env[ \t]*$",
    r"\1.env.generated", compose_text, flags=re.M,
)
compose_text, list_env_count = re.subn(
    r"(^[ \t]*env_file:[ \t]*\n[ \t]*-[ \t]*)\.env[ \t]*$",
    r"\1.env.generated", compose_text, flags=re.M,
)
env_file_count = scalar_env_count + list_env_count
has_generated_env_file = bool(re.search(
    r"^[ \t]*env_file:[ \t]*\.env\.generated[ \t]*$|^[ \t]*-[ \t]*\.env\.generated[ \t]*$",
    compose_text, flags=re.M,
))
if env_file_count == 0 and not has_generated_env_file:
    raise SystemExit("Could not find upstream env_file entries or an existing generated env file; refusing to leave an unreviewed service environment source.")
if re.search(r"^[ \t]*env_file:[ \t]*\.env[ \t]*$|^[ \t]*-[ \t]*\.env[ \t]*$", compose_text, flags=re.M):
    raise SystemExit("An upstream service still references the legacy .env file; refusing to keep a second configuration source.")
lines = compose_text.splitlines(keepends=True)
result = []
skip_ports = False
removed_ports = False
skip_datapusher_service = False
removed_datapusher_service = False
for line in lines:
    # DataPusher is deprecated; XLoader uses CKAN's Redis-backed jobs worker instead.
    if skip_datapusher_service:
        if not line.strip() or len(line) - len(line.lstrip()) > 2:
            continue
        skip_datapusher_service = False
    if re.match(r"^  datapusher:\s*$", line):
        skip_datapusher_service = True
        removed_datapusher_service = True
        continue
    # Remove service-level published ports from the complete upstream stack.
    # Public ingress is only through Caddy (manual mode) or Cloudflare Tunnel.
    if re.match(r'^    ports:\s*$', line):
        skip_ports = True
        removed_ports = True
        continue
    if skip_ports:
        if not line.strip() or len(line) - len(line.lstrip()) > 4:
            continue
        skip_ports = False
    # CKAN 2.11/Python 3.10 site-packages named volume must not mask CKAN 2.12's
    # Python 3.14 packages directory in the newer base image.
    if "site_packages:" in line and "/usr/lib/python" in line:
        continue
    # Avoid leaving an unused named volume behind after removing the old mount.
    if re.match(r"^  site_packages:\s*$", line):
        continue
    result.append(line)
if any(re.match(r'^    ports:\s*$', line) for line in result):
    raise SystemExit("Found an unhandled service-level ports block; refusing to leave a CKAN/backend port exposed.")
compose.write_text("".join(result))
print("Pinned Compose overlay to the locally built official ckan/ckan-base:2.12.1 image; removed incompatible site_packages mount.")
if removed_datapusher_service:
    print("Removed the deprecated DataPusher service; XLoader will use the CKAN jobs worker.")
elif re.search(r"^  datapusher:\s*$", compose_text, flags=re.M):
    raise SystemExit("DataPusher service still exists after patching; refusing a mixed loader stack.")
if removed_ports:
    print("Removed service-level host port publishing from the upstream stack; use the selected ingress profile only.")
else:
    print("No service-level host port blocks found (already private or upstream layout changed).")
PY

# Install pinned extension packages, the structured metadata schema and safe
# startup migrations into the official upstream CKAN Docker build context.
python3 "$ROOT/deploy/ckan/configure-upstream-extensions.py" "$ROOT" "$UPSTREAM"

# Unverified third-party/Python-version-sensitive viewers are intentionally not installed.

# Generate strong initial database/admin/secrets only for well-known weak placeholders.
python3 - "$ENV_FILE" "$(sed -n 's/^PUBLIC_SITE_ORIGIN=//p' "$ENV_FILE" | tail -n 1)" <<'PY'
from pathlib import Path
import secrets, re, sys
path = Path(sys.argv[1])
site_url = sys.argv[2].rstrip("/")
if not site_url.startswith("https://"):
    raise SystemExit("PUBLIC_SITE_ORIGIN must be an HTTPS URL for public deployment.")
# Remove stale DataPusher variables during migration so they cannot reappear
# from an earlier .env.ckan or an old upstream checkout.
legacy_datapusher_keys = {"DATAPUSHER_VERSION", "DATAPUSHER_CONTAINER_NAME", "CKAN__DATAPUSHER__URL", "CKAN__DATAPUSHER__CALLBACK_URL_BASE"}
lines = [line for line in path.read_text().splitlines() if not ((m := re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=', line)) and m.group(1) in legacy_datapusher_keys)]
values = {}
for line in lines:
    m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
    if m: values[m.group(1)] = m.group(2)
weak = {"", "pass", "password", "changeme", "change_me", "change-me", "replace_me", "secret", "secret_key", "token", "admin", "postgres", "ckan", "datastore", "ckan_default", "ckandbpassword", "test1234", "admin1234", "generate_on_bootstrap"}

def strong(key):
    value = values.get(key, "").strip().strip('"').strip("'")
    candidate = value.removeprefix("string:").lower()
    if candidate in weak or "example" in candidate or "changeme" in candidate:
        values[key] = secrets.token_hex(32)

for key in ("POSTGRES_PASSWORD", "CKAN_DB_PASSWORD", "DATASTORE_READONLY_PASSWORD", "CKAN_SYSADMIN_PASSWORD", "CKAN___SECRET_KEY", "CKAN___BEAKER__SESSION__SECRET"):
    strong(key)
for key in ("CKAN___API_TOKEN__JWT__ENCODE__SECRET", "CKAN___API_TOKEN__JWT__DECODE__SECRET"):
    strong(key)

# Keep every connection string synchronized with the generated CKAN database credentials.
values.update({
    "CKAN_VERSION": "2.12.1",
    "SOLR_IMAGE_VERSION": "2.12-solr9",
    "CKAN_SITE_URL": site_url,
    "POSTGRES_USER": values.get("POSTGRES_USER") or "ckan",
    "POSTGRES_DB": values.get("POSTGRES_DB") or "ckan",
    "CKAN_DB_USER": values.get("CKAN_DB_USER") or "ckan_default",
    "CKAN_DB": values.get("CKAN_DB") or "ckan_default",
    "DATASTORE_READONLY_USER": values.get("DATASTORE_READONLY_USER") or "datastore",
    "DATASTORE_DB": values.get("DATASTORE_DB") or "datastore_default",
    "NGINX_SSLPORT_HOST": values.get("NGINX_SSLPORT_HOST") or "8443",
})
# Config values use generated hex strings, safe for PostgreSQL URLs and CKAN configuration.
values["CKAN_SQLALCHEMY_URL"] = f"postgresql://{values['CKAN_DB_USER']}:{values['CKAN_DB_PASSWORD']}@db/{values['CKAN_DB']}"
values["CKAN_DATASTORE_WRITE_URL"] = f"postgresql://{values['CKAN_DB_USER']}:{values['CKAN_DB_PASSWORD']}@db/{values['DATASTORE_DB']}"
values["CKAN_DATASTORE_READ_URL"] = f"postgresql://{values['DATASTORE_READONLY_USER']}:{values['DATASTORE_READONLY_PASSWORD']}@db/{values['DATASTORE_DB']}"

# CKAN 2.12 recommends explicit string values for the JWT signing/verification secrets.
for key in ("CKAN___API_TOKEN__JWT__ENCODE__SECRET", "CKAN___API_TOKEN__JWT__DECODE__SECRET"):
    value = values[key]
    values[key] = value if value.startswith("string:") else "string:" + value

# Enable CKAN's supported XLoader extension instead of the deprecated DataPusher service.
# `envvars` stays last. The API token is created post-startup by enable-xloader.sh.
plugin_raw = values.get("CKAN__PLUGINS", "").strip().strip('"').strip("'")
# Remove obsolete/mistyped view IDs from previous bootstrap runs. CKAN 2.12
# removed every Recline view; ckanext-geoview calls its shapefile plugin shp_view.
legacy_view_plugins = {
    "recline_view", "recline_grid_view", "recline_graph_view", "recline_map_view",
    "esri_shapefile_view",
}
portal_plugins = {
    "envvars", "wajo_pages", "wajo_theme", "scheming_datasets", "pages", "dcat",
    "dcat_rdf_harvester", "structured_data", "resource_proxy", "geo_view",
    "geojson_view", "wmts_view", "shp_view", "harvest", "ckan_harvester",
    "datatables_view", "image_view", "text_view", "datastore", "xloader",
    *legacy_view_plugins,
}
plugins = [plugin for plugin in (plugin_raw.split() if plugin_raw else []) if plugin not in portal_plugins and plugin != "datapusher"]
for plugin in (
    "scheming_datasets", "wajo_pages", "pages", "dcat", "dcat_rdf_harvester",
    "structured_data", "resource_proxy", "datatables_view", "image_view", "text_view",
    "geojson_view", "geo_view", "wmts_view", "shp_view", "harvest", "ckan_harvester",
    "datastore", "xloader",
):
    if plugin not in plugins:
        plugins.append(plugin)
# Schema extension must load before Pages; the visual theme loads last so its
# template overrides retain priority without changing the CMS permission model.
plugins.append("wajo_theme")
plugins.append("envvars")
values["CKAN__PLUGINS"] = '"' + " ".join(plugins) + '"'
# CKAN 2.12 ships the modern Midnight Blue UI; use the supported native theme instead of a prototype theme extension.
values["CKAN__BASE_PUBLIC_FOLDER"] = "public-midnight-blue"
values["CKAN__BASE_TEMPLATES_FOLDER"] = "templates-midnight-blue"
values["CKAN__SITE_TITLE"] = values.get("CKAN__SITE_TITLE", "Portal Satu Data Kabupaten Wajo").strip().strip("\"").strip("\'") or "Portal Satu Data Kabupaten Wajo"
values["CKAN__SITE_DESCRIPTION"] = values.get("CKAN__SITE_DESCRIPTION", "Portal data resmi Pemerintah Kabupaten Wajo").strip().strip("\"").strip("\'") or "Portal data resmi Pemerintah Kabupaten Wajo"
site_logo = values.get("CKAN__SITE_LOGO", "/logo-kabupaten-wajo.webp").strip().strip("\"").strip("\'")
# Migrate the previous generated path: extension public assets are exposed at the URL root.
if site_logo in {"", "/base/logo-kabupaten-wajo.webp"}:
    site_logo = "/logo-kabupaten-wajo.webp"
values["CKAN__SITE_LOGO"] = site_logo
values["CKANEXT__XLOADER__API_TOKEN"] = values.get("CKANEXT__XLOADER__API_TOKEN", "").strip().strip("\"").strip("\'")
values["CKANEXT__XLOADER__JOBS_DB__URI"] = values["CKAN_SQLALCHEMY_URL"]
values["CKANEXT__XLOADER__SITE_URL"] = "http://ckan:5000"
values["CKAN__SCHEMING__DATASET_SCHEMAS"] = "/srv/app/ckanext-schemas/dataset.yaml"
values["CKAN__SCHEMING__PRESETS"] = "ckanext.scheming:presets.json"
values["CKANEXT__PAGES__REVISIONS_LIMIT"] = "5"
values["CKANEXT__PAGES__REVISIONS_FORCE_LIMIT"] = "true"
values["CKANEXT__PAGES__ALLOW_HTML"] = "false"
values["CKANEXT__PAGES__EDITOR"] = "markdown"
# Keep the legacy SQL search endpoint disabled unless explicitly reviewed and protected.
values["CKAN__DATASTORE__SQLSEARCH__ENABLED"] = "false"
values["CKAN__HARVEST__MQ__TYPE"] = "redis"
values["CKAN__HARVEST__MQ__HOSTNAME"] = "redis"
values["CKAN__HARVEST__MQ__PORT"] = "6379"
values["CKAN__HARVEST__MQ__REDIS_DB"] = "1"
values["CKAN__HARVEST__LOG_SCOPE"] = "1"
values["CKAN__HARVEST__TIMEOUT"] = "1440"
values["CKAN__VIEWS__DEFAULT_VIEWS"] = "datatables_view image_view text_view geojson_view geo_view wmts_view shp_view"

# Append missing keys and replace existing keys without destroying comments/order.
written = set()
out = []
for line in lines:
    m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=', line)
    if m and m.group(1) in values:
        key = m.group(1)
        out.append(f"{key}={values[key]}")
        written.add(key)
    else:
        out.append(line)
for key, value in values.items():
    if key not in written:
        out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n")
path.chmod(0o600)
print("Updated CKAN 2.12/Solr 9 pins and synchronized database URLs.")
PY

# The upstream service env_file is a generated, filtered output of .env.ckan.
# Remove old upstream .env files so they cannot become a second source of truth.
rm -f "$UPSTREAM/.env"
python3 "$ROOT/deploy/ckan/render-upstream-env.py" "$ENV_FILE" "$UPSTREAM/.env.generated"
cp "$ROOT/deploy/ckan/docker-compose.override.yml" "$UPSTREAM/docker-compose.override.yml"
chmod 600 "$ENV_FILE"

cat <<MSG

Bootstrap prepared for CKAN 2.12.

Next steps:
1) Review deploy/ckan/README.md for Cloudflare Tunnel or manual DNS deployment.
2) Edit only .env.ckan. deploy/ckan/upstream/.env.generated is filtered and automatically regenerated.
3) Start one ingress profile only: manual, cloudflare, OR cloudflare-access (after Cloudflare Access policy is configured).
4) After CKAN is healthy, apply DataStore permissions and create the XLoader token:
   bash ./deploy/ckan/apply-datastore-permissions.sh
   bash ./deploy/ckan/enable-xloader.sh manual   # or cloudflare / cloudflare-access

No containers have been started. The upstream checkout is pinned to the official CKAN 2.12.1 base image,
Solr 2.12 / Solr 9, without DataPusher and without direct nginx host ports.
MSG

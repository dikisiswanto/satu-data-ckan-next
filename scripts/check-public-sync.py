#!/usr/bin/env python3
"""Guard preview availability, scheming configuration, and CKAN->Next cache invalidation."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
errors: list[str] = []
bootstrap = (root / "deploy/ckan/bootstrap-upstream.sh").read_text()
plugin = (root / "deploy/ckan/theme/ckanext/wajo_theme/plugin.py").read_text()
compose = (root / "deploy/ckan/docker-compose.override.yml").read_text()
renderer = (root / "deploy/ckan/render-upstream-env.py").read_text()
client = (root / "src/lib/ckan/client.js").read_text()
revalidate = root / "src/app/api/internal/ckan/revalidate/route.js"
public_route = (root / "src/app/api/3/action/[...action]/route.js").read_text()
detail = (root / "src/app/(public)/dataset/[slug]/page.jsx").read_text()
preview = (root / "src/components/dataset-resource-preview.jsx").read_text()

if 'values["CKAN___SCHEMING__DATASET_SCHEMAS"] = "ckanext.wajo_theme:schemas/dataset.yaml"' not in bootstrap or 'values["CKAN___SCHEMING__PRESETS"]' not in bootstrap:
    errors.append("Scheming harus memakai CKAN___SCHEMING__... (konfigurasi extension tanpa prefix ckan.)")
if '"CKAN__SCHEMING__DATASET_SCHEMAS"' not in bootstrap or '"CKAN__SCHEMING__PRESETS"' not in bootstrap:
    errors.append("Bootstrap harus membersihkan environment Scheming lama yang salah prefix-nya.")
if 'dataset_type: dataset' not in (root / "deploy/ckan/theme/ckanext/wajo_theme/schemas/dataset.yaml").read_text():
    errors.append("Schema dataset CKAN harus tetap mendaftarkan type dataset.")
if '"activity"' not in bootstrap or "db upgrade -p activity" not in (root / "deploy/ckan/initialize-extensions.sh").read_text():
    errors.append("Activity plugin/migrasi harus aktif agar package_activity_list terdaftar.")
if 'assert(["id", "offset", "limit"])' not in public_route or "include_hidden_activity: false" not in public_route:
    errors.append("Public activity facade harus memakai id/offset/limit dan selalu mengecualikan hidden activity.")
if "package_activity_list" not in detail or "limit: 8" not in detail or "include_hidden_activity: false" not in detail:
    errors.append("Detail dataset harus meminta activity dengan kontrak API CKAN yang valid.")
for fmt in ("csv", "tsv", "xls", "xlsx", "ods"):
    if fmt not in detail:
        errors.append(f"Detail dataset harus menampilkan panel preview untuk format {fmt.upper()}.")
if "datastoreActive={resource.datastore_active === true}" not in detail or "enabled: !datastoreActive" not in preview or "enabled: isDatastoreActive" not in preview:
    errors.append("Preview harus memeriksa status resource yang belum terindeks dan hanya meminta DataStore setelah aktif.")
if "resource.indexed" not in plugin or "IXloader" not in plugin or "after_upload" not in plugin or "def can_upload(self, resource_id)" not in plugin:
    errors.append("XLoader after_upload harus menginvalidasi cache setelah DataStore berhasil dimuat.")
for hook in ("after_dataset_create", "after_dataset_update", "after_dataset_delete", "after_resource_create", "after_resource_update", "after_resource_delete"):
    if f"def {hook}" not in plugin:
        errors.append(f"CKAN controller hook {hook} harus menginvalidasi cache portal.")
if "pages.changed" not in plugin or "_notify_group_or_organization" not in plugin or '"organization" if entity_type == "organization" else "group"' not in plugin:
    errors.append("Pages, organisasi, dan grup harus menginvalidasi cache katalog publik.")
if "def _enqueue_resource_preview" not in plugin or 'toolkit.get_action("xloader_submit")' not in plugin:
    errors.append("Resource baru/diperbarui harus otomatis mengantrekan XLoader untuk format tabular yang didukung.")
if not all(fmt in plugin for fmt in ("application/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.oasis.opendocument.spreadsheet")):
    errors.append("Auto XLoader harus mencakup format CSV/Excel/ODS bawaan XLoader 2.6.")
if not revalidate.is_file():
    errors.append("Signed Next.js cache invalidation route tidak ditemukan.")
else:
    route = revalidate.read_text()
    for token in ("createHmac", "timingSafeEqual", "x-wajo-timestamp", "x-wajo-signature", "MAX_CLOCK_SKEW_SECONDS", 'revalidateTag("ckan-public", { expire: 0 })', '"manual.revalidate"'):
        if token not in route:
            errors.append(f"Webhook revalidation tidak memvalidasi atau menginvalidasi dengan benar: {token}")
if 'tags: ["ckan-public", `ckan-action:${action}`]' not in client:
    errors.append("Setiap fetch CKAN server-side harus membawa tag invalidasi ckan-public.")
for token in ("CKAN_REVALIDATE_SECRET", "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_URL", "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_SECRET"):
    if token not in compose:
        errors.append(f"Compose tidak meneruskan rahasia/URL webhook ke service yang benar: {token}")
if "CKAN_REVALIDATE_SECRET" not in renderer or "CKANEXT__WAJO_THEME__PUBLIC_REVALIDATE_" not in renderer:
    errors.append("Renderer upstream harus mengecualikan rahasia dan URL webhook dari env_file CKAN umum.")
backfill = root / "deploy/ckan/backfill-datastore-previews.sh"
if not backfill.is_file() or "xloader submit" not in backfill.read_text():
    errors.append("Skrip backfill DataStore untuk resource lama harus tersedia.")
manual_revalidate = root / "deploy/ckan/revalidate-public-cache.sh"
if not manual_revalidate.is_file() or "manual.revalidate" not in manual_revalidate.read_text() or "X-Wajo-Signature" not in manual_revalidate.read_text():
    errors.append("Skrip validasi dan invalidasi cache publik manual harus tersedia dan memakai HMAC.")
if 's-maxage=5, stale-while-revalidate=5' not in public_route:
    errors.append("Cache facade API publik harus memiliki TTL fallback singkat setelah invalidasi event.")
if 'resourceStatusQuery' not in preview or 'resourceStatusQuery.refetch()' not in preview:
    errors.append("Preview harus memeriksa status DataStore otomatis dan menyediakan pemeriksaan ulang.")
e2e = (root / "tests/e2e/public-portal.spec.js").read_text()
mock = (root / "scripts/e2e-mock-ckan.mjs").read_text()
if "CSV preview remains visible before DataStore indexing" not in e2e or "resource-sekolah-pending" not in mock:
    errors.append("E2E harus menguji preview CSV fallback untuk resource yang belum diindeks DataStore.")
preview_route = root / "src/app/api/public/resource-preview/route.js"
if not preview_route.is_file():
    errors.append("Route preview CSV fallback tidak ditemukan.")
else:
    fallback = preview_route.read_text()
    for token in ("safeInternalDownloadUrl", "MAX_BYTES", 'ckanAction("resource_show"', 'ckanAction("package_show"', "parseDelimitedPreview"):
        if token not in fallback:
            errors.append(f"CSV fallback tidak membatasi/ memvalidasi proses preview: {token}")

if errors:
    print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
    raise SystemExit(1)
print("Public preview/sync contract passed: Scheming schema, Activity API, DataStore/XLoader previews, signed cache invalidation, and backfill workflow verified.")

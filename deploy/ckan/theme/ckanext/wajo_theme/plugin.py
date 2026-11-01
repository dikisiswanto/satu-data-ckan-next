"""Register Wajo admin theme and editorial metadata schema for ckanext-pages."""

import hashlib
import hmac
import json
import logging
from pathlib import Path
import time
import uuid
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request as UrlRequest, urlopen

import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
from ckan.lib.plugins import DefaultTranslation
from ckanext.pages.interfaces import IPagesSchema
from ckanext.xloader.interfaces import IXloader

from .markdown import render_wajo_markdown


ALLOWED_CONTENT_BLOCK_TYPES = {
    "hero",
    "rich_text",
    "image",
    "gallery",
    "stats",
    "dataset_links",
    "publication_list",
    "cta",
    "divider",
}
MAX_CONTENT_BLOCKS_BYTES = 80_000
MAX_CONTENT_BLOCK_COUNT = 16
LOG = logging.getLogger(__name__)


def validate_content_blocks(key, data, errors, context):
    """Reject invalid/unsupported block JSON before saving it to Pages extras."""
    value = data.get(key)
    if value is None or value == "":
        return
    if not isinstance(value, str) or len(value.encode("utf-8")) > MAX_CONTENT_BLOCKS_BYTES:
        errors.setdefault(key, []).append(
            "Content blocks harus berupa JSON dengan ukuran maksimal 80 KB."
        )
        return
    try:
        blocks = json.loads(value)
    except (TypeError, ValueError):
        errors.setdefault(key, []).append("Content blocks harus berupa JSON yang valid.")
        return
    if not isinstance(blocks, list):
        errors.setdefault(key, []).append("Content blocks harus berupa JSON array.")
        return
    if len(blocks) > MAX_CONTENT_BLOCK_COUNT:
        errors.setdefault(key, []).append("Maksimal 16 komponen dalam satu halaman.")
        return
    for index, block in enumerate(blocks):
        if not isinstance(block, dict) or block.get("type") not in ALLOWED_CONTENT_BLOCK_TYPES:
            errors.setdefault(key, []).append(
                f"Komponen nomor {index + 1} harus memakai tipe yang didukung."
            )
            return


class WajoPagesSchemaPlugin(plugins.SingletonPlugin):
    """Add structured editorial fields to the existing CKAN Pages records.

    Keep this plugin before ``pages`` in ``ckan.plugins`` so the Pages extension
    sees these fields when it builds its NAVL schema. Values are stored in the
    extension's existing ``extras`` JSON column; no additional DB table/migration
    is required.
    """

    plugins.implements(IPagesSchema, inherit=True)

    def update_pages_schema(self, schema):
        ignore_missing = toolkit.get_validator("ignore_missing")
        unicode_safe = toolkit.get_validator("unicode_safe")
        boolean_validator = toolkit.get_validator("boolean_validator")

        for field in (
            "excerpt",
            "category",
            "seo_title",
            "seo_description",
            "og_image",
            "template_type",
            "menu_label",
            "menu_order",
        ):
            schema[field] = [ignore_missing, unicode_safe]

        schema["content_blocks"] = [ignore_missing, unicode_safe, validate_content_blocks]

        for field in ("featured", "show_in_menu"):
            schema[field] = [ignore_missing, boolean_validator]

        return schema


class WajoHarvestTranslationPlugin(plugins.SingletonPlugin, DefaultTranslation):
    """Load the maintained Indonesian catalog for ckanext-harvest UI strings."""

    plugins.implements(plugins.ITranslation)

    def i18n_domain(self):
        return "ckanext-harvest"


class WajoPagesTranslationPlugin(plugins.SingletonPlugin, DefaultTranslation):
    """Load the maintained Indonesian catalog for ckanext-pages UI strings."""

    plugins.implements(plugins.ITranslation)

    def i18n_domain(self):
        return "ckanext-pages"


class WajoDcatTranslationPlugin(plugins.SingletonPlugin, DefaultTranslation):
    """Load Indonesian translations for the DCAT metadata labels."""

    plugins.implements(plugins.ITranslation)

    def i18n_domain(self):
        return "ckanext-dcat"


class WajoThemePlugin(plugins.SingletonPlugin):
    """Load the Wajo theme and enforce authentication on the admin hostname."""

    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.ITemplateHelpers)
    plugins.implements(plugins.IMiddleware)
    plugins.implements(plugins.IBlueprint)
    plugins.implements(plugins.IAuthFunctions)
    # CKAN consults IFiles before its configurable owner-cascade policy. This
    # is required for the dedicated public editorial-media owner.
    plugins.implements(plugins.IFiles, inherit=True)
    plugins.implements(plugins.IPackageController, inherit=True)
    plugins.implements(plugins.IResourceController, inherit=True)
    plugins.implements(plugins.IOrganizationController, inherit=True)
    plugins.implements(plugins.IGroupController, inherit=True)
    plugins.implements(IXloader, inherit=True)

    # These assets are required to render the CKAN login form. They are static
    # files, not public catalogue pages or user-uploaded resources.
    _LOGIN_PATHS = {"/user/login", "/user/login_generic"}
    _STATIC_PREFIXES = (
        "/base/", "/static/", "/fanstatic/", "/webassets/", "/images/",
        "/scripts/", "/css/", "/js/", "/vendor/",
    )
    _STATIC_PATHS = {"/favicon.ico", "/logo-kabupaten-wajo.webp"}

    @staticmethod
    def _record_value(record, key):
        if isinstance(record, dict):
            return record.get(key)
        return getattr(record, key, None) if record is not None else None

    def _notify_public_portal(self, event, record=None):
        """Invalidate Next.js public CKAN data cache using a signed internal webhook.

        The notification contains identifiers only, never resource data or user
        information. Failures are logged but must not roll back a valid CKAN write;
        the public fetch cache also has a bounded revalidation fallback.
        """
        target = str(toolkit.config.get("ckanext.wajo_theme.public_revalidate_url", "")).strip()
        secret = str(toolkit.config.get("ckanext.wajo_theme.public_revalidate_secret", "")).strip()
        if not target or not secret:
            return

        timestamp = str(int(time.time()))
        payload = {
            "event": event,
            "event_id": uuid.uuid4().hex,
            "record_id": self._record_value(record, "id") or self._record_value(record, "name"),
            "package_id": self._record_value(record, "package_id"),
        }
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        signed = timestamp.encode("ascii") + b"." + body
        digest = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
        request = UrlRequest(
            target,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Wajo-Timestamp": timestamp,
                "X-Wajo-Signature": "sha256=" + digest,
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=1.5) as response:
                if response.status < 200 or response.status >= 300:
                    raise RuntimeError("unexpected revalidation response: %s" % response.status)
            LOG.info("public_portal_cache_invalidated event=%s event_id=%s", event, payload["event_id"])
        except Exception:
            LOG.warning("public_portal_cache_invalidation_failed event=%s", event, exc_info=True)

    def after_dataset_create(self, context, pkg_dict):
        self._notify_public_portal("dataset.created", pkg_dict)

    def after_dataset_update(self, context, pkg_dict):
        self._notify_public_portal("dataset.updated", pkg_dict)

    def after_dataset_delete(self, context, pkg_dict):
        self._notify_public_portal("dataset.deleted", pkg_dict)

    _XLOADER_FORMATS = {
        "csv",
        "application/csv",
        "xls",
        "xlsx",
        "tsv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ods",
        "application/vnd.oasis.opendocument.spreadsheet",
    }

    def _enqueue_resource_preview(self, context, resource):
        """Queue supported tabular resources after CKAN saves their metadata.

        XLoader owns format detection, hashing, duplicate-job handling and the
        actual asynchronous DataStore load. This hook only submits formats in
        XLoader 2.6.0's default allow-list and uses CKAN's internal auth bypass;
        no XLoader API token is exposed to users or sent to the browser.
        """
        resource_id = self._record_value(resource, "id")
        resource_format = str(self._record_value(resource, "format") or "").strip().lower()
        if not resource_id or resource_format not in self._XLOADER_FORMATS:
            return

        api_token = str(toolkit.config.get("ckanext.xloader.api_token", "")).strip()
        if not api_token or api_token == "NOT_SET":
            LOG.warning("xloader_auto_submit_skipped resource_id=%s reason=api_token_not_configured", resource_id)
            return

        submit_context = dict(context or {})
        submit_context["ignore_auth"] = True
        try:
            submitted = toolkit.get_action("xloader_submit")(
                submit_context,
                {"resource_id": resource_id},
            )
            if submitted:
                LOG.info("xloader_auto_submit_queued resource_id=%s", resource_id)
        except Exception:
            # Do not roll back a valid metadata/resource save if the worker or
            # queue is temporarily unavailable. Backfill can repair old records.
            LOG.warning("xloader_auto_submit_failed resource_id=%s", resource_id, exc_info=True)

    def after_resource_create(self, context, resource):
        self._notify_public_portal("resource.created", resource)
        self._enqueue_resource_preview(context, resource)

    def _ensure_geojson_resource_views(self, context, resource):
        """Backfill default map views when an existing GeoJSON resource is edited.

        CKAN applies ``ckan.views.default_views`` automatically on create, but
        changing that setting does not retrofit old ResourceView records. The
        resource-update path gives legacy .geojson records a safe repair path:
        after format normalization, ask CKAN's own default-view action to add
        any missing configured views (without manufacturing duplicate views).
        """
        resource_id = self._record_value(resource, "id")
        resource_format = str(self._record_value(resource, "format") or "").strip().lower()
        mimetype = str(self._record_value(resource, "mimetype") or "").split(";", 1)[0].strip().lower()
        if not resource_id or not (
            resource_format == "geojson"
            or mimetype in {"application/geo+json", "application/vnd.geo+json"}
        ):
            return

        view_context = dict(context or {})
        view_context["ignore_auth"] = True
        try:
            created = toolkit.get_action("resource_create_default_resource_views")(
                view_context,
                {"resource": resource},
            )
            if created:
                LOG.info("geojson_default_views_backfilled resource_id=%s count=%s", resource_id, len(created))
        except Exception:
            # A preview problem must not invalidate an otherwise valid metadata edit.
            LOG.warning("geojson_default_views_backfill_failed resource_id=%s", resource_id, exc_info=True)

    def after_resource_update(self, context, resource):
        self._notify_public_portal("resource.updated", resource)
        self._enqueue_resource_preview(context, resource)
        self._ensure_geojson_resource_views(context, resource)

    def after_resource_delete(self, context, resources):
        self._notify_public_portal("resource.deleted")

    def can_upload(self, resource_id):
        """Allow XLoader's own format validator to decide which resources load.

        IXloader requires this method whenever the theme subscribes to the
        interface for its after_upload callback. XLoader already checks the
        configured format allow-list before invoking can_upload.
        """
        return True

    def after_upload(self, context, resource_dict, dataset_dict):
        # XLoader changes datastore_active without calling IResourceController's
        # after_resource_update hook. Invalidate only after a successful load.
        self._notify_public_portal("resource.indexed", {
            "id": resource_dict.get("id"),
            "package_id": dataset_dict.get("id"),
        })

    def _notify_group_or_organization(self, verb, entity):
        entity_type = str(self._record_value(entity, "type") or "group").lower()
        kind = "organization" if entity_type == "organization" else "group"
        self._notify_public_portal(f"{kind}.{verb}", entity)

    def create(self, entity):
        self._notify_group_or_organization("created", entity)

    def edit(self, entity):
        self._notify_group_or_organization("updated", entity)

    def delete(self, entity):
        self._notify_group_or_organization("deleted", entity)

    def update_config(self, config):
        # CKAN's template lookup order depends on plugin registration order.
        # Put the Wajo template directory in extra_template_paths explicitly so
        # the CMS detail templates win over ckanext-pages' upstream templates
        # regardless of other extensions enabled in the deployment.
        theme_templates = str(Path(__file__).resolve().parent / "templates")
        configured_paths = [
            path.strip()
            for path in str(config.get("extra_template_paths", "")).split(",")
            if path.strip() and path.strip() != theme_templates
        ]
        config["extra_template_paths"] = ",".join([theme_templates, *configured_paths])

        toolkit.add_template_directory(config, "templates")
        toolkit.add_public_directory(config, "public")
        toolkit.add_resource("assets", "wajo_theme")

    def get_helpers(self):
        """Expose a sanitized GFM-compatible renderer for CKAN Pages/Blog."""
        return {"wajo_render_markdown": render_wajo_markdown}

    def files_file_allows(self, context, file, operation):
        """Allow public reads for the one dedicated editorial-media owner.

        CKAN's permission_download_file delegates to permission_read_file, which
        consults this IFiles hook before the configured owner cascade. Returning
        None for other owner types preserves CKAN's normal resource/group/
        organization permissions. The hook never grants edit/delete access.
        """
        # CKAN exposes the owner as both ``file.owner`` on the ORM model and
        # ``file.owner_info`` in its file-facing interfaces/API serializers.
        # Prefer owner_info, but tolerate either representation.
        owner = (
            self._record_value(file, "owner_info")
            or self._record_value(file, "owner")
        )
        owner_type = (
            self._record_value(owner, "owner_type")
            or self._record_value(file, "owner_type")
        )
        if owner_type != "wajo_media":
            return None

        owner_id = (
            self._record_value(owner, "owner_id")
            or self._record_value(owner, "id")
            or self._record_value(file, "owner_id")
        )
        return operation == "show" and owner_id == "public-editorial-media"

    def get_auth_functions(self):
        """Expose only the editorial-media owner used for public CMS images.

        Files are uploaded by an authenticated CKAN sysadmin endpoint, then
        transferred to this single owner. This does not make user, resource,
        group, or organization uploads public beyond CKAN's normal policies.
        """
        def wajo_media_show(context, data_dict):
            allowed = str(data_dict.get("id", "")) == "public-editorial-media"
            return {"success": allowed, "msg": "Akses media editorial ditolak."}

        return {"wajo_media_show": wajo_media_show}

    def make_error_log_middleware(self, app, config):
        """Return CKAN's wrapped application unchanged.

        The theme has no custom error-log middleware, but CKAN 2.12 requires
        every IMiddleware implementation to expose this hook. Returning the
        wrapped WSGI app preserves CKAN's standard exception logging.
        """
        return app

    @staticmethod
    def _normalize_geojson_resource_format(resource, current=None):
        """Normalize .geojson uploads so CKAN can create their resource views.

        GeoView selects files by their resource ``format`` rather than only
        their filename. A user can upload a valid .geojson file while leaving
        that optional metadata blank or choosing the generic JSON format.
        """
        if not isinstance(resource, dict):
            return
        combined = dict(current or {})
        combined.update(resource)
        upload = combined.get("upload")
        upload_name = getattr(upload, "filename", "") if upload is not None else ""
        names = (
            combined.get("name"),
            combined.get("url"),
            upload_name,
        )
        mime_types = (
            combined.get("mimetype"),
            combined.get("mimetype_inner"),
        )
        is_geojson = any(
            str(value or "").split("?", 1)[0].split("#", 1)[0].lower().endswith(".geojson")
            for value in names
        ) or any(
            str(value or "").split(";", 1)[0].strip().lower() in {
                "application/geo+json",
                "application/vnd.geo+json",
            }
            for value in mime_types
        )
        if is_geojson:
            resource["format"] = "GeoJSON"

    def before_resource_create(self, context, resource):
        """Set a canonical format before CKAN chooses default resource views."""
        self._normalize_geojson_resource_format(resource)

    def before_resource_update(self, context, current, resource):
        """Keep GeoJSON format canonical when a resource is edited."""
        self._normalize_geojson_resource_format(resource, current)

    def make_middleware(self, app, config):
        """Gate every browser/API route on CKAN_HOST while leaving internal CKAN API use intact.

        CKAN invokes IMiddleware for both legacy and Flask stacks. Only register
        Flask hooks on the Flask application; the CKAN 2.12 request identity hook
        is registered before extension middleware, so current_user is resolved
        before this access check runs.
        """
        if not hasattr(app, "before_request") or not hasattr(app, "after_request"):
            return app

        from flask import jsonify, redirect, request, session, url_for
        from flask_login import current_user

        admin_host = str(config.get("ckanext.wajo_theme.admin_host", "")).strip().lower()
        public_site = urlsplit(str(config.get("ckan.site_url", "")))
        public_host = (public_site.netloc or "").lower()

        def is_admin_request():
            host = (request.host or "").split(":", 1)[0].lower()
            return bool(admin_host) and host == admin_host

        def is_login_asset(path):
            normalized = (path or "/").lower()
            return (
                normalized in self._STATIC_PATHS
                or any(normalized.startswith(prefix) for prefix in self._STATIC_PREFIXES)
            )

        @app.before_request
        def require_admin_login():
            if not is_admin_request():
                return None

            path = request.path or "/"
            if is_login_asset(path):
                return None

            came_from = str(getattr(request, "args", {}).get("came_from", "") or "")
            stale_logout_target = urlsplit(came_from).path.rstrip("/") in {
                "/user/logout", "/user/logged_out_redirect",
            }

            if current_user.is_authenticated:
                # CKAN flashes a logout confirmation into the session. A fast
                # re-login can leave that message queued on the new dashboard;
                # remove only stale logout notices, not other success/error flashes.
                flashes = session.get("_flashes", [])
                if flashes:
                    retained = []
                    for item in flashes:
                        message = str(item[1] if isinstance(item, (tuple, list)) and len(item) > 1 else item).lower()
                        if any(marker in message for marker in ("logged out", "logout", "telah keluar", "sudah keluar", "berhasil keluar")):
                            continue
                        retained.append(item)
                    if len(retained) != len(flashes):
                        session["_flashes"] = retained

                if (path in self._LOGIN_PATHS and request.method in {"GET", "HEAD"}) or (
                    path == "/user/logged_out_redirect" and request.method in {"GET", "HEAD"}
                ):
                    return redirect(url_for("wajo_admin.index"))
                if path == "/":
                    return redirect(url_for("wajo_admin.index"))
                return None

            if path == "/user/logged_out_redirect":
                # Never let CKAN turn its own logout target into came_from again.
                return redirect(url_for("user.login"))
            if path in self._LOGIN_PATHS:
                if request.method in {"GET", "HEAD"} and stale_logout_target:
                    return redirect(url_for("user.login"))
                return None

            if path.startswith("/api/"):
                return jsonify({
                    "success": False,
                    "error": {
                        "message": "Login diperlukan untuk mengakses CKAN Admin.",
                        "__type": "Authorization Error",
                    },
                }), 401

            # Keep the requested CKAN page and query string so successful login
            # returns to the page the administrator originally opened.
            came_from = request.full_path.rstrip("?")
            if path == "/" or not came_from.startswith("/") or came_from.startswith("//"):
                came_from = url_for("wajo_admin.index")
            return redirect(url_for("user.login", came_from=came_from))

        @app.after_request
        def keep_admin_redirect_on_admin_host(response):
            """Invalidate Pages writes and localize CKAN redirects on the admin host."""
            if not is_admin_request():
                return response

            path = (request.path or "").rstrip("/")
            if path in {"/user/logout", "/user/logged_out_redirect"}:
                # CKAN's default logout destination can persist as came_from and
                # replay its success flash on the next login. Always finish on a
                # fresh login or dashboard URL, never on the logout confirmation.
                response.status_code = 303
                response.headers["Location"] = (
                    url_for("wajo_admin.index")
                    if path == "/user/logged_out_redirect" and current_user.is_authenticated
                    else url_for("user.login")
                )
                response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                response.headers["Pragma"] = "no-cache"
                return response
            if path == "/user/login":
                response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                response.headers["Pragma"] = "no-cache"
                location = response.headers.get("Location", "")
                target_path = urlsplit(location).path.rstrip("/") if location else ""
                if target_path in {"/user/logout", "/user/logged_out_redirect"}:
                    response.status_code = 303
                    response.headers["Location"] = (
                        url_for("wajo_admin.index") if current_user.is_authenticated else url_for("user.login")
                    )
                    return response
            if request.method in {"POST", "PUT", "PATCH", "DELETE"} and response.status_code < 400:
                pages_form_write = path == "/pages" or path.startswith("/pages/")
                pages_api_write = path.startswith("/api/3/action/ckanext_pages_") and any(
                    suffix in path for suffix in ("_create", "_update", "_delete")
                )
                if pages_form_write or pages_api_write:
                    self._notify_public_portal("pages.changed", {"id": path})

            location = response.headers.get("Location")
            if not location:
                return response
            target = urlsplit(location)
            if not target.netloc or target.netloc.lower() != public_host:
                return response
            response.headers["Location"] = urlunsplit((
                "https", admin_host, target.path or "/", target.query, target.fragment,
            ))
            return response

        return app

    def get_blueprint(self):
        """Register Wajo Admin pages and a permission-scoped editorial media upload."""
        from flask import Blueprint, jsonify, redirect, request, url_for
        from flask_login import current_user
        from werkzeug.utils import secure_filename
        from io import BytesIO
        from ckan.lib import base

        blueprint = Blueprint("wajo_admin", __name__, url_prefix="/admin")

        @blueprint.post("/media/upload")
        def upload_editorial_media():
            """Upload a verified raster image to CKAN FileStore for CMS Markdown.

            Uploads are restricted to sysadmins, bounded in size, checked by
            magic bytes, and assigned a dedicated public-read owner. The
            browser receives only a same-origin portal URL, never a storage path.
            """
            from flask import abort

            if not current_user.is_authenticated:
                return jsonify({"success": False, "message": "Sesi login telah berakhir."}), 401
            if not bool(getattr(current_user, "sysadmin", False)):
                abort(403)
            if request.content_length and request.content_length > 8 * 1024 * 1024 + 128 * 1024:
                return jsonify({"success": False, "message": "Ukuran gambar maksimal 8 MiB."}), 413
            upload = request.files.get("upload")
            if upload is None or not upload.filename:
                return jsonify({"success": False, "message": "Pilih gambar terlebih dahulu."}), 400

            content = upload.stream.read(8 * 1024 * 1024 + 1)
            if not content or len(content) > 8 * 1024 * 1024:
                return jsonify({"success": False, "message": "Ukuran gambar maksimal 8 MiB."}), 413

            if content.startswith(b"\x89PNG\r\n\x1a\n"):
                extension, mime = "png", "image/png"
            elif content.startswith(b"\xff\xd8\xff"):
                extension, mime = "jpg", "image/jpeg"
            elif content[:6] in (b"GIF87a", b"GIF89a"):
                extension, mime = "gif", "image/gif"
            elif content[:4] == b"RIFF" and content[8:12] == b"WEBP":
                extension, mime = "webp", "image/webp"
            else:
                return jsonify({"success": False, "message": "Format gambar tidak didukung. Gunakan PNG, JPEG, GIF, atau WebP."}), 415

            # Never trust the submitted filename or extension as the MIME source.
            original_name = secure_filename(upload.filename or "gambar")[:100] or "gambar"
            stored_name = "%s.%s" % (uuid.uuid4().hex, extension)
            upload.stream = BytesIO(content)
            context = {"user": current_user.name, "auth_user_obj": current_user, "ignore_auth": True}
            created = None
            try:
                created = toolkit.get_action("file_create")(
                    dict(context),
                    {"storage": "default", "name": stored_name, "upload": upload},
                )
                file_id = str(created.get("id", ""))
                if not file_id:
                    raise RuntimeError("CKAN tidak mengembalikan ID file.")
                toolkit.get_action("file_ownership_transfer")(
                    dict(context),
                    {
                        "id": file_id,
                        "owner_type": "wajo_media",
                        "owner_id": "public-editorial-media",
                        "pin": True,
                    },
                )
                public_origin = str(toolkit.config.get("ckan.site_url", "")).rstrip("/")
                if not public_origin.startswith("https://"):
                    raise RuntimeError("CKAN site_url harus menggunakan HTTPS untuk media publik.")
                return jsonify({
                    "success": True,
                    "id": file_id,
                    "name": original_name,
                    "mime_type": mime,
                    "url": "%s/api/editorial-media/%s" % (public_origin, file_id),
                })
            except Exception:
                LOG.exception("Wajo editorial media upload failed")
                if created and created.get("id"):
                    try:
                        toolkit.get_action("file_delete")(
                            dict(context), {"id": created["id"]},
                        )
                    except Exception:
                        LOG.warning("Unable to clean up failed editorial media upload", exc_info=True)
                return jsonify({"success": False, "message": "Gambar gagal disimpan ke FileStore CKAN."}), 502

        @blueprint.get("/")
        def index():
            if not current_user.is_authenticated:
                from flask import redirect, url_for
                return redirect(url_for("user.login", came_from=url_for("wajo_admin.index")))

            action_context = {
                "user": current_user.name,
                "auth_user_obj": current_user,
                "for_view": True,
            }

            def call_action(action_name, data_dict):
                try:
                    return toolkit.get_action(action_name)(action_context, data_dict)
                except Exception:  # Dashboard cards must not make the admin app unavailable.
                    LOG.exception("Unable to load Wajo Admin dashboard data from %s", action_name)
                    return None

            dataset_payload = call_action(
                "package_search",
                {"rows": 6, "sort": "metadata_modified desc"},
            )
            organization_payload = call_action("organization_list", {"all_fields": True})
            group_payload = call_action("group_list", {"all_fields": True})
            mine_payload = call_action(
                "package_search",
                {"rows": 0, "fq": "creator_user_id:%s" % current_user.id},
            )

            dataset_result = dataset_payload if isinstance(dataset_payload, dict) else {}
            mine_result = mine_payload if isinstance(mine_payload, dict) else {}
            recent_datasets = dataset_result.get("results", [])
            stats = {
                "datasets": dataset_result.get("count"),
                "organizations": len(organization_payload) if isinstance(organization_payload, list) else None,
                "groups": len(group_payload) if isinstance(group_payload, list) else None,
                "my_datasets": mine_result.get("count"),
            }
            return base.render("wajo_theme/dashboard.html", {
                "wajo_admin_stats": stats,
                "wajo_admin_recent_datasets": recent_datasets,
            })

        def require_sysadmin():
            from flask import abort
            if not current_user.is_authenticated:
                from flask import redirect, url_for
                return redirect(url_for("user.login", came_from=url_for("wajo_admin.data_preview")))
            if not bool(getattr(current_user, "sysadmin", False)):
                abort(403)
            return None

        @blueprint.get("/data-preview")
        def data_preview():
            denied = require_sysadmin()
            if denied is not None:
                return denied

            action_context = {
                "user": current_user.name,
                "auth_user_obj": current_user,
                "ignore_auth": True,
                "for_view": True,
            }

            def read_action(action_name, data_dict):
                try:
                    return toolkit.get_action(action_name)(dict(action_context), data_dict)
                except Exception:
                    LOG.info("Wajo DataStore readiness probe failed for action %s", action_name, exc_info=True)
                    return None

            configured_plugins = toolkit.config.get("ckan.plugins", [])
            if isinstance(configured_plugins, str):
                plugin_names = set(configured_plugins.split())
            else:
                plugin_names = set(configured_plugins or [])

            write_url = str(toolkit.config.get("ckan.datastore.write_url", "")).strip()
            read_url = str(toolkit.config.get("ckan.datastore.read_url", "")).strip()
            xloader_token = str(toolkit.config.get("ckanext.xloader.api_token", "")).strip()
            jobs_db_uri = str(toolkit.config.get("ckanext.xloader.jobs_db.uri", "")).strip()
            xloader_action_available = True
            try:
                toolkit.get_action("xloader_submit")
            except Exception:
                xloader_action_available = False

            package_payload = read_action(
                "package_search",
                {"rows": 100, "sort": "metadata_modified desc", "include_private": False},
            )
            packages = package_payload.get("results", []) if isinstance(package_payload, dict) else []
            eligible_formats = set(self._XLOADER_FORMATS)
            pending_resources = []
            ready_resources = []
            for package in packages:
                if not isinstance(package, dict) or package.get("private"):
                    continue
                for resource in package.get("resources", []) or []:
                    if not isinstance(resource, dict) or resource.get("state") == "deleted":
                        continue
                    resource_format = str(resource.get("format") or "").strip().lower()
                    if resource_format not in eligible_formats:
                        continue
                    item = {
                        "id": resource.get("id"),
                        "name": resource.get("name") or resource.get("id"),
                        "dataset": package.get("title") or package.get("name"),
                        "dataset_name": package.get("name") or package.get("id"),
                        "format": resource_format.upper(),
                        "datastore_active": bool(resource.get("datastore_active")),
                    }
                    if item["datastore_active"]:
                        ready_resources.append(item)
                    else:
                        pending_resources.append(item)

            datastore_probe = None
            for resource in ready_resources[:3]:
                response = read_action("datastore_search", {"resource_id": resource["id"], "limit": 1})
                if isinstance(response, dict):
                    datastore_probe = True
                    break
                datastore_probe = False

            checks = [
                {"label": "Plugin DataStore aktif", "ok": "datastore" in plugin_names, "detail": "CKAN harus memuat plugin datastore."},
                {"label": "URL baca DataStore tersedia", "ok": bool(read_url), "detail": "Koneksi PostgreSQL khusus baca digunakan oleh pratinjau."},
                {"label": "URL tulis DataStore tersedia", "ok": bool(write_url), "detail": "CKAN memerlukan koneksi tulis untuk membuat tabel resource."},
                {"label": "Plugin XLoader aktif", "ok": "xloader" in plugin_names, "detail": "XLoader mengirim berkas tabular ke DataStore secara asinkron."},
                {"label": "Token XLoader tersedia", "ok": bool(xloader_token and xloader_token != "NOT_SET"), "detail": "Token hanya diperiksa keberadaannya; nilainya tidak pernah ditampilkan."},
                {"label": "Aksi antrean XLoader tersedia", "ok": xloader_action_available, "detail": "CKAN harus mengenali action xloader_submit."},
                {"label": "Basis data antrean XLoader tersedia", "ok": bool(jobs_db_uri), "detail": "Worker harus memakai basis data pekerjaan yang sama dengan CKAN."},
            ]
            return base.render("wajo_theme/data_preview.html", {
                "wajo_datastore_checks": checks,
                "wajo_datastore_ready": sum(1 for check in checks if check["ok"]),
                "wajo_datastore_total": len(checks),
                "wajo_datastore_probe": datastore_probe,
                "wajo_datastore_pending": pending_resources,
                "wajo_datastore_ready_resources": ready_resources,
                "wajo_datastore_queued": request.args.get("queued", ""),
                "wajo_datastore_failed": request.args.get("failed", ""),
                "wajo_datastore_error": request.args.get("error", ""),
                "wajo_datastore_scan_limited": len(packages) >= 100,
            })

        @blueprint.post("/data-preview/backfill")
        def data_preview_backfill():
            denied = require_sysadmin()
            if denied is not None:
                return denied
            from flask import redirect, url_for

            token = str(toolkit.config.get("ckanext.xloader.api_token", "")).strip()
            if not token or token == "NOT_SET":
                return redirect(url_for("wajo_admin.data_preview", error="token"))

            action_context = {
                "user": current_user.name,
                "auth_user_obj": current_user,
                "ignore_auth": True,
            }
            try:
                packages = toolkit.get_action("package_search")(
                    dict(action_context),
                    {"rows": 100, "sort": "metadata_modified desc", "include_private": False},
                ).get("results", [])
                submit = toolkit.get_action("xloader_submit")
            except Exception:
                LOG.warning("Unable to prepare Wajo DataStore backfill", exc_info=True)
                return redirect(url_for("wajo_admin.data_preview", error="setup"))

            queued = 0
            failed = 0
            maximum_jobs = 25
            for package in packages:
                if not isinstance(package, dict) or package.get("private"):
                    continue
                for resource in package.get("resources", []) or []:
                    if queued + failed >= maximum_jobs:
                        break
                    if not isinstance(resource, dict) or resource.get("state") == "deleted":
                        continue
                    resource_format = str(resource.get("format") or "").strip().lower()
                    if resource.get("datastore_active") or resource_format not in self._XLOADER_FORMATS:
                        continue
                    try:
                        result = submit(
                            dict(action_context),
                            {"resource_id": resource.get("id")},
                        )
                        if result:
                            queued += 1
                        else:
                            failed += 1
                    except Exception:
                        failed += 1
                        LOG.warning(
                            "Wajo DataStore backfill submit failed for resource %s",
                            resource.get("id"),
                            exc_info=True,
                        )
                if queued + failed >= maximum_jobs:
                    break

            return redirect(url_for(
                "wajo_admin.data_preview",
                queued=queued,
                failed=failed,
            ))

        return blueprint


"""Register Wajo admin theme and editorial metadata schema for ckanext-pages."""

import json
import logging
from urllib.parse import urlsplit, urlunsplit

import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
from ckan.lib.plugins import DefaultTranslation
from ckanext.pages.interfaces import IPagesSchema


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


class WajoThemePlugin(plugins.SingletonPlugin):
    """Load the Wajo theme and enforce authentication on the admin hostname."""

    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.IMiddleware)
    plugins.implements(plugins.IBlueprint)

    # These assets are required to render the CKAN login form. They are static
    # files, not public catalogue pages or user-uploaded resources.
    _LOGIN_PATHS = {"/user/login", "/user/login_generic"}
    _STATIC_PREFIXES = (
        "/base/", "/static/", "/fanstatic/", "/webassets/", "/images/",
        "/scripts/", "/css/", "/js/", "/vendor/",
    )
    _STATIC_PATHS = {"/favicon.ico", "/logo-kabupaten-wajo.webp"}

    def update_config(self, config):
        toolkit.add_template_directory(config, "templates")
        toolkit.add_public_directory(config, "public")
        toolkit.add_resource("assets", "wajo_theme")

    def make_middleware(self, app, config):
        """Gate every browser/API route on CKAN_HOST while leaving internal CKAN API use intact.

        CKAN invokes IMiddleware for both legacy and Flask stacks. Only register
        Flask hooks on the Flask application; the CKAN 2.12 request identity hook
        is registered before extension middleware, so current_user is resolved
        before this access check runs.
        """
        if not hasattr(app, "before_request") or not hasattr(app, "after_request"):
            return app

        from flask import jsonify, redirect, request, url_for
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

            if path in self._LOGIN_PATHS:
                if current_user.is_authenticated and request.method in {"GET", "HEAD"}:
                    return redirect(url_for("wajo_admin.index"))
                return None

            if current_user.is_authenticated:
                if path == "/":
                    return redirect(url_for("wajo_admin.index"))
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
            """Rewrite CKAN_SITE_URL redirects to CKAN_HOST for browser navigation only."""
            if not is_admin_request():
                return response
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
        """Register the Wajo Admin overview without replacing CKAN's core routes."""
        from flask import Blueprint
        from flask_login import current_user
        from ckan.lib import base

        blueprint = Blueprint("wajo_admin", __name__, url_prefix="/wajo-admin")

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

        return blueprint


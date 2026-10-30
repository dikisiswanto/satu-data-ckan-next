"""Register Wajo admin theme and editorial metadata schema for ckanext-pages."""

import json
from urllib.parse import urlsplit, urlunsplit

import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
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


class WajoThemePlugin(plugins.SingletonPlugin):
    """Load the Wajo theme and enforce authentication on the admin hostname."""

    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.IMiddleware)

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
                    return redirect(url_for("dashboard.datasets"))
                return None

            if current_user.is_authenticated:
                if path == "/":
                    return redirect(url_for("dashboard.datasets"))
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
            if not came_from.startswith("/") or came_from.startswith("//"):
                came_from = "/dashboard/datasets"
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

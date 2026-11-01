#!/usr/bin/env python3
"""Exercise the CKAN admin-host auth middleware with small dependency stubs.

The project CI image need not install CKAN/Flask: this test verifies the
request/redirect policy implemented by WajoThemePlugin.make_middleware.
"""
from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN_PATH = ROOT / "deploy/ckan/theme/ckanext/wajo_theme/plugin.py"


def install_module_stubs() -> tuple[types.ModuleType, types.ModuleType, types.ModuleType]:
    """Provide the minimum imports needed to load the plugin without CKAN."""
    ckan = types.ModuleType("ckan")
    ckan.__path__ = []
    plugins = types.ModuleType("ckan.plugins")

    class SingletonPlugin:
        pass

    class IConfigurer:
        pass

    class IMiddleware:
        pass

    class IBlueprint:
        pass

    class IAuthFunctions:
        pass

    class IFiles:
        pass

    class ITranslation:
        pass

    class ITemplateHelpers:
        pass

    class IPackageController:
        pass

    class IResourceController:
        pass

    class IOrganizationController:
        pass

    class IGroupController:
        pass

    plugins.SingletonPlugin = SingletonPlugin
    plugins.IConfigurer = IConfigurer
    plugins.IPackageController = IPackageController
    plugins.IMiddleware = IMiddleware
    plugins.IBlueprint = IBlueprint
    plugins.IAuthFunctions = IAuthFunctions
    plugins.IFiles = IFiles
    plugins.ITranslation = ITranslation
    plugins.ITemplateHelpers = ITemplateHelpers
    plugins.IResourceController = IResourceController
    plugins.IOrganizationController = IOrganizationController
    plugins.IGroupController = IGroupController
    plugins.implements = lambda *args, **kwargs: None

    toolkit = types.ModuleType("ckan.plugins.toolkit")
    toolkit.get_validator = lambda name: None
    toolkit.config = {"ckanext.xloader.api_token": "test-xloader-token"}
    toolkit.add_template_directory = lambda *args: None
    toolkit.add_public_directory = lambda *args: None
    toolkit.add_resource = lambda *args: None
    plugins.toolkit = toolkit
    ckan.plugins = plugins
    ckan_lib = types.ModuleType("ckan.lib")
    ckan_lib.__path__ = []
    ckan_lib_plugins = types.ModuleType("ckan.lib.plugins")

    class DefaultTranslation:
        pass

    ckan_lib_plugins.DefaultTranslation = DefaultTranslation
    ckan_lib.plugins = ckan_lib_plugins
    sys.modules.update({
        "ckan": ckan,
        "ckan.plugins": plugins,
        "ckan.plugins.toolkit": toolkit,
        "ckan.lib": ckan_lib,
        "ckan.lib.plugins": ckan_lib_plugins,
    })

    ckanext = types.ModuleType("ckanext")
    ckanext.__path__ = []
    theme_package = types.ModuleType("ckanext.wajo_theme")
    theme_package.__path__ = [str(PLUGIN_PATH.parent)]
    markdown_stub = types.ModuleType("ckanext.wajo_theme.markdown")
    markdown_stub.render_wajo_markdown = lambda content: content
    ckanext.wajo_theme = theme_package
    theme_package.markdown = markdown_stub
    pages = types.ModuleType("ckanext.pages")
    pages.__path__ = []
    interfaces = types.ModuleType("ckanext.pages.interfaces")

    class IPagesSchema:
        pass

    interfaces.IPagesSchema = IPagesSchema
    xloader = types.ModuleType("ckanext.xloader")
    xloader.__path__ = []
    xloader_interfaces = types.ModuleType("ckanext.xloader.interfaces")

    class IXloader:
        pass

    xloader_interfaces.IXloader = IXloader
    sys.modules.update({
        "ckanext": ckanext,
        "ckanext.wajo_theme": theme_package,
        "ckanext.wajo_theme.markdown": markdown_stub,
        "ckanext.pages": pages,
        "ckanext.pages.interfaces": interfaces,
        "ckanext.xloader": xloader,
        "ckanext.xloader.interfaces": xloader_interfaces,
    })

    class Request:
        host = "admin.example.test"
        path = "/"
        full_path = "/"
        method = "GET"
        args = {}

    request = Request()

    class User:
        is_authenticated = False
        name = "wajo_admin"
        id = "user-001"

    user = User()
    class FakeBlueprint:
        def __init__(self, name, import_name, url_prefix=None):
            self.name = name
            self.import_name = import_name
            self.url_prefix = url_prefix
            self.routes = {}

        def get(self, route):
            def decorate(function):
                self.routes[route] = function
                return function
            return decorate

        def post(self, route):
            # The smoke test records route handlers independent of HTTP method.
            return self.get(route)

    flask = types.ModuleType("flask")
    flask.Blueprint = FakeBlueprint
    flask.request = request
    flask.session = {}
    flask.jsonify = lambda payload: ("JSON", payload)
    flask.redirect = lambda target: ("REDIRECT", target)

    def url_for(endpoint: str, **kwargs: str) -> str:
        if endpoint == "user.login":
            came_from = kwargs.get("came_from")
            return "/user/login" + (f"?came_from={came_from}" if came_from is not None else "")
        if endpoint == "user.logout":
            return "/user/logout"
        if endpoint == "dashboard.datasets":
            return "/dashboard/datasets"
        if endpoint == "wajo_admin.index":
            return "/admin/"
        raise AssertionError(f"Unexpected url_for endpoint in test: {endpoint}")

    flask.url_for = url_for
    flask_login = types.ModuleType("flask_login")
    flask_login.current_user = user
    sys.modules.update({"flask": flask, "flask_login": flask_login})
    werkzeug = types.ModuleType("werkzeug")
    werkzeug.__path__ = []
    werkzeug_utils = types.ModuleType("werkzeug.utils")
    werkzeug_utils.secure_filename = lambda value: str(value).replace("/", "_").replace("\\", "_")
    werkzeug.utils = werkzeug_utils
    sys.modules.update({"werkzeug": werkzeug, "werkzeug.utils": werkzeug_utils})
    return request, user, flask


class FakeApp:
    def __init__(self) -> None:
        self.before_hooks = []
        self.after_hooks = []

    def before_request(self, callback):
        self.before_hooks.append(callback)
        return callback

    def after_request(self, callback):
        self.after_hooks.append(callback)
        return callback


def main() -> None:
    request, user, _flask = install_module_stubs()
    spec = importlib.util.spec_from_file_location("ckanext.wajo_theme.plugin", PLUGIN_PATH)
    if spec is None or spec.loader is None:
        raise SystemExit("Tidak dapat memuat plugin Wajo untuk smoke test.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    app = FakeApp()
    plugin = module.WajoThemePlugin()
    wrapped_app = object()
    if plugin.make_error_log_middleware(wrapped_app, {}) is not wrapped_app:
        raise AssertionError("CKAN make_error_log_middleware must preserve the wrapped WSGI app.")
    print("PASS CKAN 2.12 IMiddleware error-log hook is implemented")

    geojson_resource = {"name": "batas-kecamatan.geojson", "format": "JSON"}
    plugin.before_resource_create({}, geojson_resource)
    if geojson_resource.get("format") != "GeoJSON":
        raise AssertionError("GeoJSON upload must be normalized before CKAN generates default resource views.")
    mime_resource = {"name": "batas-kecamatan.json", "mimetype": "application/geo+json"}
    plugin.before_resource_create({}, mime_resource)
    if mime_resource.get("format") != "GeoJSON":
        raise AssertionError("GeoJSON MIME type must be normalized before CKAN generates resource views.")
    existing_geojson = {"name": "batas-lama.geojson", "format": "JSON"}
    partial_update = {"description": "Metadata diperbarui"}
    plugin.before_resource_update({}, existing_geojson, partial_update)
    if partial_update.get("format") != "GeoJSON":
        raise AssertionError("Updating an existing .geojson resource must restore its canonical format.")
    plain_json = {"name": "statistik.json", "format": "JSON"}
    plugin.before_resource_create({}, plain_json)
    if plain_json.get("format") != "JSON":
        raise AssertionError("Ordinary JSON resources must not be reclassified as GeoJSON.")

    # Updating an old GeoJSON resource should invoke CKAN's default-view action
    # so missing geojson_view/geo_view records can be created without duplicates.
    geo_plugin = module.WajoThemePlugin()
    geo_plugin._notify_public_portal = lambda *args, **kwargs: None
    geo_plugin._enqueue_resource_preview = lambda *args, **kwargs: None
    default_view_calls = []
    toolkit = sys.modules["ckan.plugins.toolkit"]
    toolkit.get_action = lambda name: (
        lambda context, data: default_view_calls.append((name, context, data)) or []
    )
    geo_plugin.after_resource_update({}, {"id": "legacy-geojson", "format": "GeoJSON"})
    geo_plugin.after_resource_update({}, {"id": "ordinary-json", "format": "JSON"})
    if len(default_view_calls) != 1:
        raise AssertionError("Only GeoJSON edits should trigger CKAN's default map-view action.")
    action_name, action_context, action_data = default_view_calls[0]
    if action_name != "resource_create_default_resource_views" or action_context.get("ignore_auth") is not True:
        raise AssertionError("GeoJSON view repair must use CKAN's standard action with internal authorization.")
    if action_data.get("resource", {}).get("id") != "legacy-geojson":
        raise AssertionError("GeoJSON view repair must target the updated resource only.")
    print("PASS legacy GeoJSON updates backfill missing CKAN resource views via the standard Action API")
    print("PASS GeoJSON resources receive canonical format before CKAN default-view generation")

    media_auth = plugin.get_auth_functions().get("wajo_media_show")
    if not callable(media_auth) or media_auth({}, {"id": "public-editorial-media"}).get("success") is not True:
        raise AssertionError("Owner media editorial harus dapat dibaca melalui auth function khusus.")
    if media_auth({}, {"id": "arbitrary-owner"}).get("success") is not False:
        raise AssertionError("Owner media tidak boleh membuka owner lain.")
    print("PASS custom CKAN File API owner is narrowly scoped to public editorial media")

    # Verify CKAN's IFiles hook grants read/download only to the explicitly
    # transferred editorial owner and leaves all other owners to CKAN defaults.
    from types import SimpleNamespace
    allow_media = SimpleNamespace(owner_info=SimpleNamespace(
        owner_type="wajo_media", id="public-editorial-media"
    ))
    allow_media_orm = SimpleNamespace(owner=SimpleNamespace(
        owner_type="wajo_media", owner_id="public-editorial-media"
    ))
    reject_other_media = SimpleNamespace(owner=SimpleNamespace(
        owner_type="wajo_media", owner_id="another-owner"
    ))
    preserve_resource_permissions = SimpleNamespace(owner=SimpleNamespace(
        owner_type="resource", owner_id="resource-123"
    ))
    if plugin.files_file_allows({}, allow_media, "show") is not True:
        raise AssertionError("Download media editorial publik harus diizinkan melalui IFiles.")
    if plugin.files_file_allows({}, allow_media_orm, "show") is not True:
        raise AssertionError("Representasi owner ORM CKAN juga harus didukung.")
    if plugin.files_file_allows({}, allow_media, "edit") is not False:
        raise AssertionError("IFiles tidak boleh memberi izin edit untuk media editorial.")
    if plugin.files_file_allows({}, allow_media, "delete") is not False:
        raise AssertionError("IFiles tidak boleh memberi izin delete untuk media editorial.")
    if plugin.files_file_allows({}, reject_other_media, "show") is not False:
        raise AssertionError("IFiles tidak boleh membuka owner media selain public-editorial-media.")
    if plugin.files_file_allows({}, preserve_resource_permissions, "show") is not None:
        raise AssertionError("Izin resource biasa harus tetap mengikuti aturan bawaan CKAN.")
    print("PASS CKAN IFiles grants public editorial-media reads only; other owner policies remain unchanged")

    plugin.make_middleware(app, {
        "ckanext.wajo_theme.admin_host": "admin.example.test",
        "ckan.site_url": "https://data.example.test",
    })
    if len(app.before_hooks) != 1 or len(app.after_hooks) != 1:
        raise SystemExit("Middleware harus mendaftarkan satu before_request dan satu after_request hook.")
    before = app.before_hooks[0]
    after = app.after_hooks[0]

    def run_case(
        label: str,
        expected,
        *,
        host: str = "admin.example.test",
        path: str = "/",
        full_path: str | None = None,
        method: str = "GET",
        authenticated: bool = False,
        args: dict | None = None,
    ) -> None:
        request.host = host
        request.path = path
        request.full_path = full_path if full_path is not None else path
        request.method = method
        request.args = args or {}
        user.is_authenticated = authenticated
        actual = before()
        if actual != expected:
            raise AssertionError(f"{label}: hasil {actual!r}, diharapkan {expected!r}")
        print(f"PASS {label}")

    run_case("internal Next.js-to-CKAN API is not gated", None, host="ckan:5000", path="/api/3/action/package_search")
    run_case("public hostname is not gated", None, host="data.example.test", path="/dataset/public-data")
    run_case("anonymous visitor may open login", None, path="/user/login")
    run_case(
        "stale logout came_from is stripped before rendering login",
        ("REDIRECT", "/user/login"),
        path="/user/login",
        args={"came_from": "/user/logged_out_redirect"},
    )
    run_case(
        "anonymous logout confirmation goes to a clean login URL",
        ("REDIRECT", "/user/login"),
        path="/user/logged_out_redirect",
    )
    run_case("anonymous visitor may load CKAN base assets", None, path="/base/css/main.css")
    run_case("anonymous visitor may load Wajo logo", None, path="/logo-kabupaten-wajo.webp")
    run_case(
        "anonymous admin root opens login with Wajo overview return target",
        ("REDIRECT", "/user/login?came_from=/admin/"),
        path="/",
    )
    run_case(
        "anonymous CKAN page returns to login with requested path",
        ("REDIRECT", "/user/login?came_from=/dataset/example?sort=recent"),
        path="/dataset/example",
        full_path="/dataset/example?sort=recent",
    )
    run_case(
        "anonymous extension page returns to login",
        ("REDIRECT", "/user/login?came_from=/harvest"),
        path="/harvest",
    )
    run_case(
        "anonymous Action API gets JSON 401",
        (("JSON", {
            "success": False,
            "error": {
                "message": "Login diperlukan untuk mengakses CKAN Admin.",
                "__type": "Authorization Error",
            },
        }), 401),
        path="/api/3/action/package_search",
    )
    run_case("login POST remains available for form submission", None, path="/user/login", method="POST")
    run_case("authenticated dataset view is available", None, path="/dataset/example", authenticated=True)
    run_case("authenticated organization view is available", None, path="/organization/wajo", authenticated=True)
    run_case("authenticated extension route is available", None, path="/harvest", authenticated=True)
    run_case(
        "authenticated root opens Wajo Admin overview",
        ("REDIRECT", "/admin/"),
        path="/",
        authenticated=True,
    )
    run_case(
        "authenticated login route opens Wajo Admin overview",
        ("REDIRECT", "/admin/"),
        path="/user/login",
        authenticated=True,
    )
    run_case(
        "authenticated logout confirmation opens the Wajo Admin overview",
        ("REDIRECT", "/admin/"),
        path="/user/logged_out_redirect",
        authenticated=True,
    )

    # Exercise the custom dashboard blueprint with CKAN Action API stubs.
    import ckan.plugins.toolkit as toolkit
    xloader_calls = []

    def fake_action(action_name):
        def invoke(context, data):
            if action_name == "xloader_submit":
                xloader_calls.append((context, data))
                return True
            if action_name == "package_search" and data.get("rows") == 6:
                return {"count": 42, "results": [{"name": "dataset-terbaru", "title": "Dataset Terbaru"}]}
            if action_name == "package_search":
                return {"count": 7, "results": []}
            if action_name == "organization_list":
                return [{"name": "org-wajo"}]
            return [{"name": "kategori-wajo"}]
        return invoke

    toolkit.get_action = fake_action
    base_module = types.ModuleType("ckan.lib.base")
    dashboard_render = {}
    base_module.render = lambda template, extra_vars: dashboard_render.update({"template": template, "vars": extra_vars}) or "RENDERED"
    ckan_lib = types.ModuleType("ckan.lib")
    ckan_lib.__path__ = []
    ckan_lib.base = base_module
    sys.modules.update({"ckan.lib": ckan_lib, "ckan.lib.base": base_module})
    user.is_authenticated = True
    blueprint = module.WajoThemePlugin().get_blueprint()
    if blueprint.name != "wajo_admin" or blueprint.url_prefix != "/admin" or "/" not in blueprint.routes:
        raise AssertionError("Blueprint Wajo Admin harus mendaftarkan route /admin/.")
    if "/media/upload" not in blueprint.routes:
        raise AssertionError("Blueprint Wajo Admin harus mendaftarkan endpoint upload media editorial.")
    dashboard_response = blueprint.routes["/"]()
    if dashboard_response != "RENDERED" or dashboard_render.get("template") != "wajo_theme/dashboard.html":
        raise AssertionError("Route Wajo Admin tidak merender dashboard custom.")
    dashboard_vars = dashboard_render.get("vars", {})
    expected_stats = {"datasets": 42, "organizations": 1, "groups": 1, "my_datasets": 7}
    if dashboard_vars.get("wajo_admin_stats") != expected_stats:
        raise AssertionError(f"Statistik dashboard tidak sesuai: {dashboard_vars.get('wajo_admin_stats')!r}")
    if not dashboard_vars.get("wajo_admin_recent_datasets") or dashboard_vars["wajo_admin_recent_datasets"][0]["name"] != "dataset-terbaru":
        raise AssertionError("Dashboard harus menampilkan dataset terbaru dari Action API CKAN.")
    print("PASS Wajo Admin overview loads metrics and recent datasets from CKAN actions")

    if plugin.can_upload("resource-tabular") is not True:
        raise AssertionError("Wajo theme harus mengizinkan XLoader melanjutkan validasi format bawaannya.")
    plugin._enqueue_resource_preview({"user": "editor"}, {"id": "resource-tabular", "format": "CSV"})
    plugin._enqueue_resource_preview({"user": "editor"}, {"id": "resource-document", "format": "PDF"})
    if len(xloader_calls) != 1 or xloader_calls[0][1] != {"resource_id": "resource-tabular"}:
        raise AssertionError("Resource tabular harus mengantrekan XLoader dan format non-tabular tidak boleh dikirim.")
    if xloader_calls[0][0].get("ignore_auth") is not True:
        raise AssertionError("XLoader submit internal harus menggunakan konteks CKAN internal tanpa mengekspos token.")
    print("PASS tabular resource creation queues XLoader with internal CKAN context")

    class Response:
        def __init__(self, location: str = "") -> None:
            self.headers = {"Location": location} if location else {}
            self.status_code = 200

    request.host = "admin.example.test"
    request.path = "/user/logout"
    user.is_authenticated = False
    logout_response = after(Response())
    if logout_response.status_code != 303 or logout_response.headers.get("Location") != "/user/login":
        raise AssertionError("Logout harus mengarah ke login dengan PRG 303.")
    if logout_response.headers.get("Cache-Control", "").find("no-store") < 0:
        raise AssertionError("Respons logout tidak boleh disimpan di cache.")
    print("PASS logout ends with a clean, uncached login redirect")
    request.path = "/user/logged_out_redirect"
    user.is_authenticated = True
    logged_out_response = after(Response())
    if logged_out_response.status_code != 303 or logged_out_response.headers.get("Location") != "/admin/":
        raise AssertionError("Logged-out redirect must never replay the logout confirmation for an authenticated user.")
    if logged_out_response.headers.get("Cache-Control", "").find("no-store") < 0:
        raise AssertionError("Logged-out redirect must not be cached.")
    print("PASS stale logged_out_redirect is replaced by the authenticated dashboard")
    request.path = "/user/login"
    user.is_authenticated = True
    response = Response("https://data.example.test/user/login?came_from=%2Fdashboard%2Fdatasets")
    after(response)
    expected_location = "https://admin.example.test/user/login?came_from=%2Fdashboard%2Fdatasets"
    if response.headers.get("Location") != expected_location:
        raise AssertionError(f"Redirect login tidak dilokalkan ke CKAN_HOST: {response.headers!r}")
    print("PASS CKAN_SITE_URL redirect is localized to CKAN_HOST")

    external = Response("https://identity.example.org/oauth/authorize")
    after(external)
    if external.headers.get("Location") != "https://identity.example.org/oauth/authorize":
        raise AssertionError("Redirect ke domain eksternal tidak boleh ditulis ulang.")
    print("PASS external identity-provider redirect remains unchanged")

    relative = Response("/dashboard/datasets")
    after(relative)
    if relative.headers.get("Location") != "/dashboard/datasets":
        raise AssertionError("Redirect relatif tidak boleh diubah.")
    print("PASS relative CKAN redirects remain unchanged")
    print("CKAN admin auth and dashboard smoke test passed (expanded logout came_from regression assertions).")


# Logout must finish with a clean login redirect and prevent cached auth screens.
plugin_source = (ROOT / "deploy/ckan/theme/ckanext/wajo_theme/plugin.py").read_text()
assert 'path in {"/user/logout", "/user/logged_out_redirect"}' in plugin_source
assert 'stale_logout_target' in plugin_source
assert 'response.status_code = 303' in plugin_source
assert 'response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"' in plugin_source

if __name__ == "__main__":
    main()

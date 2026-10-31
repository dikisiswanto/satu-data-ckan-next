import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const route = await readFile(
  "src/app/(public)/dataset/[slug]/resource/[resourceId]/download/[filename]/route.js",
  "utf8",
);
const caddyFiles = [
  "deploy/ckan/Caddyfile",
  "deploy/ckan/Caddyfile.basic-auth",
  "deploy/ckan/Caddyfile.tunnel",
  "deploy/ckan/Caddyfile.tunnel.access",
  "deploy/ckan/Caddyfile.tunnel.basic-auth",
];
assert.match(route, /resource_show/);
assert.match(route, /package_show/);
assert.match(route, /dataset\.private === true/);
assert.match(route, /publicResource\.private === true/);
assert.match(route, /redirect:\s*"manual"/);
assert.match(route, /Range/);
assert.match(route, /Content-Disposition/);
assert.match(
  route,
  /sourceFilename !== requestedFilename/,
  "Download filename must match the CKAN resource path.",
);
assert.match(route, /CKAN_API_INTERNAL_URL/);
assert.match(
  route,
  /upstreamStatus === 403 \|\| upstreamStatus === 404/,
  "Private/unpublished dataset metadata must become a quiet public 404, not a 502 stream failure.",
);
assert.match(route, /Dataset atau resource tidak tersedia untuk publik/);
assert.match(route, /text\/html/);
const exampleDownloadPath =
  "/dataset/9c70ae22-cd50-4e14-8887-d7574abfface/resource/3c2e4f10-6c61-4a2c-a3db-b96db879889c/download/menara-telekomunikasi-di-kabupaten-wajo-tahun-2025.xlsx";
const expectedCaddyPattern =
  /^\/dataset\/[^/]+\/resource\/[a-fA-F0-9-]{16,64}\/download\/[^/]+\/?$/;
assert.match(
  exampleDownloadPath,
  expectedCaddyPattern,
  "The production XLSX example must match the explicit download route.",
);
for (const file of caddyFiles) {
  const source = await readFile(file, "utf8");
  assert.match(
    source,
    /@publicResourceDownload path_regexp/,
    `${file} must route public resource downloads to Next.js explicitly`,
  );
  assert.match(
    source,
    /handle @publicResourceDownload[\s\S]*reverse_proxy nextjs:3000/,
  );
  assert.match(
    source,
    /@ckanResourceView path_regexp[\s\S]*reverse_proxy https:\/\/nginx:443/,
    `${file}: CKAN ResourceView iframe must bypass Next.js X-Frame-Options`,
  );
  assert.ok(
    source.includes("(view/[^/]+|preview|embed)"),
    `${file}: CKAN view, preview and embed routes must all reach CKAN`,
  );
  assert.ok(
    source.includes(
      "@adminResourceView path_regexp adminResourceView ^/dataset/[^/]+/resource/[^/]+/(view/[^/]+|preview|embed)/?$",
    ),
    `${file}: admin-host CKAN preview endpoints must retain the same iframe policy`,
  );
  assert.doesNotMatch(
    source,
    /\(\?:/,
    `${file}: Caddy uses Go RE2; non-capturing groups are unsupported`,
  );
  assert.match(
    source,
    /header_down -X-Frame-Options[\s\S]*frame-ancestors \'self\' https:\/\/\{\$CKAN_HOST\} https:\/\/\{\$PUBLIC_HOST\}/,
    `${file}: ResourceView must allow only the first-party CKAN and portal parent frames`,
  );
  assert.match(
    source,
    /@ckanViewerAssets path \/webassets\/\* \/base\/\*/,
    `${file}: CKAN viewer assets must be served by CKAN`,
  );
  assert.match(
    source,
    /@ckanResourceProxy path \/api\/3\/action\/resource_proxy[\s\S]*reverse_proxy https:\/\/nginx:443/,
    `${file}: GeoView resource_proxy Action API must reach CKAN`,
  );
  assert.match(
    source,
    /\[a-fA-F0-9-\]\{16,64\}\/download/,
    `${file} must match UUID resources including the reported XLSX URL`,
  );
}
const publicData = await readFile("src/lib/data/public.js", "utf8");
assert.match(
  publicData,
  /error\?\.status === 403 \|\| error\?\.status === 404/,
  "An unpublished/private package must be treated as not found on public dataset detail pages.",
);
const publicActionRoute = await readFile(
  "src/app/api/3/action/[...action]/route.js",
  "utf8",
);
assert.match(publicActionRoute, /async function getPublicRecord/);
assert.match(
  publicActionRoute,
  /error\?\.status === 403 \|\| error\?\.status === 404/,
  "The public CKAN Action facade must normalize private record permission errors to 404.",
);
const genericFileProxy = await readFile(
  "src/app/api/public/ckan-file/[fileId]/route.js",
  "utf8",
);
assert.match(genericFileProxy, /file_show/);
assert.match(genericFileProxy, /resource_show/);
assert.match(genericFileProxy, /package_show/);
assert.match(genericFileProxy, /ownerType === "wajo_media"/);
assert.match(genericFileProxy, /private !== true/);
assert.match(
  genericFileProxy,
  /new URL\(\`\/file\/download\/\$\{encodeURIComponent\(fileId\)\}\`, internalOrigin\)/,
  "Generic CKAN file proxy must use CKAN 2.12 /file/download/<id>.",
);
assert.doesNotMatch(
  genericFileProxy,
  /new URL\(\`\/file\/\$\{encodeURIComponent\(fileId\)\}/,
  "Legacy /file/<id> route must not be used.",
);
assert.match(genericFileProxy, /redirect:\s*"manual"/);
assert.match(genericFileProxy, /Range/);
assert.match(route, /genericFileMatch/);
assert.match(route, /file_show/);
assert.match(route, /file\/download/);
const editorialProxy = await readFile(
  "src/app/api/editorial-media/[fileId]/route.js",
  "utf8",
);
assert.match(editorialProxy, /file\/download/);
assert.doesNotMatch(
  editorialProxy,
  /new URL\(\`\/file\/\$\{encodeURIComponent\(fileId\)\}/,
);
const sidebar = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/wajo_theme/sidebar.html",
  "utf8",
);
assert.doesNotMatch(
  sidebar,
  /ckanext_pages_create/,
  "The unregistered ckanext_pages_create action must not be called.",
);
assert.match(
  sidebar,
  /check_access\('ckanext_pages_update'\)/,
  "Pages create links must use the registered Pages update authorization function.",
);
assert.match(sidebar, /h\.url_for\('pages\.new'\)/);
assert.match(sidebar, /h\.url_for\('pages\.blog_new'\)/);
assert.match(genericFileProxy, /imageSignatureMatches/);
assert.match(genericFileProxy, /image\/svg\+xml/);
const publicResourceUrls = await readFile(
  "src/lib/ckan/public-resource-url.js",
  "utf8",
);
assert.match(publicResourceUrls, /api\/public\/ckan-file/);
assert.match(publicResourceUrls, /publicGroupMatch/);

const editor = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/public/wajo-markdown-editor.js",
  "utf8",
);
assert.match(editor, /Tabel/);
assert.match(editor, /Pratinjau/);
assert.match(editor, /Unggah gambar/);
assert.match(editor, /fetch\("\/admin\/media\/upload"/);
assert.match(
  editor,
  /MutationObserver/,
  "Late-rendered Pages/News textareas must still receive a Markdown preview control.",
);
assert.match(editor, /textarea\[name='body'\]/);
const base = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/templates/base.html",
  "utf8",
);
assert.match(base, /wajo-markdown-editor\.js/);
const csrf = /wajo-media-csrf[\s\S]*csrf_input/;
assert.match(
  base,
  csrf,
  "The Markdown media uploader must reuse CKAN's native CSRF token.",
);
const css = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css",
  "utf8",
);
assert.match(css, /wajo-login-frame.*460px/);
assert.match(css, /input\[type="file"\]::file-selector-button/);
assert.match(css, /wajo-file-preview/);

const sessionHelper = await readFile("src/lib/ckan/session.js", "utf8");
assert.match(sessionHelper, /CKAN_SESSION_COOKIE_NAME/);
assert.match(sessionHelper, /getCkanSessionCookieValue/);
assert.match(sessionHelper, /buildCkanSessionCookieHeader/);
assert.match(sessionHelper, /normalizeCkanSessionCookieValue/);
const ckanClient = await readFile("src/lib/ckan/client.js", "utf8");
assert.match(ckanClient, /buildCkanSessionCookieHeader/);
assert.match(ckanClient, /NEVER_CACHE_ACTIONS = new Set\(/);
for (const action of [
  "package_search",
  "package_show",
  "package_activity_list",
  "resource_show",
  "file_show",
  "datastore_search",
]) {
  assert.match(ckanClient, new RegExp(`"${action}"`));
}
assert.match(
  ckanClient,
  /effectiveRevalidate = forwardedSession \|\| NEVER_CACHE_ACTIONS\.has\(action\) \? 0 : revalidate/,
);
const datasetPage = await readFile(
  "src/app/(public)/dataset/[slug]/page.jsx",
  "utf8",
);
assert.match(datasetPage, /from "next\/headers"/);
assert.match(datasetPage, /CKAN_SESSION_COOKIE_NAME/);
assert.match(
  datasetPage,
  /getPublishedDatasetBySlugResult\(slug, sessionCookie\)/,
);
assert.match(datasetPage, /export const dynamic = "force-dynamic"/);
const publicDatasetLoader = await readFile("src/lib/data/public.js", "utf8");
assert.match(
  publicDatasetLoader,
  /if \(!sessionCookie\) return getCachedPublicDatasetBySlugResult/,
);
assert.match(publicDatasetLoader, /revalidate: 0, sessionCookie/);
const sessionAwarePublicActionRoute = await readFile(
  "src/app/api/3/action/[...action]/route.js",
  "utf8",
);
assert.match(sessionAwarePublicActionRoute, /getCkanSessionCookieFromRequest/);
assert.match(sessionAwarePublicActionRoute, /requireViewerPackage/);
assert.match(sessionAwarePublicActionRoute, /requireViewerResource/);
assert.match(sessionAwarePublicActionRoute, /private, no-store/);
const publicSanitizer = await readFile(
  "src/lib/ckan/public-api-sanitize.js",
  "utf8",
);
assert.match(publicSanitizer, /includePrivateResources = false/);
const viewerPackage = await readFile("src/lib/ckan/viewer-package.js", "utf8");
assert.match(viewerPackage, /resource_show/);
assert.match(viewerPackage, /sessionCookie/);
assert.match(
  viewerPackage,
  /error\?\.status === 403 \|\| error\?\.status === 404/,
);
assert.match(publicDatasetLoader, /resolveAuthorizedPackageResources/);
assert.match(
  sessionAwarePublicActionRoute,
  /resolveAuthorizedPackageResources/,
);
assert.match(
  sessionAwarePublicActionRoute,
  /if \(action === "package_search" && sessionCookie\) params\.include_private = true/,
);
assert.match(
  sessionAwarePublicActionRoute,
  /ckanAction\(action, params, \{ revalidate: 0, sessionCookie \}\)/,
  "CKAN package_search must receive the exact signed browser session with include_private.",
);
assert.match(
  sessionAwarePublicActionRoute,
  /getViewerRecord\("package_show", \{ id: identifier \}, sessionCookie\)/,
  "Private package details must be authorized by CKAN for the exact forwarded user session.",
);
const previewRoute = await readFile(
  "src/app/api/public/resource-preview/route.js",
  "utf8",
);
assert.match(previewRoute, /getCkanSessionCookieFromRequest/);
assert.match(previewRoute, /buildCkanSessionCookieHeader/);
const clientFileRoute = await readFile(
  "src/app/api/public/ckan-file/[fileId]/route.js",
  "utf8",
);
assert.match(clientFileRoute, /verifyFileOwner/);
assert.match(clientFileRoute, /getCkanSessionCookieFromRequest/);
assert.match(clientFileRoute, /private, no-store/);
const envSync = await readFile("deploy/ckan/sync-env.py", "utf8");
assert.match(envSync, /CKAN___SESSION_COOKIE_DOMAIN/);
assert.match(envSync, /CKAN___SESSION_COOKIE_SECURE/);
assert.match(envSync, /CKAN_SESSION_COOKIE_NAME.*cookie_name/);
assert.match(envSync, /wajo_ckan_session/);
assert.match(envSync, /must share the same parent DNS zone/);
const envExample = await readFile(".env.ckan.example", "utf8");
assert.match(envExample, /^CKAN_SESSION_COOKIE_NAME=wajo_ckan_session$/m);
const composeOverride = await readFile(
  "deploy/ckan/docker-compose.override.yml",
  "utf8",
);
assert.match(
  composeOverride,
  /CKAN_SESSION_COOKIE_NAME: \$\{CKAN_SESSION_COOKIE_NAME\}/,
);

process.stdout.write(
  "Public resource download, session-aware CKAN permissions, admin Markdown, CSRF and file input design contracts passed.\n",
);

const bootstrap = await readFile("deploy/ckan/bootstrap-upstream.sh", "utf8");
assert.match(bootstrap, /CKANEXT__SPATIAL__COMMON_MAP__TYPE.*custom/);
assert.match(
  bootstrap,
  /CKANEXT__SPATIAL__COMMON_MAP__CUSTOM__URL.*tile\.openstreetmap\.org/,
);
assert.doesNotMatch(
  bootstrap,
  /values\["CKANEXT__SPATIAL__COMMON_MAP__CUSTOM_URL"\]\s*=/,
);
assert.match(
  bootstrap,
  /legacy_map_url_key = "CKANEXT__SPATIAL__COMMON_MAP__CUSTOM_URL"[\s\S]*values\.pop\(legacy_map_url_key, None\)/,
);
const envExampleMap = await readFile(".env.ckan.example", "utf8");
assert.match(
  envExampleMap,
  /^CKANEXT__SPATIAL__COMMON_MAP__CUSTOM__URL=https:\/\/tile\.openstreetmap\.org/m,
);
assert.doesNotMatch(envExampleMap, /CKANEXT__SPATIAL__COMMON_MAP__CUSTOM_URL/);
const geoPreview = await readFile(
  "src/components/geojson-resource-preview.jsx",
  "utf8",
);
assert.match(geoPreview, /createGeoMapLayout/);
assert.match(geoPreview, /mapLayout\.tiles\.map/);
assert.match(
  geoPreview,
  /credentials: "same-origin"/,
  "An authorized CKAN session must be sent when the GeoJSON preview loads a private resource",
);
const geoCss = await readFile(
  "deploy/ckan/theme/ckanext/wajo_theme/assets/css/wajo-admin-design-system.css",
  "utf8",
);
assert.match(geoCss, /format-label\[data-format="geojson" i\]::before/);

const datasetCard = await readFile("src/components/dataset-card.jsx", "utf8");
assert.match(datasetCard, /isGeoJSONResource/);
assert.match(datasetCard, /bg-emerald-50[^\n]*text-emerald-900/);
assert.match(datasetCard, /GeoJSON/);

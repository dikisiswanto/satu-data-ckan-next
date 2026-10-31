import { ckanAction } from "@/lib/ckan/client";
import { rewriteCkanDownloadUrls } from "@/lib/ckan/public-resource-url";
import {
  sanitizePublicActivity,
  sanitizePublicPackage,
  sanitizePublicSearchResult,
} from "@/lib/ckan/public-api-sanitize";
import { getCkanSessionCookieFromRequest } from "@/lib/ckan/session";
import { resolveAuthorizedPackageResources } from "@/lib/ckan/viewer-package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set([
  "status_show",
  "package_search",
  "package_show",
  "package_activity_list",
  "organization_list",
  "organization_show",
  "group_list",
  "group_show",
  "tag_list",
  "resource_show",
  // CKAN 2.12 adds a first-class File API; permission checks remain in CKAN.
  "file_show",
  "datastore_search",
]);
const HELP_BASE = "https://docs.ckan.org/en/2.12/api/index.html";
// Metadata and tabular responses can contain recently-public records. Do not
// retain them in route/CDN caches where CKAN visibility changes cannot purge it.
const VISIBILITY_SENSITIVE_ACTIONS = new Set([
  "package_search",
  "package_show",
  "package_activity_list",
  "resource_show",
  "file_show",
  "datastore_search",
]);

function getAllowedOrigins() {
  const configured =
    process.env.PUBLIC_API_CORS_ORIGINS ||
    process.env.PUBLIC_SITE_ORIGIN ||
    "https://data.wajokab.go.id";
  return new Set(
    configured
      .split(",")
      .map((entry) => {
        try {
          const origin = new URL(entry.trim()).origin;
          return /^https?:$/.test(new URL(origin).protocol) ? origin : "";
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );
}

function responseHeaders(request, { cache = true } = {}) {
  const requestOrigin = request.headers.get("origin");
  const authenticated = Boolean(getCkanSessionCookieFromRequest(request));
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    // An authenticated response can contain private CKAN metadata. Never let
    // Next.js, a reverse proxy or Cloudflare reuse it for an anonymous request.
    "Cache-Control":
      cache && !authenticated
        ? "public, max-age=0, s-maxage=5, stale-while-revalidate=5"
        : "private, no-store",
    Vary: authenticated ? "Origin, Cookie" : "Origin",
  };
  if (requestOrigin && getAllowedOrigins().has(requestOrigin)) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
    headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Accept, Content-Type";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}
function actionEnvelope(action, result) {
  return {
    help: `${HELP_BASE}#ckan.logic.action.get.${action}`,
    success: true,
    result,
  };
}
function errorEnvelope(action, message, type) {
  return {
    help: `${HELP_BASE}#ckan.logic.action.get.${action}`,
    success: false,
    error: { message, __type: type },
  };
}
function positiveInt(value, fallback, max) {
  if (value == null || value === "") return fallback;
  if (!/^(0|[1-9]\d*)$/.test(String(value))) {
    throw Object.assign(
      new Error("Parameter numerik harus berupa bilangan bulat non-negatif."),
      {
        status: 400,
        type: "Validation Error",
      },
    );
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw Object.assign(
      new Error("Parameter numerik berada di luar rentang yang didukung."),
      {
        status: 400,
        type: "Validation Error",
      },
    );
  }
  return Math.min(number, max);
}
function boolValue(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  throw Object.assign(
    new Error(
      "Nilai boolean harus salah satu dari true/false, 1/0, atau yes/no.",
    ),
    {
      status: 400,
      type: "Validation Error",
    },
  );
}
function assertAllowedParams(searchParams, allowed) {
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      throw Object.assign(
        new Error(`Parameter '${key}' tidak tersedia pada API publik.`),
        {
          status: 400,
          type: "Validation Error",
        },
      );
    }
    if (searchParams.getAll(key).length > 1) {
      throw Object.assign(
        new Error(`Parameter '${key}' tidak boleh diulang.`),
        {
          status: 400,
          type: "Validation Error",
        },
      );
    }
  }
}

function safeSearchSort(value) {
  if (value == null || value === "") return "metadata_modified desc";
  const sort = String(value).trim().toLowerCase();
  const allowed = new Set([
    "id asc",
    "id desc",
    "name asc",
    "name desc",
    "metadata_modified asc",
    "metadata_modified desc",
  ]);
  if (!allowed.has(sort)) {
    throw Object.assign(
      new Error(
        "Nilai sort tidak didukung. Gunakan id asc, id desc, name asc/desc, atau metadata_modified asc/desc.",
      ),
      {
        status: 400,
        type: "Validation Error",
      },
    );
  }
  return sort;
}

/**
 * Minimal fq subset for CKAN Harvester compatibility. Only organization/group
 * slugs and a metadata_modified lower-bound range are allowed; arbitrary Solr
 * field queries, local params, parentheses, boosts and wildcards are rejected.
 */
function safeHarvestFilter(value) {
  if (value == null || value === "") return undefined;
  const query = String(value).trim();
  if (query.length > 1000) {
    throw Object.assign(new Error("Parameter fq terlalu panjang."), {
      status: 400,
      type: "Validation Error",
    });
  }
  const tokenPattern =
    /metadata_modified:\[[0-9T:.+\-Z]+ TO \*\]|-?(?:organization|groups):[A-Za-z0-9][A-Za-z0-9_-]*|OR/g;
  const tokens = query.match(tokenPattern) || [];
  if (!tokens.length || query.replace(tokenPattern, "").trim() !== "") {
    throw Object.assign(
      new Error(
        "Parameter fq hanya mendukung filter organization, groups, dan rentang metadata_modified yang digunakan harvester CKAN.",
      ),
      {
        status: 400,
        type: "Validation Error",
      },
    );
  }
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] !== "OR") continue;
    const left = tokens[index - 1] || "";
    const right = tokens[index + 1] || "";
    const leftField = left.match(/^-?(organization|groups):/i)?.[1];
    const rightField = right.match(/^-?(organization|groups):/i)?.[1];
    if (
      !leftField ||
      !rightField ||
      leftField !== rightField ||
      index === 0 ||
      index === tokens.length - 1
    ) {
      throw Object.assign(
        new Error(
          "Operator OR hanya boleh menghubungkan filter organization atau groups dengan field yang sama.",
        ),
        {
          status: 400,
          type: "Validation Error",
        },
      );
    }
  }
  return query;
}

function safeSearchQuery(value) {
  const query = String(value || "*:*").trim();
  if (query === "*:*") return query;
  if (query.length <= 160 && /^[\p{L}\p{N}\s_.,'-]+$/u.test(query))
    return `"${query}"`;
  throw Object.assign(
    new Error(
      "Parameter q harus berupa kata/frasa biasa; sintaks Lucene/Solr lanjutan tidak tersedia pada API publik.",
    ),
    {
      status: 400,
      type: "Validation Error",
    },
  );
}

function notPublicRecord(
  message = "Dataset atau resource tidak tersedia untuk akses publik.",
) {
  return Object.assign(new Error(message), { status: 404, type: "Not Found" });
}

function isPublicPackage(pkg) {
  return Boolean(
    pkg && pkg.private !== true && (!pkg.state || pkg.state === "active"),
  );
}

async function getPublicRecord(action, params) {
  try {
    return await ckanAction(action, params, { revalidate: 0 });
  } catch (error) {
    // Anonymous callers get an indistinguishable 404 for private/unpublished
    // records. CKAN itself remains the authority for authenticated access.
    if (error?.status === 403 || error?.status === 404) throw notPublicRecord();
    throw error;
  }
}

async function getViewerRecord(action, params, sessionCookie) {
  try {
    return await ckanAction(action, params, { revalidate: 0, sessionCookie });
  } catch (error) {
    // A valid CKAN session can read a private record only when CKAN authorizes
    // that exact user. Expired/forged sessions and users without permission
    // remain hidden behind the same not-found response as anonymous visitors.
    if (error?.status === 403 || error?.status === 404) throw notPublicRecord();
    throw error;
  }
}

function isActiveRecord(record) {
  return Boolean(record && (!record.state || record.state === "active"));
}

async function requireViewerPackage(identifier, sessionCookie) {
  if (!identifier) throw notPublicRecord();
  if (sessionCookie) {
    const pkg = await getViewerRecord(
      "package_show",
      { id: identifier },
      sessionCookie,
    );
    if (!isActiveRecord(pkg)) throw notPublicRecord();
    // Do not reject `private: true` here: successful package_show with the
    // forwarded, signed CKAN session means CKAN authorized this user.
    return pkg;
  }
  const pkg = await getPublicRecord("package_show", { id: identifier });
  if (!isPublicPackage(pkg)) throw notPublicRecord();
  return pkg;
}

async function requireViewerResource(identifier, sessionCookie) {
  if (!identifier) throw notPublicRecord();
  const resource = sessionCookie
    ? await getViewerRecord("resource_show", { id: identifier }, sessionCookie)
    : await getPublicRecord("resource_show", { id: identifier });
  if (
    !isActiveRecord(resource) ||
    (!sessionCookie && resource.private === true)
  ) {
    throw notPublicRecord();
  }
  const packageIdentifier = resource.package_id || resource.package_name;
  if (!packageIdentifier) throw notPublicRecord();
  await requireViewerPackage(packageIdentifier, sessionCookie);
  return resource;
}

function buildActionParams(action, searchParams) {
  const get = (key) => searchParams.get(key) || undefined;
  const assert = (allowed) =>
    assertAllowedParams(searchParams, new Set(allowed));
  switch (action) {
    case "status_show":
      assert([]);
      return {};
    case "package_search": {
      // Also support the constrained parameters used by ckanext-harvest's
      // standard remote CKAN harvester: stable paging sort and incremental fq.
      assertAllowedParams(
        searchParams,
        new Set(["q", "rows", "start", "facets", "sort", "fq"]),
      );
      const params = {
        q: safeSearchQuery(get("q") || "*:*"),
        rows: positiveInt(get("rows"), 20, 100),
        start: positiveInt(get("start"), 0, 1_000_000),
        sort: safeSearchSort(get("sort")),
        include_private: false,
      };
      const fq = safeHarvestFilter(get("fq"));
      if (fq) params.fq = fq;
      if (boolValue(get("facets"), false)) {
        params["facet.field"] = [
          "groups",
          "organization",
          "res_format",
          "extras_portal_reference_period",
        ];
        params["facet.limit"] = 100;
        params["facet.mincount"] = 1;
      }
      return params;
    }
    case "package_show":
      assert(["id"]);
      return { id: get("id") };
    case "package_activity_list": {
      // include_data=true tidak tersedia pada API publik: Activity data may
      // contain internal snapshots that are not needed by the public timeline.
      assert(["id", "offset", "limit"]);
      return {
        id: get("id"),
        offset: positiveInt(get("offset"), 0, 100_000),
        limit: positiveInt(get("limit"), 8, 31),
        // Never expose hidden activity records through the public facade.
        include_hidden_activity: false,
      };
    }
    case "organization_list":
      assert(["all_fields", "include_dataset_count", "limit"]);
      return {
        all_fields: boolValue(get("all_fields"), true),
        include_dataset_count: boolValue(get("include_dataset_count"), true),
        include_extras: false,
        include_users: false,
        limit: positiveInt(get("limit"), 1000, 1000),
      };
    case "organization_show":
      assert(["id"]);
      return {
        id: get("id"),
        include_dataset_count: true,
        include_datasets: false,
        include_extras: false,
        include_users: false,
      };
    case "group_list":
      assert(["all_fields"]);
      return { all_fields: boolValue(get("all_fields"), true) };
    case "group_show":
      assert(["id"]);
      return { id: get("id") };
    case "tag_list":
      assert(["query", "all_fields"]);
      return {
        query: get("query"),
        all_fields: boolValue(get("all_fields"), false),
      };
    case "resource_show":
    case "file_show":
      assert(["id"]);
      return { id: get("id") };
    case "datastore_search": {
      // The public facade stays narrower than CKAN's full DataStore query API:
      // no free-form filters, q, sort, or field projections are forwarded.
      assertAllowedParams(
        searchParams,
        new Set(["resource_id", "limit", "offset"]),
      );
      const resourceId = get("resource_id");
      if (!resourceId)
        throw Object.assign(new Error("Parameter resource_id wajib diisi."), {
          status: 400,
          type: "Validation Error",
        });
      return {
        resource_id: resourceId,
        limit: positiveInt(get("limit"), 10, 100),
        offset: positiveInt(get("offset"), 0, 100_000),
      };
    }
    default:
      return {};
  }
}

export async function OPTIONS(request, context) {
  const routeParams = await context?.params;
  const segments = routeParams?.action || [];
  const action = segments.join("/");
  if (segments.length !== 1 || !ACTIONS.has(action)) {
    return Response.json(
      errorEnvelope(
        action || "unknown",
        "Action tidak tersedia pada API publik read-only.",
        "Not Found",
      ),
      {
        status: 404,
        headers: responseHeaders(request, { cache: false }),
      },
    );
  }
  return new Response(null, { status: 204, headers: responseHeaders(request) });
}

export async function GET(request, { params }) {
  const { action: segments = [] } = await params;
  const action = segments.join("/");
  if (segments.length !== 1 || !ACTIONS.has(action)) {
    return Response.json(
      errorEnvelope(
        action || "unknown",
        "Action tidak tersedia pada API publik read-only.",
        "Not Found",
      ),
      {
        status: 404,
        headers: responseHeaders(request, { cache: false }),
      },
    );
  }

  const sessionCookie = getCkanSessionCookieFromRequest(request);
  try {
    const params = buildActionParams(action, new URL(request.url).searchParams);
    // Include private datasets only for a browser carrying the CKAN session.
    // CKAN still authorizes every returned record for that exact user; the
    // anonymous public facade never receives this flag.
    if (action === "package_search" && sessionCookie)
      params.include_private = true;
    if (
      [
        "package_show",
        "package_activity_list",
        "organization_show",
        "group_show",
        "resource_show",
        "file_show",
      ].includes(action) &&
      !params.id
    ) {
      return Response.json(
        errorEnvelope(action, "Parameter id wajib diisi.", "Validation Error"),
        {
          status: 400,
          headers: responseHeaders(request, { cache: false }),
        },
      );
    }
    let result;
    if (action === "package_search") {
      // A private dataset is visible only when CKAN itself accepts this exact
      // signed browser session. Forward the cookie alongside include_private;
      // setting include_private without the cookie silently behaves like an
      // anonymous search and is the cause of private datasets disappearing.
      const searchResult = await ckanAction(action, params, {
        revalidate: 0,
        sessionCookie,
      });
      const searchRows = Array.isArray(searchResult?.results)
        ? searchResult.results
        : [];
      const authorizedRows = sessionCookie
        ? await Promise.all(
            searchRows.map((pkg) =>
              resolveAuthorizedPackageResources(pkg, sessionCookie),
            ),
          )
        : searchRows;
      result = sanitizePublicSearchResult(
        { ...searchResult, results: authorizedRows },
        { includePrivateResources: Boolean(sessionCookie) },
      );
    } else if (action === "package_show") {
      const pkg = await requireViewerPackage(params.id, sessionCookie);
      const visiblePkg = await resolveAuthorizedPackageResources(
        pkg,
        sessionCookie,
      );
      result = sanitizePublicPackage(visiblePkg, {
        includePrivateResources: Boolean(sessionCookie),
      });
    } else if (action === "package_activity_list") {
      // The same URL works for public and private datasets. CKAN checks the
      // forwarded browser session before returning activity for private data.
      await requireViewerPackage(params.id, sessionCookie);
      result = sanitizePublicActivity(
        await ckanAction(action, params, { revalidate: 0, sessionCookie }),
      );
    } else if (action === "resource_show") {
      result = await requireViewerResource(params.id, sessionCookie);
    } else if (action === "file_show") {
      result = await getViewerRecord(action, params, sessionCookie);
      if (
        !isActiveRecord(result) ||
        (!sessionCookie && result.private === true)
      )
        throw notPublicRecord();
      const resourceId = result.resource_id || result.resource?.id;
      if (resourceId) await requireViewerResource(resourceId, sessionCookie);
      else if (result.package_id)
        await requireViewerPackage(result.package_id, sessionCookie);
      else throw notPublicRecord();
    } else if (action === "datastore_search") {
      await requireViewerResource(params.resource_id, sessionCookie);
      result = await ckanAction(action, params, {
        revalidate: 0,
        sessionCookie,
      });
    } else if (action === "group_show") {
      // Keep a public group response to metadata only; dataset records use their
      // own visibility checks and do not need to be embedded in this response.
      result = await ckanAction(action, { ...params, include_datasets: false });
    } else {
      result = await ckanAction(action, params);
    }
    // Keep CKAN-native result fields, but ensure download links expose only the
    // intended public origin instead of an internal/protected administration host.
    const publicResult = rewriteCkanDownloadUrls(result);
    return Response.json(actionEnvelope(action, publicResult), {
      status: 200,
      headers: responseHeaders(request, {
        cache: !VISIBILITY_SENSITIVE_ACTIONS.has(action),
      }),
    });
  } catch (error) {
    const status = [400, 403, 404, 409, 422].includes(Number(error?.status))
      ? Number(error.status)
      : 502;
    const message =
      status === 502
        ? "Katalog CKAN sementara tidak dapat diakses."
        : status === 403
          ? "Aksi atau berkas ini tidak dapat diakses dengan izin publik CKAN."
          : error.message;
    const errorType =
      status === 404
        ? "Not Found"
        : status === 400 || status === 422
          ? "Validation Error"
          : status === 403
            ? "Authorization Error"
            : "CKAN Upstream Error";
    return Response.json(errorEnvelope(action, message, errorType), {
      status,
      headers: responseHeaders(request, { cache: false }),
    });
  }
}

export const HEAD = GET;

import { ckanAction } from "@/lib/ckan/client";
import { rewriteCkanDownloadUrls } from "@/lib/ckan/public-resource-url";
import {
  sanitizePublicActivity,
  sanitizePublicPackage,
  sanitizePublicSearchResult,
} from "@/lib/ckan/public-api-sanitize";

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
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Cache-Control": cache
      ? "public, max-age=0, s-maxage=30, stale-while-revalidate=60"
      : "no-store",
    Vary: "Origin",
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

async function requirePublicPackage(identifier) {
  if (!identifier) throw notPublicRecord();
  const pkg = await ckanAction(
    "package_show",
    { id: identifier },
    { revalidate: 0 },
  );
  if (!isPublicPackage(pkg)) throw notPublicRecord();
  return pkg;
}

async function requirePublicResource(identifier) {
  if (!identifier) throw notPublicRecord();
  const resource = await ckanAction(
    "resource_show",
    { id: identifier },
    { revalidate: 0 },
  );
  if (
    !resource ||
    resource.private === true ||
    (resource.state && resource.state !== "active")
  ) {
    throw notPublicRecord();
  }
  const packageIdentifier = resource.package_id || resource.package_name;
  if (!packageIdentifier) throw notPublicRecord();
  await requirePublicPackage(packageIdentifier);
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
      assert(["id", "include_data"]);
      if (boolValue(get("include_data"), false)) {
        throw Object.assign(
          new Error(
            "include_data=true tidak tersedia pada API publik; gunakan include_data=false untuk riwayat aktivitas.",
          ),
          {
            status: 400,
            type: "Validation Error",
          },
        );
      }
      return { id: get("id"), include_data: false };
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

  try {
    const params = buildActionParams(action, new URL(request.url).searchParams);
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
      result = sanitizePublicSearchResult(await ckanAction(action, params));
    } else if (action === "package_show") {
      result = sanitizePublicPackage(await requirePublicPackage(params.id));
    } else if (action === "package_activity_list") {
      // Activity APIs require package-view permission. Apply an explicit public
      // visibility check before requesting history, even if CKAN deployment
      // permissions are later broadened by a plugin or token configuration.
      await requirePublicPackage(params.id);
      result = sanitizePublicActivity(
        await ckanAction(action, params, { revalidate: 0 }),
      );
    } else if (action === "resource_show") {
      const resource = await requirePublicResource(params.id);
      result = resource;
    } else if (action === "file_show") {
      result = await ckanAction(action, params, { revalidate: 0 });
      if (
        !result ||
        result.private === true ||
        (result.state && result.state !== "active")
      ) {
        throw notPublicRecord();
      }
      const resourceId = result.resource_id || result.resource?.id;
      if (resourceId) await requirePublicResource(resourceId);
      else if (result.package_id) await requirePublicPackage(result.package_id);
      else throw notPublicRecord();
    } else if (action === "datastore_search") {
      await requirePublicResource(params.resource_id);
      result = await ckanAction(action, params, { revalidate: 0 });
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

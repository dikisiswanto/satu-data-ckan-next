import { ckanAction } from "@/lib/ckan/client";
import { parseDelimitedPreview } from "@/lib/ckan/delimited-preview";
import {
  buildCkanSessionCookieHeader,
  getCkanSessionCookieFromRequest,
} from "@/lib/ckan/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 1024 * 1024;
const DEFAULT_ROWS = 25;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function safeInternalDownloadUrl(resource, internalOrigin) {
  if (!resource?.url || !resource?.id) return null;
  let source;
  try {
    source = new URL(resource.url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(source.protocol)) return null;
  const match = source.pathname.match(
    /^\/dataset\/[^/]+\/resource\/([^/]+)\/download\/[^/]+\/?$/,
  );
  if (!match || match[1] !== String(resource.id)) return null;
  // Keep only the validated CKAN download path and always fetch from the
  // configured internal origin. Never forward arbitrary metadata query values
  // (which could contain signed tokens or unrelated upstream parameters).
  return new URL(source.pathname, internalOrigin);
}

async function readBoundedBody(response, maxBytes) {
  if (!response.body) return { text: "", truncated: false };
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - received;
      if (value.byteLength > remaining) {
        if (remaining > 0)
          chunks.push(Buffer.from(value.subarray(0, remaining)));
        received = maxBytes;
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(Buffer.from(value));
      received += value.byteLength;
      if (received >= maxBytes) {
        truncated = true;
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return { text: Buffer.concat(chunks).toString("utf8"), truncated };
}

function isCsvResource(resource) {
  const values = [
    resource?.format,
    resource?.mimetype,
    resource?.mimetype_inner,
    resource?.name,
    resource?.url,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return values.some(
    (value) =>
      /(^|[./;])(?:csv|tsv)(?:$|[;\s?#])/i.test(value) ||
      /\.(?:csv|tsv)(?:[?#]|$)/i.test(value),
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const resourceId = String(searchParams.get("resource_id") || "").trim();
  const limitRaw = searchParams.get("limit") || String(DEFAULT_ROWS);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(resourceId)) {
    return json(
      { success: false, error: { message: "ID resource tidak valid." } },
      400,
    );
  }
  if (!/^\d+$/.test(limitRaw)) {
    return json(
      { success: false, error: { message: "Batas baris tidak valid." } },
      400,
    );
  }
  const limit = Math.min(Math.max(Number(limitRaw), 1), 25);

  const sessionCookie = getCkanSessionCookieFromRequest(request);
  const ckanOptions = { revalidate: 0, sessionCookie };
  try {
    const resource = await ckanAction(
      "resource_show",
      { id: resourceId },
      ckanOptions,
    );
    if (
      !resource ||
      (!sessionCookie && resource.private === true) ||
      (resource.state && resource.state !== "active")
    ) {
      return json(
        {
          success: false,
          error: {
            message: "Resource tidak tersedia atau tidak dapat diakses.",
          },
        },
        404,
      );
    }
    const packageId = resource.package_id || resource.package_name;
    if (!packageId)
      return json(
        {
          success: false,
          error: { message: "Dataset sumber tidak ditemukan." },
        },
        404,
      );
    const pkg = await ckanAction(
      "package_show",
      { id: packageId },
      ckanOptions,
    );
    if (
      !pkg ||
      (!sessionCookie && pkg.private === true) ||
      (pkg.state && pkg.state !== "active")
    ) {
      return json(
        {
          success: false,
          error: { message: "Dataset tidak tersedia untuk publik." },
        },
        404,
      );
    }
    if (resource.datastore_active === true) {
      return json({
        success: true,
        result: { state: "datastore_ready", records: [], fields: [], total: 0 },
      });
    }
    if (!isCsvResource(resource)) {
      return json({
        success: true,
        result: { state: "pending", records: [], fields: [], total: 0 },
      });
    }

    const internalBase = new URL(
      process.env.CKAN_API_INTERNAL_URL || "http://ckan:5000/api/3/action",
    );
    const downloadUrl = safeInternalDownloadUrl(resource, internalBase.origin);
    if (!downloadUrl) {
      return json({
        success: true,
        result: { state: "pending", records: [], fields: [], total: 0 },
      });
    }

    const response = await fetch(downloadUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: {
        Accept:
          "text/csv,text/tab-separated-values,application/octet-stream;q=0.9,*/*;q=0.1",
        Range: `bytes=0-${MAX_BYTES - 1}`,
        ...(buildCkanSessionCookieHeader(sessionCookie)
          ? { Cookie: buildCkanSessionCookieHeader(sessionCookie) }
          : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
    // Do not follow redirects to arbitrary storage hosts. DataStore/XLoader
    // remains the supported full preview path for object-storage resources.
    if (response.status !== 200 && response.status !== 206) {
      return json({
        success: true,
        result: { state: "pending", records: [], fields: [], total: 0 },
      });
    }
    const { text, truncated } = await readBoundedBody(response, MAX_BYTES);
    const parsed = parseDelimitedPreview(text, { maxRows: limit });
    if (!parsed.fields.length) {
      return json({
        success: true,
        result: { state: "pending", records: [], fields: [], total: 0 },
      });
    }
    return json({
      success: true,
      result: {
        state: "ready",
        preview_source: "csv-fallback",
        records: parsed.records,
        fields: parsed.fields,
        total: parsed.records.length,
        offset: 0,
        limit,
        has_more: parsed.hasMore || truncated,
        truncated,
        delimiter:
          parsed.delimiter === "\t"
            ? "tab"
            : parsed.delimiter === ";"
              ? "semicolon"
              : "comma",
      },
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status === 404 || status === 403) {
      return json(
        {
          success: false,
          error: {
            message: "Resource tidak tersedia atau tidak dapat diakses.",
          },
        },
        404,
      );
    }
    return json(
      { success: false, error: { message: "Pratinjau belum dapat dimuat." } },
      502,
    );
  }
}

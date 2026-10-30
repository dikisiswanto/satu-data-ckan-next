import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const ALLOWED_EVENTS = new Set([
  "dataset.created",
  "dataset.updated",
  "dataset.deleted",
  "resource.created",
  "resource.updated",
  "resource.deleted",
  "resource.indexed",
  "organization.created",
  "organization.updated",
  "organization.deleted",
  "group.created",
  "group.updated",
  "group.deleted",
  "pages.changed",
  "manual.revalidate",
]);

function unauthorized() {
  return Response.json(
    { success: false, error: "invalid_signature" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

export async function POST(request) {
  const secret = process.env.CKAN_REVALIDATE_SECRET || "";
  if (secret.length < 32) {
    return Response.json(
      { success: false, error: "revalidation_not_configured" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json(
      { success: false, error: "payload_too_large" },
      {
        status: 413,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  const timestamp = request.headers.get("x-wajo-timestamp") || "";
  const suppliedSignature = request.headers.get("x-wajo-signature") || "";
  if (
    !/^\d{10}$/.test(timestamp) ||
    !/^sha256=[a-f0-9]{64}$/.test(suppliedSignature)
  ) {
    return unauthorized();
  }

  const numericTimestamp = Number(timestamp);
  if (
    !Number.isSafeInteger(numericTimestamp) ||
    Math.abs(Math.floor(Date.now() / 1000) - numericTimestamp) >
      MAX_CLOCK_SKEW_SECONDS
  ) {
    return unauthorized();
  }

  const reader = request.body?.getReader();
  if (!reader) return unauthorized();
  const chunks = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return Response.json(
          { success: false, error: "payload_too_large" },
          {
            status: 413,
            headers: {
              "Cache-Control": "no-store",
              "X-Robots-Tag": "noindex, nofollow",
            },
          },
        );
      }
      chunks.push(Buffer.from(value));
    }
  } catch {
    return unauthorized();
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`, "utf8")
    .update(rawBody, "utf8")
    .digest();
  const supplied = Buffer.from(
    suppliedSignature.slice("sha256=".length),
    "hex",
  );
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return unauthorized();
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { success: false, error: "invalid_json" },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !ALLOWED_EVENTS.has(payload.event)
  ) {
    return Response.json(
      { success: false, error: "unsupported_event" },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  // All CKAN-backed public fetches share this tag. Expire immediately so the
  // next public request reads the latest committed CKAN state.
  revalidateTag("ckan-public", { expire: 0 });
  return Response.json(
    { success: true, revalidated: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

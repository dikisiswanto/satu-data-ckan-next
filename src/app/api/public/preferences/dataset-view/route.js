import { NextResponse } from "next/server";
import {
  DATASET_VIEW_COOKIE_MAX_AGE,
  DATASET_VIEW_COOKIE_NAME,
  normalizeDatasetView,
  getSafeDatasetReturnPath,
} from "@/lib/dataset-view-preference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response("Permintaan preferensi tidak valid.", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const requestedView = formData.get("view");
  if (requestedView !== "cards" && requestedView !== "list") {
    return new Response("Pilihan tampilan tidak valid.", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const view = normalizeDatasetView(requestedView);
  const returnPath = getSafeDatasetReturnPath(
    formData.get("returnTo"),
    request.url,
  );
  // Keep Location relative: request.url may contain the private container host
  // (for example http://0.0.0.0:3000) behind Caddy/Cloudflare. The browser
  // resolves this path against the public hostname that initiated the request.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: returnPath },
  });
  response.cookies.set({
    name: DATASET_VIEW_COOKIE_NAME,
    value: view,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DATASET_VIEW_COOKIE_MAX_AGE,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

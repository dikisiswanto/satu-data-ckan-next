import { NextResponse } from "next/server";

function notFound() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // The public Action API is mounted on the same host as the portal but is
  // read-only and must never be indexed. The route handler enforces the action
  // allowlist; this proxy rejects mutating methods before they reach it.
  if (pathname.startsWith("/api/3/action/")) {
    if (!/^\/api\/3\/action\/[a-z][a-z0-9_]*\/?$/.test(pathname))
      return notFound();
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) return notFound();
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  // No legacy write-capable API is part of this CKAN-only deployment.
  if (pathname.startsWith("/api/v1/")) return notFound();

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import "server-only";

/**
 * CKAN 2.12's Flask session cookie is shared by the CKAN admin host and the
 * public portal host through SESSION_COOKIE_DOMAIN. Only this one cookie is
 * ever forwarded to the internal CKAN service; application/analytics cookies
 * are deliberately excluded.
 */
export const CKAN_SESSION_COOKIE_NAME = /^[A-Za-z0-9_-]{1,64}$/.test(
  process.env.CKAN_SESSION_COOKIE_NAME || "wajo_ckan_session",
)
  ? process.env.CKAN_SESSION_COOKIE_NAME || "wajo_ckan_session"
  : "wajo_ckan_session";

export function normalizeCkanSessionCookieValue(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 4096) return null;
  // A cookie value must not be able to inject another Cookie header field or
  // HTTP header. CKAN's signed session values are printable ASCII strings.
  if (/[\u0000-\u0020\u007f;,]/.test(normalized)) return null;
  return normalized;
}

export function getCkanSessionCookieValue(cookieHeader) {
  if (typeof cookieHeader !== "string" || cookieHeader.length > 16_384)
    return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== CKAN_SESSION_COOKIE_NAME) continue;
    return normalizeCkanSessionCookieValue(part.slice(separator + 1).trim());
  }
  return null;
}

export function buildCkanSessionCookieHeader(sessionCookieValue) {
  const value = normalizeCkanSessionCookieValue(sessionCookieValue);
  return value ? `${CKAN_SESSION_COOKIE_NAME}=${value}` : null;
}

export function getCkanSessionCookieFromRequest(request) {
  return getCkanSessionCookieValue(request?.headers?.get?.("cookie") || "");
}

/** Parse Retry-After as seconds or an HTTP date, bounded to one minute. */
export function getRetryAfterMs(response) {
  const value = response.headers.get("Retry-After");
  if (!value) return null;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - Date.now();
  return Number.isFinite(delay) ? Math.min(60_000, Math.max(0, delay)) : null;
}

/** Accept only absolute HTTP(S) URLs without embedded credentials. */
export function isHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function safeHttpUrl(value) {
  return isHttpUrl(value) ? value.trim() : null;
}

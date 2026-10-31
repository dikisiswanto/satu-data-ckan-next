const IMAGE_FILENAME =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,240}\.(?:png|jpe?g|gif|webp)$/i;

/** Build an internal CKAN URL only for an allow-listed public group image. */
export function createCkanGroupMediaTarget(pathSegments, apiBase) {
  if (!Array.isArray(pathSegments) || pathSegments.length !== 2) return null;
  const [storage, filename] = pathSegments;
  if (
    storage !== "group" ||
    typeof filename !== "string" ||
    !IMAGE_FILENAME.test(filename)
  )
    return null;

  let base;
  try {
    base = new URL(
      apiBase ||
        process.env.CKAN_API_INTERNAL_URL ||
        "http://ckan:5000/api/3/action",
    );
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password
  )
    return null;

  return new URL(`/uploads/group/${encodeURIComponent(filename)}`, base.origin);
}

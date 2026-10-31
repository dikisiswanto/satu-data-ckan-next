const IMAGE_FILENAME =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,240}\.(?:png|jpe?g|gif|webp)$/i;

/** Build an internal CKAN URL only for allow-listed public group images. */
export function createCkanGroupMediaTarget(pathSegments, apiBase) {
  if (!Array.isArray(pathSegments)) return null;
  let upstreamPath;
  let filename;
  if (pathSegments.length === 2 && pathSegments[0] === "group") {
    // Legacy CKAN upload URL retained for existing organizations/groups.
    [, filename] = pathSegments;
    upstreamPath = "/uploads/group/";
  } else if (
    pathSegments.length === 3 &&
    pathSegments[0] === "public-download" &&
    pathSegments[1] === "groups"
  ) {
    // CKAN 2.12 FileStore public URL returned by organization image metadata.
    filename = pathSegments[2];
    upstreamPath = "/file/public-download/groups/";
  } else {
    return null;
  }
  if (typeof filename !== "string" || !IMAGE_FILENAME.test(filename))
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

  return new URL(`${upstreamPath}${encodeURIComponent(filename)}`, base.origin);
}

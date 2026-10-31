const IMAGE_FILENAME =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,240}\.(?:png|jpe?g|gif|webp)$/i;
const GROUP_UPLOAD_PATH =
  /^\/?uploads\/group\/([A-Za-z0-9][A-Za-z0-9._-]{0,240}\.(?:png|jpe?g|gif|webp))$/i;
const CKAN_PUBLIC_GROUP_PATH =
  /^\/?file\/public-download\/groups\/([A-Za-z0-9][A-Za-z0-9._-]{0,240}\.(?:png|jpe?g|gif|webp))$/i;

/**
 * Resolve CKAN organization/group logos for the public Next.js portal.
 * CKAN's image_url is often only a filename; image_display_url is normally an
 * absolute URL based on ckan.site_url. The public hostname is served by Next.js,
 * so /uploads/group/* is intentionally kept same-origin and handled by the
 * server-side media proxy rather than exposing the protected CKAN hostname.
 */
export function getPublicOrganizationImageUrl(organization = {}) {
  const candidates = [
    organization.image_display_url,
    organization.image_url,
    // Older Wajo schemas mistakenly stored the image in the generic `url` field.
    organization.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const value = candidate.trim();

    const publicGroupPath = value.match(CKAN_PUBLIC_GROUP_PATH);
    if (publicGroupPath)
      return `/file/public-download/groups/${encodeURIComponent(publicGroupPath[1])}`;

    const uploadPath = value.match(GROUP_UPLOAD_PATH);
    if (uploadPath)
      return `/uploads/group/${encodeURIComponent(uploadPath[1])}`;

    if (value.startsWith("/file/public-download/groups/")) {
      const relativeMatch = value.slice(1).match(CKAN_PUBLIC_GROUP_PATH);
      if (relativeMatch)
        return `/file/public-download/groups/${encodeURIComponent(relativeMatch[1])}`;
      continue;
    }

    if (value.startsWith("/uploads/group/")) {
      const relativeMatch = value.slice(1).match(GROUP_UPLOAD_PATH);
      if (relativeMatch)
        return `/uploads/group/${encodeURIComponent(relativeMatch[1])}`;
      continue;
    }

    if (IMAGE_FILENAME.test(value)) {
      return `/uploads/group/${encodeURIComponent(value)}`;
    }

    try {
      const url = new URL(value);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        continue;
      const publicGroupMatch = url.pathname.match(CKAN_PUBLIC_GROUP_PATH);
      if (publicGroupMatch)
        return `/file/public-download/groups/${encodeURIComponent(publicGroupMatch[1])}`;
      const pathMatch = url.pathname.match(GROUP_UPLOAD_PATH);
      if (pathMatch)
        return `/uploads/group/${encodeURIComponent(pathMatch[1])}`;
      // Keep legitimate externally-hosted logos, but never expose file/data/javascript URLs.
      if (/\.(?:png|jpe?g|gif|webp)$/i.test(url.pathname))
        return url.toString();
    } catch {
      // Ignore malformed or non-URL metadata values.
    }
  }

  return null;
}

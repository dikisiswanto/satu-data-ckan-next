const configuredRegionName = (process.env.NEXT_PUBLIC_REGION_NAME || "Kabupaten Wajo").trim() || "Kabupaten Wajo";
const hasConfiguredRegion = configuredRegionName.length > 0;
const configuredRegionShortName = (
  process.env.NEXT_PUBLIC_REGION_SHORT_NAME ||
  (hasConfiguredRegion
    ? configuredRegionName.replace(/^(?:Kabupaten|Kota|Provinsi|Kecamatan)\s+/i, "")
    : "Instansi")
).trim();
const configuredShortName = (
  process.env.NEXT_PUBLIC_SHORT_NAME ||
  (hasConfiguredRegion ? `Satu Data ${configuredRegionShortName}` : "Portal Satu Data")
).trim();
const configuredOrganizationName = (
  process.env.NEXT_PUBLIC_ORGANIZATION_NAME ||
  (hasConfiguredRegion ? `Pemerintah ${configuredRegionName}` : "Instansi pengampu")
).trim();
const configuredAppName = (
  process.env.NEXT_PUBLIC_APP_NAME ||
  (hasConfiguredRegion ? `Portal Satu Data ${configuredRegionName}` : "Portal Satu Data")
).trim();
const configuredDescription = (
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  (hasConfiguredRegion
    ? `Portal resmi untuk menemukan, memahami, dan menggunakan data publik ${configuredRegionName}.`
    : "Katalog data resmi untuk menemukan, memahami, dan menggunakan data publik dari instansi pengampu.")
).trim();
const configuredBrandProfile = (process.env.NEXT_PUBLIC_BRAND_PROFILE || (/^kabupaten wajo$/i.test(configuredRegionName) ? "wajo" : "generic")).trim().toLowerCase();
// Regional assets/contact details must be opt-in. A configured region name is
// not enough to infer a logo, PPID endpoint, address, or personal contact data.
const isWajoBrandProfile = configuredBrandProfile === "wajo" && /^kabupaten wajo$/i.test(configuredRegionName);
const configuredLogoPath = (process.env.NEXT_PUBLIC_LOGO_PATH || (isWajoBrandProfile ? "/logo-kabupaten-wajo.webp" : "/icons/portal.svg")).trim();
const configuredHeroImage = (process.env.NEXT_PUBLIC_HERO_IMAGE || (isWajoBrandProfile ? "/wajo-hero-panorama.webp" : "/portal-social.svg")).trim();
const configuredPpidName = (process.env.NEXT_PUBLIC_PPID_NAME || (isWajoBrandProfile ? "PPID Kabupaten Wajo" : "PPID instansi")).trim();
const configuredPpidUrl = (process.env.NEXT_PUBLIC_PPID_URL || (isWajoBrandProfile ? "https://e-ppid-utama.wajokab.go.id/" : "")).trim();

export const siteConfig = Object.freeze({
  name: configuredAppName,
  title: configuredAppName,
  brandProfile: isWajoBrandProfile ? "wajo" : "generic",
  description: configuredDescription,
  shortName: configuredShortName,
  regionName: configuredRegionName,
  regionShortName: configuredRegionShortName,
  organizationName: configuredOrganizationName,
  publicSubtitle: (process.env.NEXT_PUBLIC_PUBLIC_SUBTITLE || (hasConfiguredRegion ? `Portal Data ${configuredRegionName}` : "Katalog Data Terbuka")).trim(),
  logoPath: configuredLogoPath,
  logoAlt: (process.env.NEXT_PUBLIC_LOGO_ALT || (isWajoBrandProfile ? `Lambang ${configuredRegionName}` : "Logo Portal Satu Data")).trim(),
  heroImage: configuredHeroImage,
  iconPath: (process.env.NEXT_PUBLIC_ICON_PATH || (isWajoBrandProfile ? "/icons/icon.svg" : "/icons/portal.svg")).trim(),
  pwaIcon192: (process.env.NEXT_PUBLIC_PWA_ICON_192 || (isWajoBrandProfile ? "/icons/icon-192.png" : "/icons/portal.svg")).trim(),
  pwaIcon512: (process.env.NEXT_PUBLIC_PWA_ICON_512 || (isWajoBrandProfile ? "/icons/icon-512.png" : "/icons/portal.svg")).trim(),
  ppidName: configuredPpidName,
  ppidUrl: configuredPpidUrl,
  ppidContactUrl: (process.env.NEXT_PUBLIC_PPID_CONTACT_URL || (isWajoBrandProfile ? "https://e-ppid-utama.wajokab.go.id/kontak/" : "")).trim(),
  ppidAddress: (process.env.NEXT_PUBLIC_PPID_ADDRESS || (isWajoBrandProfile ? "Jl. Rusa No. 17, Bulu Pabbulu, Kecamatan Tempe, Kabupaten Wajo, Sulawesi Selatan 90911" : "")).trim(),
  ppidEmail: (process.env.NEXT_PUBLIC_PPID_EMAIL || (isWajoBrandProfile ? "ppid@wajokab.go.id" : "")).trim(),
  ppidPhone: (process.env.NEXT_PUBLIC_PPID_PHONE || (isWajoBrandProfile ? "+62 811-4780-6767" : "")).trim(),
  locale: process.env.NEXT_PUBLIC_LOCALE || "id-ID",
  timeZone: process.env.NEXT_PUBLIC_TIME_ZONE || "Asia/Makassar",
});

/**
 * Return the canonical public origin. Production must explicitly configure an
 * HTTPS origin; localhost is a development-only fallback so deployment URLs
 * are never accidentally published as canonical links or password-reset URLs.
 */
export function getPublicSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    return process.env.NODE_ENV === "production"
      ? null
      : "http://localhost:3000";
  }

  try {
    const url = new URL(configured);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/** Omit canonical links when the deployment origin is unknown. */
export function getCanonicalMetadata(pathname) {
  return getPublicSiteOrigin() ? { alternates: { canonical: pathname } } : {};
}

/** Consistent social previews for public routes. Child Open Graph metadata replaces
 * the parent object in Next.js, so every route that customizes Open Graph must
 * define its own image instead of relying on the root layout. */
export function getSocialMetadata({
  path = "/",
  title,
  description,
  type = "website",
}) {
  const origin = getPublicSiteOrigin();
  const image = siteConfig.heroImage;
  const absolutePath = origin ? new URL(path, origin).toString() : undefined;
  return {
    openGraph: {
      locale: siteConfig.locale.replace("-", "_"),
      siteName: siteConfig.name,
      title,
      description,
      type,
      ...(absolutePath ? { url: absolutePath } : {}),
      images: [{ url: image, width: 2103, height: 748, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

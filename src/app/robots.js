import { getPublicSiteOrigin } from "@/lib/site-config";

export default function robots() {
  const base = getPublicSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        // Public content can be indexed. The CKAN admin is on a separate protected
        // hostname; private records must be protected by CKAN permissions, not robots.txt.
        allow: [
          "/",
          "/dataset",
          "/kategori",
          "/statistik",
          "/infografik",
          "/publikasi",
          "/organisasi",
          "/bantuan",
          "/api-data",
          "/informasi",
          "/berita",
        ],
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}

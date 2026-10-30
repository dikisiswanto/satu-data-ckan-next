import { siteConfig } from "@/lib/site-config";

export default function manifest() {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    lang: siteConfig.locale,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f4f6f8",
    theme_color: "#174566",
    categories: ["government", "education", "utilities"],
    icons: [
      {
        src: siteConfig.pwaIcon192,
        sizes: siteConfig.pwaIcon192.endsWith(".svg") ? "any" : "192x192",
        type: siteConfig.pwaIcon192.endsWith(".svg")
          ? "image/svg+xml"
          : "image/png",
        purpose: "any",
      },
      {
        src: siteConfig.pwaIcon512,
        sizes: siteConfig.pwaIcon512.endsWith(".svg") ? "any" : "512x512",
        type: siteConfig.pwaIcon512.endsWith(".svg")
          ? "image/svg+xml"
          : "image/png",
        purpose: "any",
      },
    ],
  };
}

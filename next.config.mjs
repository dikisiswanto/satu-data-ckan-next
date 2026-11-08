/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Playwright uses 127.0.0.1 while the dev server may advertise localhost.
  allowedDevOrigins: ["127.0.0.1"],
  compress: true,
  productionBrowserSourceMaps: false,
  async redirects() {
    return [
      { source: "/tentang", destination: "/", permanent: true },
      { source: "/tentang/api", destination: "/api-data", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Origin-Agent-Cluster", value: "?1" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
      {
        // Only validated, same-origin PDF preview responses may be framed.
        // All other portal routes retain the global DENY policy above.
        source: "/dataset/:slug/resource/:resourceId/download/:filename",
        has: [{ type: "query", key: "preview", value: "1" }],
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};
export default nextConfig;

import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { QueryProvider } from "@/components/query-provider";
import { RouteProgress } from "@/components/route-progress";
import { getPublicSiteOrigin, siteConfig } from "@/lib/site-config";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const siteUrl = getPublicSiteOrigin();
export const metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.shortName,
  },
  icons: {
    icon: [
      { url: siteConfig.iconPath, type: "image/svg+xml" },
      {
        url: siteConfig.pwaIcon192,
        sizes: siteConfig.pwaIcon192.endsWith(".svg") ? "any" : "192x192",
        type: siteConfig.pwaIcon192.endsWith(".svg")
          ? "image/svg+xml"
          : "image/png",
      },
    ],
    apple: siteConfig.pwaIcon192,
  },
  category: "government",
  openGraph: {
    type: "website",
    locale: siteConfig.locale.replace("-", "_"),
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.heroImage,
        width: 2103,
        height: 748,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.heroImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang={siteConfig.locale} data-scroll-behavior="smooth">
      <body className={inter.variable}>
        <ServiceWorkerRegistration />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <a className="skip-link" href="#konten-utama">
          Lewati ke konten utama
        </a>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

import { Suspense } from "react";
import { PublicScrollManager } from "@/components/public-scroll-manager";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import { PwaInstallPromotion } from "@/components/pwa-install-promotion";
import { BackToTop } from "@/components/back-to-top";

export function PublicLayout({ children }) {
  return (
    <div className="public-app-shell">
      <Suspense fallback={null}>
        <PublicScrollManager />
      </Suspense>
      <SiteHeader />
      <PublicBreadcrumbs />
      <div id="konten-utama" tabIndex={-1} className="public-page-content">
        {children}
      </div>
      <SiteFooter />
      <BackToTop />
      <Suspense fallback={null}>
        <PwaInstallPromotion />
      </Suspense>
    </div>
  );
}

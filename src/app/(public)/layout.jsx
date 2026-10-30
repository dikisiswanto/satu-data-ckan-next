import { PublicLayout } from "@/components/public-layout";

// Public routes render dynamically, while the CKAN Action API client applies a
// bounded 60-second revalidation window to reduce redundant upstream requests.
// Treat that interval as the normal maximum publication propagation delay; do not
// add a second persistent page cache without explicit invalidation coverage.
export const dynamic = "force-dynamic";

export default function PublicRouteLayout({ children }) {
  return <PublicLayout>{children}</PublicLayout>;
}

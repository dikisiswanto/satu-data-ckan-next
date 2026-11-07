#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const datasetPage = await read("src/app/(public)/dataset/page.jsx");
const datasetLoading = await read("src/app/(public)/dataset/loading.jsx");
const preferenceLib = await read("src/lib/dataset-view-preference.js");
const catalogState = await read("src/lib/dataset-catalog-state.js");
const preferenceRoute = await read(
  "src/app/api/public/preferences/dataset-view/route.js",
);
const datasetCard = await read("src/components/dataset-card.jsx");
const publicCss = await read("src/app/styles/public-layout-stability.css");
const organizationCss = await read("src/app/styles/public-organizations.css");
const adminBase = await read(
  "deploy/ckan/theme/ckanext/portal_theme/templates/base.html",
);
const adminProgress = await read(
  "deploy/ckan/theme/ckanext/portal_theme/public/portal-admin-navigation-progress.js",
);
const adminCss = await read(
  "deploy/ckan/theme/ckanext/portal_theme/assets/css/portal-admin-design-system.css",
);
const e2e = await read("tests/e2e/public-portal.spec.js");

assert.match(datasetPage, /getDatasetViewPreference\(cookieStore\)/);
assert.match(
  datasetPage,
  /action="\/api\/public\/preferences\/dataset-view" method="post"/,
);
assert.match(datasetPage, /name="returnTo"[\s\S]*?viewReturnPath\(\)/);
assert.match(datasetPage, /buildDatasetCatalogHref/);
assert.match(datasetPage, /buildDatasetClearFiltersHref/);
assert.equal((datasetPage.match(/name="returnTo"/g) || []).length, 2);
assert.match(datasetPage, /href=\{clearFilterHref\(\)\}/);
assert.equal((datasetPage.match(/href=\{clearAllHref\(\)\}/g) || []).length, 2);
assert.doesNotMatch(datasetPage, /search\.set\("tampilan"/);
assert.equal((datasetPage.match(/name="tampilan"/g) || []).length, 0);
assert.match(catalogState, /pageNumber > 1/);

assert.match(datasetLoading, /await cookies\(\)/);
assert.match(datasetLoading, /getDatasetViewPreference\(cookieStore\)/);
assert.match(datasetLoading, /view === "list" \?/);
assert.match(datasetLoading, /public-loading-list/);
assert.match(datasetLoading, /public-loading-grid-md/);
// Dataset loading search controls must line up with the resolved form: the
// search input owns the flexible column; CTA and filter sit level with the
// input (below its label), not at the bottom of the helper-copy block.
const resolvedDatasetSearch =
  datasetPage.split('<form action="/dataset"')[1]?.split("</form>")[0] || "";
const loadingDatasetSearch =
  datasetLoading
    .split('aria-label="Memuat hasil katalog dataset"')[1]
    ?.split('aria-label="Hasil katalog sedang dimuat"')[0] || "";
assert.match(resolvedDatasetSearch, /sm:flex-row sm:items-start/);
assert.match(loadingDatasetSearch, /sm:flex-row sm:items-start/);
assert.doesNotMatch(loadingDatasetSearch, /sm:items-end/);
assert.match(resolvedDatasetSearch, /className="min-w-0 flex-1"/);
assert.match(loadingDatasetSearch, /className="min-w-0 flex-1"/);
assert.match(resolvedDatasetSearch, /sm:mt-7 sm:w-auto/);
assert.match(loadingDatasetSearch, /sm:mt-7 sm:w-\[9\.75rem\]/);
assert.match(loadingDatasetSearch, /sm:mt-7 sm:w-auto/);
assert.match(loadingDatasetSearch, /<SlidersHorizontal[\s\S]*?>[\s\S]*?Filter/);
assert.match(
  preferenceLib,
  /DATASET_VIEW_COOKIE_MAX_AGE = 60 \* 60 \* 24 \* 365/,
);
assert.match(preferenceLib, /target\.origin !== requestOrigin/);
assert.match(preferenceLib, /target\.pathname !== "\/dataset"/);
assert.match(preferenceLib, /search\.delete\("tampilan"\)/);
assert.match(catalogState, /state\.hasExplicitSort/);
assert.match(catalogState, /queryRemains/);
assert.match(catalogState, /FILTER_KEYS/);
assert.match(preferenceRoute, /request\.formData\(\)/);
assert.match(preferenceRoute, /headers: \{ Location: returnPath \}/);
assert.doesNotMatch(
  preferenceRoute,
  /NextResponse\.redirect\(new URL\(returnPath, request\.url\)/,
);
assert.match(preferenceRoute, /httpOnly: true/);
assert.match(preferenceRoute, /sameSite: "lax"/);
assert.match(
  preferenceRoute,
  /secure: process\.env\.NODE_ENV === "production"/,
);
assert.match(preferenceRoute, /maxAge: DATASET_VIEW_COOKIE_MAX_AGE/);
assert.match(preferenceRoute, /Cache-Control/);
assert.match(datasetCard, /data-public-card="true"/);
assert.match(datasetCard, /data-public-list-row="true"/);

for (const route of ["statistik", "infografik", "publikasi"]) {
  const loading = await read(`src/app/(public)/${route}/loading.jsx`);
  assert.match(
    loading,
    /CatalogSearchFormSkeleton/,
    `${route} loading should reserve the final search/filter form geometry`,
  );
}
const organizationLoading = await read(
  "src/app/(public)/organisasi/loading.jsx",
);
assert.match(organizationLoading, /organization-directory-summary/);
assert.equal(
  (organizationLoading.match(/\["w-10", "w-20"\]/g) || []).length,
  3,
);
assert.match(organizationLoading, /Cari perangkat daerah/);
assert.match(organizationLoading, /organization-directory-grid/);
assert.match(publicCss, /@keyframes public-skeleton-shimmer/);
assert.match(publicCss, /prefers-reduced-motion: reduce/);
assert.match(
  organizationCss,
  /@media \(max-width: 639px\)[\s\S]*?\.organization-directory-summary[\s\S]*?display: none !important/,
);

assert.match(adminBase, /portal-admin-navigation-progress\.js/);
assert.match(adminProgress, /event\.defaultPrevented/);
assert.match(adminProgress, /target\.origin !== window\.location\.origin/);
assert.match(
  adminProgress,
  /target\.pathname === window\.location\.pathname[\s\S]*?return false/,
);
assert.match(adminProgress, /data-no-navigation-progress/);
assert.match(adminCss, /\.portal-admin-navigation-progress/);
assert.match(adminCss, /prefers-reduced-motion: reduce/);
assert.match(e2e, /dataset card\/list preference persists/);
assert.match(e2e, /complex dataset filters preserve the selected layout/);

process.stdout.write(
  "Loading geometry, dataset-view persistence/filter state, and CKAN admin progress contracts passed.\n",
);

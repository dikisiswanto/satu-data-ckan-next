#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildDatasetCatalogExclusionFilters,
  buildPortalContentDiscoveryFilter,
} from "../src/lib/data/portal-content-types.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const client = await read("src/lib/ckan/client.js");
const publicData = await read("src/lib/data/public.js");
const infographicData = await read("src/lib/data/public-infographics.js");
const indicatorData = await read("src/lib/data/public-indicators.js");
const publicationData = await read("src/lib/data/public-publications.js");
const filters = await read("src/lib/data/portal-content-types.js");

// Source contracts must survive Prettier/Format Write. Collapse formatting
// whitespace before checking multi-line JavaScript expressions.
const compactClient = client.replace(/\s+/g, " ");
const compactPublicData = publicData.replace(/\s+/g, " ");

assert.match(
  compactClient,
  /normalizeCkanActionParams\(action, params\)/,
  "All package_search inputs must pass through the Action API filter normalizer.",
);
assert.match(
  compactClient,
  /delete normalized\.fq_list;/,
  "Legacy fq_list inputs must be removed before the CKAN request is sent.",
);
assert.match(
  compactClient,
  /normalized\.fq = filters\.length === 1[\s\S]*?join\(" AND "\)/,
  "CKAN filters must be normalized into a single scalar fq expression, never iterated as characters.",
);
assert.match(
  compactClient,
  /const useJsonBody = action !== "package_search" && hasStructuredParams/,
  "package_search must stay on a CSRF-safe GET request, including authenticated sessions.",
);
assert.match(
  compactClient,
  /requestInit\.method = "GET"[\s\S]*url\.searchParams\.append\(key, String\(item\)\)/,
  "CKAN list-valued search parameters must be repeated as query keys instead of sent as a JSON POST.",
);
assert.match(
  compactPublicData,
  /fq: buildDatasetCatalogExclusionFilters\(\)\.join\(" AND "\)/,
  "Public statistics must apply the same dataset exclusions through one scalar fq expression.",
);
for (const [path, source] of [
  ["public dataset", publicData],
  ["infographic", infographicData],
  ["indicator", indicatorData],
  ["publication", publicationData],
]) {
  assert.doesNotMatch(
    source,
    /\bfqList\s*:|\bfq_list\s*:/,
    `${path} requests must not use fq_list; package_search uses one scalar fq expression.`,
  );
}
assert.match(
  filters,
  /tags:\$\{solrPhrase\(tag\)\}/,
  "Editorial discovery tags must use escaped, quoted Solr phrases.",
);
assert.match(
  filters,
  /extras_portal_type:\$\{solrPhrase\(type\)\}/,
  "Scheming portal_type extras must be queryable in CKAN's dynamic extras fields.",
);
assert.match(
  filters,
  /dataset_type:\$\{solrPhrase\(type\)\}/,
  "True CKAN custom dataset types must be queryable by the indexed dataset_type field.",
);
assert.match(
  filters,
  /-dataset_type:\$\{solrPhrase\(type\)\}/,
  "Custom CKAN dataset types must also be excluded from the general dataset catalogue.",
);
assert.match(
  publicData,
  /Promise\.allSettled\(/,
  "Homepage counters must fail independently instead of blanking all metrics.",
);
assert.doesNotMatch(
  publicData,
  /ckanAction\("resource_search"/,
  "Homepage category metrics must not trigger an unused resource_search scan.",
);

process.stdout.write(
  "CKAN exclusion contract passed: package_search filters normalize to one scalar fq; homepage metrics avoid unused resource scans.\n",
);

// Execute the filter builders as well as checking their source contract. This
// catches runtime issues (for example, calling Array.map directly on a Set)
// that a syntax-only lint pass cannot detect.
const [datasetExclusion] = buildDatasetCatalogExclusionFilters();
assert.ok(
  datasetExclusion.startsWith("(*:* AND "),
  "dataset exclusion must retain a positive Solr anchor",
);
assert.match(datasetExclusion, /-tags:"portal\\-indikator"/);
assert.match(datasetExclusion, /-extras_portal_type:"infografik"/);
assert.match(datasetExclusion, /-dataset_type:"publikasi"/);
assert.match(
  buildPortalContentDiscoveryFilter("indicator"),
  /extras_portal_type:"indikator"/,
);
assert.match(
  buildPortalContentDiscoveryFilter("infographic"),
  /dataset_type:"infografik"/,
);
assert.match(
  buildPortalContentDiscoveryFilter("publication"),
  /tags:"portal\\-publikasi"/,
);

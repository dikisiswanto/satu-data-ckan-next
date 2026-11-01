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

assert.match(
  client,
  /if \(Array\.isArray\(value\)\)\s*\{\s*for \(const item of value\) url\.searchParams\.append\(key, String\(item\)\);/s,
  "CKAN list parameters must retain all values instead of replacing repeated list entries.",
);
assert.match(
  client,
  /if \(fqList\.length\) params\.fq_list = fqList;/,
  "searchPackages must send multiple catalogue filters through CKAN's fq_list contract.",
);
assert.doesNotMatch(
  client,
  /params\.fq\s*=/,
  "searchPackages must not send a multi-filter array through scalar fq.",
);
for (const [path, source] of [
  ["public dataset", publicData],
  ["infographic", infographicData],
  ["indicator", indicatorData],
  ["publication", publicationData],
]) {
  assert.doesNotMatch(
    source,
    /\bfq\s*:/,
    `${path} requests must not use repeated scalar fq query parameters.`,
  );
}
assert.match(
  publicData,
  /fq_list:\s*buildDatasetCatalogExclusionFilters\(\)/,
  "Public statistics must apply the same exclusions with fq_list.",
);
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
assert.match(
  publicData,
  /ckanAction\(\"resource_search\"/,
  "Resource totals must be counted from CKAN's public resource_search endpoint.",
);

process.stdout.write(
  "CKAN exclusion contract passed: multiple Solr filters use fq_list across catalogue, facets, statistics, and thematic public catalogues.\n",
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

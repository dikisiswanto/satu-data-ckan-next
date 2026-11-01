#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  /-tags:\$\{tag\}/,
  "All editorial discovery tags must be excluded from the general dataset catalogue.",
);

process.stdout.write(
  "CKAN exclusion contract passed: multiple Solr filters use fq_list across catalogue, facets, statistics, and thematic public catalogues.\n",
);

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/components/geojson-resource-preview.jsx", import.meta.url),
  "utf8",
);

// Match the behavior, not Prettier's exact whitespace/line wrapping. The
// component is routinely formatted by Format Document / Prettier, so these
// contracts intentionally tolerate multiline object literals and trailing
// commas while still requiring URL-scoped failure state.
const compact = source.replace(/\s+/g, " ");

assert.match(
  compact,
  /const \[tileFailureState,\s*setTileFailureState\] = useState\(\s*\{\s*url:\s*null,\s*count:\s*0,?\s*\}\s*\);/,
  "Tile failures must be stored with their originating resource URL.",
);
assert.match(
  compact,
  /const failedTileCount = tileFailureState\.url === url \? tileFailureState\.count : 0;/,
  "Only tile failures for the current resource may be displayed.",
);
assert.match(
  compact,
  /count:\s*current\.url === url \? current\.count \+ 1 : 1,?\s*\}\s*\)\s*;?/,
  "Late tile errors from another resource must not increment the current resource count.",
);
assert.match(
  source,
  /onError\s*=\s*\{\s*recordTileFailure\s*\}/,
  "Map tile errors must use the URL-scoped failure handler.",
);
assert.doesNotMatch(
  compact,
  /useEffect\(\(\) => setFailedTileCount\(0\), \[url\]\);/,
  "Do not synchronously reset React state inside an effect when the resource URL changes.",
);

process.stdout.write(
  "GeoJSON component regression checks passed: URL-scoped tile errors tolerate formatted JSX and no synchronous effect reset remains.\n",
);

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/components/geojson-resource-preview.jsx", import.meta.url),
  "utf8",
);

assert.ok(
  source.includes(
    "const [tileFailureState, setTileFailureState] = useState({ url: null, count: 0 });",
  ),
  "Tile failures must be stored with their originating resource URL.",
);
assert.ok(
  source.includes(
    "const failedTileCount = tileFailureState.url === url ? tileFailureState.count : 0;",
  ),
  "Only tile failures for the current resource may be displayed.",
);
assert.ok(
  source.includes("count: current.url === url ? current.count + 1 : 1,"),
  "Late tile errors from another resource must not increment the current resource count.",
);
assert.ok(
  source.includes("onError={recordTileFailure}"),
  "Map tile errors must use the URL-scoped failure handler.",
);
assert.ok(
  !source.includes("useEffect(() => setFailedTileCount(0), [url]);"),
  "Do not synchronously reset React state inside an effect when the resource URL changes.",
);

process.stdout.write(
  "GeoJSON component regression checks passed: tile errors are URL-scoped and no synchronous effect reset remains.\n",
);

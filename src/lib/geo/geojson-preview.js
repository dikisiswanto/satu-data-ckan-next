const DEFAULT_MAX_FEATURES = 10_000;
const DEFAULT_MAX_COORDINATES = 300_000;
const VALID_GEOMETRIES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
  "GeometryCollection",
]);

function isCoordinate(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  );
}

function coordinateIsWgs84(value) {
  return (
    isCoordinate(value) &&
    Number(value[0]) >= -180 &&
    Number(value[0]) <= 180 &&
    Number(value[1]) >= -90 &&
    Number(value[1]) <= 90
  );
}

function featureList(input, maxFeatures) {
  if (!input || typeof input !== "object")
    throw new TypeError("Dokumen bukan objek GeoJSON.");
  if (input.type === "FeatureCollection" && Array.isArray(input.features)) {
    return {
      features: input.features.slice(0, maxFeatures),
      featureCount: input.features.length,
    };
  }
  if (input.type === "Feature") return { features: [input], featureCount: 1 };
  if (VALID_GEOMETRIES.has(input.type)) {
    return {
      features: [{ type: "Feature", properties: {}, geometry: input }],
      featureCount: 1,
    };
  }
  throw new TypeError(
    "GeoJSON harus berupa FeatureCollection, Feature, atau Geometry yang valid.",
  );
}

function visitCoordinates(geometry, visitor, state, depth = 0) {
  if (!geometry || typeof geometry !== "object" || depth > 20) return;
  if (geometry.type === "GeometryCollection") {
    for (const item of Array.isArray(geometry.geometries)
      ? geometry.geometries
      : []) {
      visitCoordinates(item, visitor, state, depth + 1);
    }
    return;
  }
  if (!VALID_GEOMETRIES.has(geometry.type)) return;
  const walk = (value, nested = 0) => {
    if (state.coordinateCount > state.maxCoordinates) return;
    if (isCoordinate(value)) {
      state.coordinateCount += 1;
      if (coordinateIsWgs84(value))
        visitor([Number(value[0]), Number(value[1])]);
      return;
    }
    if (Array.isArray(value) && nested <= 20) {
      for (const part of value) walk(part, nested + 1);
    }
  };
  if (geometry.type === "Point") walk(geometry.coordinates);
  else if (geometry.type === "MultiPoint" || geometry.type === "LineString")
    walk(geometry.coordinates);
  else if (["MultiLineString", "Polygon"].includes(geometry.type))
    walk(geometry.coordinates);
  else if (geometry.type === "MultiPolygon") walk(geometry.coordinates);
}

export function normalizeGeoJson(
  input,
  {
    maxFeatures = DEFAULT_MAX_FEATURES,
    maxCoordinates = DEFAULT_MAX_COORDINATES,
  } = {},
) {
  const boundedFeatures = Math.max(
    1,
    Math.min(Number(maxFeatures) || DEFAULT_MAX_FEATURES, DEFAULT_MAX_FEATURES),
  );
  const boundedCoordinates = Math.max(
    1,
    Math.min(
      Number(maxCoordinates) || DEFAULT_MAX_COORDINATES,
      DEFAULT_MAX_COORDINATES,
    ),
  );
  const extracted = featureList(input, boundedFeatures);
  const features = extracted.features.filter(
    (feature) =>
      feature &&
      typeof feature === "object" &&
      feature.type === "Feature" &&
      feature.geometry &&
      VALID_GEOMETRIES.has(feature.geometry.type),
  );
  const state = { coordinateCount: 0, maxCoordinates: boundedCoordinates };
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  const geometryTypes = new Set();
  for (const feature of features) {
    geometryTypes.add(feature.geometry.type);
    visitCoordinates(
      feature.geometry,
      ([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      },
      state,
    );
    if (state.coordinateCount > boundedCoordinates) {
      throw new RangeError(
        `GeoJSON melebihi batas pratinjau ${boundedCoordinates.toLocaleString("id-ID")} koordinat.`,
      );
    }
  }
  if (
    !features.length ||
    !Number.isFinite(minLon) ||
    !Number.isFinite(minLat)
  ) {
    throw new TypeError(
      "GeoJSON tidak memiliki geometri dengan koordinat WGS84 yang dapat dipratinjau.",
    );
  }
  return {
    features,
    featureCount: extracted.featureCount,
    renderedFeatureCount: features.length,
    coordinateCount: state.coordinateCount,
    bounds: { minLon, minLat, maxLon, maxLat },
    geometryTypes: [...geometryTypes].sort(),
    truncated: extracted.featureCount > boundedFeatures,
    ignoredFeatureCount: Math.max(
      0,
      Math.min(extracted.featureCount, boundedFeatures) - features.length,
    ),
  };
}

const MAX_MERCATOR_LATITUDE = 85.0511287798066;
const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function mercatorNormalized(coordinate) {
  const longitude = Math.max(-180, Math.min(180, Number(coordinate[0])));
  const latitude = Math.max(
    -MAX_MERCATOR_LATITUDE,
    Math.min(MAX_MERCATOR_LATITUDE, Number(coordinate[1])),
  );
  const sine = Math.sin((latitude * Math.PI) / 180);
  return [
    (longitude + 180) / 360,
    0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI),
  ];
}

/**
 * Build a bounded XYZ basemap layout that uses the same Web-Mercator
 * projection as the GeoJSON overlay. No map SDK is required in the browser;
 * SVG image tiles remain ordinary image requests and vector features stay
 * crisp above them. Tile count is capped to avoid unexpectedly large requests.
 */
export function createGeoMapLayout(
  bounds,
  width = 800,
  height = 420,
  padding = 32,
  {
    maxTiles = 48,
    minZoom = 2,
    maxZoom = 17,
    tileUrlTemplate = DEFAULT_TILE_URL,
  } = {},
) {
  const northWest = mercatorNormalized([bounds.minLon, bounds.maxLat]);
  const southEast = mercatorNormalized([bounds.maxLon, bounds.minLat]);
  let minX = Math.min(northWest[0], southEast[0]);
  let maxX = Math.max(northWest[0], southEast[0]);
  let minY = Math.min(northWest[1], southEast[1]);
  let maxY = Math.max(northWest[1], southEast[1]);

  // A single point or a zero-width/height line still needs a useful map extent.
  const minimumSpan = 0.00025;
  if (maxX - minX < minimumSpan) {
    const center = (minX + maxX) / 2;
    minX = Math.max(0, center - minimumSpan / 2);
    maxX = Math.min(1, center + minimumSpan / 2);
  }
  if (maxY - minY < minimumSpan) {
    const center = (minY + maxY) / 2;
    minY = Math.max(0, center - minimumSpan / 2);
    maxY = Math.min(1, center + minimumSpan / 2);
  }

  const spanX = Math.max(maxX - minX, Number.EPSILON);
  const spanY = Math.max(maxY - minY, Number.EPSILON);
  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  const scale = Math.min(usableWidth / spanX, usableHeight / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  const viewMinX = minX + (0 - offsetX) / scale;
  const viewMaxX = minX + (width - offsetX) / scale;
  const viewMinY = minY + (0 - offsetY) / scale;
  const viewMaxY = minY + (height - offsetY) / scale;
  let zoom = Math.max(
    minZoom,
    Math.min(maxZoom, Math.floor(Math.log2(Math.max(scale, 1) / 256))),
  );
  let tiles = [];

  while (zoom >= minZoom) {
    const worldTiles = 2 ** zoom;
    const firstX = Math.floor(viewMinX * worldTiles);
    const lastX = Math.floor(viewMaxX * worldTiles);
    const firstY = Math.max(0, Math.floor(viewMinY * worldTiles));
    const lastY = Math.min(worldTiles - 1, Math.floor(viewMaxY * worldTiles));
    const count =
      Math.max(0, lastX - firstX + 1) * Math.max(0, lastY - firstY + 1);
    if (count <= maxTiles || zoom === minZoom) {
      for (let rawX = firstX; rawX <= lastX; rawX += 1) {
        const tileX = ((rawX % worldTiles) + worldTiles) % worldTiles;
        for (let tileY = firstY; tileY <= lastY; tileY += 1) {
          if (tileY < 0 || tileY >= worldTiles) continue;
          const x = offsetX + (rawX / worldTiles - minX) * scale;
          const y = offsetY + (tileY / worldTiles - minY) * scale;
          tiles.push({
            key: `${zoom}/${tileX}/${tileY}/${rawX}`,
            url: tileUrlTemplate
              .replace("{z}", String(zoom))
              .replace("{x}", String(tileX))
              .replace("{y}", String(tileY)),
            x,
            y,
            width: scale / worldTiles,
            height: scale / worldTiles,
          });
        }
      }
      break;
    }
    zoom -= 1;
  }

  return {
    minX,
    minY,
    scale,
    offsetX,
    offsetY,
    width,
    height,
    zoom,
    tiles,
  };
}

export function projectGeoCoordinate(coordinate, layout) {
  const [x, y] = mercatorNormalized(coordinate);
  return [
    layout.offsetX + (x - layout.minX) * layout.scale,
    layout.offsetY + (y - layout.minY) * layout.scale,
  ];
}

// Backward-compatible helper retained for existing consumers/tests.
export function projectCoordinate(
  coordinate,
  boundsOrLayout,
  width = 800,
  height = 420,
  padding = 28,
) {
  const layout =
    boundsOrLayout && Number.isFinite(boundsOrLayout.scale)
      ? boundsOrLayout
      : createGeoMapLayout(boundsOrLayout, width, height, padding);
  return projectGeoCoordinate(coordinate, layout);
}

function coordinatePath(points, project, close = false) {
  if (!Array.isArray(points) || !points.length) return "";
  const projected = points
    .filter(coordinateIsWgs84)
    .map((point) => project([Number(point[0]), Number(point[1])]));
  if (!projected.length) return "";
  return (
    projected
      .map(
        ([x, y], index) =>
          `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`,
      )
      .join(" ") + (close && projected.length >= 3 ? " Z" : "")
  );
}

export function geometryToSvgLayers(
  geometry,
  project,
  layers = { points: [], lines: [], polygons: [] },
  depth = 0,
) {
  if (!geometry || typeof geometry !== "object" || depth > 20) return layers;
  const coordinates = geometry.coordinates;
  switch (geometry.type) {
    case "Point": {
      if (coordinateIsWgs84(coordinates)) {
        const [x, y] = project([
          Number(coordinates[0]),
          Number(coordinates[1]),
        ]);
        layers.points.push({ x, y });
      }
      break;
    }
    case "MultiPoint":
      for (const point of Array.isArray(coordinates) ? coordinates : []) {
        if (coordinateIsWgs84(point)) {
          const [x, y] = project([Number(point[0]), Number(point[1])]);
          layers.points.push({ x, y });
        }
      }
      break;
    case "LineString": {
      const path = coordinatePath(coordinates, project);
      if (path) layers.lines.push(path);
      break;
    }
    case "MultiLineString":
      for (const line of Array.isArray(coordinates) ? coordinates : []) {
        const path = coordinatePath(line, project);
        if (path) layers.lines.push(path);
      }
      break;
    case "Polygon": {
      const path = (Array.isArray(coordinates) ? coordinates : [])
        .map((ring) => coordinatePath(ring, project, true))
        .filter(Boolean)
        .join(" ");
      if (path) layers.polygons.push(path);
      break;
    }
    case "MultiPolygon":
      for (const polygon of Array.isArray(coordinates) ? coordinates : []) {
        const path = (Array.isArray(polygon) ? polygon : [])
          .map((ring) => coordinatePath(ring, project, true))
          .filter(Boolean)
          .join(" ");
        if (path) layers.polygons.push(path);
      }
      break;
    case "GeometryCollection":
      for (const child of Array.isArray(geometry.geometries)
        ? geometry.geometries
        : []) {
        geometryToSvgLayers(child, project, layers, depth + 1);
      }
      break;
    default:
      break;
  }
  return layers;
}

export const GEOJSON_PREVIEW_LIMITS = Object.freeze({
  maxBytes: 20 * 1024 * 1024,
  maxFeatures: DEFAULT_MAX_FEATURES,
  maxCoordinates: DEFAULT_MAX_COORDINATES,
});

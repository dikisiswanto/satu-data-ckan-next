import { describe, expect, it } from "vitest";
import { geometryToSvgLayers, normalizeGeoJson, projectCoordinate } from "@/lib/geo/geojson-preview";

const polygon = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: { name: "Wajo" },
    geometry: { type: "Polygon", coordinates: [[[120.1, -4.2], [120.5, -4.2], [120.5, -4.5], [120.1, -4.5], [120.1, -4.2]]] },
  }],
};

describe("GeoJSON preview utilities", () => {
  it("normalizes FeatureCollection and computes WGS84 bounds from source coordinates", () => {
    expect(normalizeGeoJson(polygon)).toMatchObject({
      featureCount: 1,
      renderedFeatureCount: 1,
      coordinateCount: 5,
      bounds: { minLon: 120.1, maxLon: 120.5, minLat: -4.5, maxLat: -4.2 },
      geometryTypes: ["Polygon"],
      truncated: false,
    });
  });

  it("supports a bare Point geometry and draws it as an SVG marker", () => {
    const normalized = normalizeGeoJson({ type: "Point", coordinates: [120.4, -4.1] });
    const layers = geometryToSvgLayers(normalized.features[0].geometry, (coord) => projectCoordinate(coord, normalized.bounds, 800, 420));
    expect(layers.points).toHaveLength(1);
    expect(layers.points[0].x).toBeGreaterThan(0);
    expect(layers.lines).toHaveLength(0);
  });

  it("rejects non-GeoJSON and geometry without valid WGS84 coordinates", () => {
    expect(() => normalizeGeoJson({ hello: "world" })).toThrow(/GeoJSON/);
    expect(() => normalizeGeoJson({ type: "Feature", geometry: { type: "Point", coordinates: [240, -4] } })).toThrow(/koordinat WGS84/);
  });

  it("enforces coordinate limits and truncates feature collections at the feature limit", () => {
    const points = Array.from({ length: 4 }, (_, index) => ({ type: "Feature", geometry: { type: "Point", coordinates: [120 + index / 10, -4] } }));
    expect(normalizeGeoJson({ type: "FeatureCollection", features: points }, { maxFeatures: 2 })).toMatchObject({
      featureCount: 4,
      renderedFeatureCount: 2,
      truncated: true,
    });
    expect(() => normalizeGeoJson({ type: "FeatureCollection", features: points }, { maxCoordinates: 2 })).toThrow(/batas pratinjau/);
  });

  it("projects points within the SVG view box", () => {
    const normalized = normalizeGeoJson(polygon);
    const projected = projectCoordinate([120.3, -4.35], normalized.bounds, 800, 420, 24);
    expect(projected[0]).toBeGreaterThanOrEqual(0);
    expect(projected[0]).toBeLessThanOrEqual(800);
    expect(projected[1]).toBeGreaterThanOrEqual(0);
    expect(projected[1]).toBeLessThanOrEqual(420);
  });
});

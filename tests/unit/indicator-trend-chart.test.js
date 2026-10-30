import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IndicatorTrendChart } from "@/components/indicator-trend-chart";

function renderChart(observations) {
  return renderToStaticMarkup(
    createElement(IndicatorTrendChart, {
      observations,
      title: "Indeks Pembangunan Manusia",
      unit: "indeks",
    }),
  );
}

describe("IndicatorTrendChart layout stability", () => {
  it("keeps the chart frame when no numeric observations are available", () => {
    const markup = renderChart([
      { id: "a", numericValue: null, period: "2025" },
    ]);

    expect(markup).toContain("public-indicator-chart-frame");
    expect(markup).toContain("public-indicator-chart-empty");
    expect(markup).toContain(
      "Grafik akan tersedia setelah terdapat sedikitnya dua periode",
    );
    expect(markup).toContain("min-h-10");
    expect(markup).not.toContain("<svg");
  });

  it("keeps the same reserved frame when only one numeric period exists", () => {
    const markup = renderChart([
      { id: "a", numericValue: 72.1, period: "2025" },
    ]);

    expect(markup).toContain("public-indicator-chart-frame");
    expect(markup).toContain("public-indicator-chart-empty");
    expect(markup).toContain("72,1");
  });

  it("renders the trend inside the same reserved frame for comparable periods", () => {
    const markup = renderChart([
      { id: "a", numericValue: 71.4, period: "2024" },
      { id: "b", numericValue: 72.1, period: "2025" },
    ]);

    expect(markup).toContain("public-indicator-chart-frame");
    expect(markup).toContain('role="img"');
    expect(markup).toContain("72,1");
    expect(markup).not.toContain("public-indicator-chart-empty");
  });
});

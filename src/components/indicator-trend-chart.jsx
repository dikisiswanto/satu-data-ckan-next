function formatValue(value) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(
    value,
  );
}

/** Accessible lightweight SVG trend chart generated from CKAN DataStore rows. */
export function IndicatorTrendChart({
  observations = [],
  title = "Tren indikator",
  unit = "",
}) {
  const points = observations
    .filter((item) => Number.isFinite(item.numericValue))
    .slice(-36);
  const hasTrend = points.length >= 2;
  const latestPoint = points.at(-1);
  const width = 760;
  const height = 260;
  const left = 54;
  const right = 22;
  const top = 20;
  const bottom = 42;
  const values = points.map((item) => item.numericValue);
  const minValue = hasTrend ? Math.min(...values) : 0;
  const maxValue = hasTrend ? Math.max(...values) : 0;
  const spread = maxValue - minValue || Math.max(Math.abs(maxValue) * 0.1, 1);
  const x = (index) =>
    left + (index * (width - left - right)) / (points.length - 1);
  const y = (value) =>
    top + ((maxValue - value) / spread) * (height - top - bottom);
  const path = hasTrend
    ? points
        .map(
          (point, index) =>
            `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(point.numericValue).toFixed(2)}`,
        )
        .join(" ")
    : "";
  const area = hasTrend
    ? `${path} L${x(points.length - 1).toFixed(2)},${height - bottom} L${x(0).toFixed(2)},${height - bottom} Z`
    : "";
  const gridValues = hasTrend
    ? [maxValue, minValue + spread / 2, minValue]
    : [];

  return (
    <section
      className="rounded-2xl border border-line bg-white p-4 sm:p-6"
      aria-label={title}
    >
      <div className="flex min-h-[4.5rem] flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tren nilai indikator</h2>
          <p className="mt-1 min-h-10 max-w-[34rem] text-sm leading-5 text-muted">
            {hasTrend
              ? `${points.length} periode terakhir${unit ? ` · ${unit}` : ""}`
              : "Belum tersedia dua periode dengan nilai angka yang dapat dibandingkan."}
          </p>
        </div>
        <p className="min-w-20 text-right">
          <strong className="block min-h-7 text-xl tabular-nums">
            {latestPoint ? formatValue(latestPoint.numericValue) : "—"}
          </strong>
          <span className="block min-h-4 text-xs text-muted">
            {latestPoint?.period || "Nilai terkini"}
          </span>
        </p>
      </div>
      <div className="mt-5 overflow-x-auto">
        {hasTrend ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${title}. Nilai terkini ${formatValue(latestPoint.numericValue)} ${unit}.`}
            className="public-indicator-chart-frame block h-auto min-w-[520px] w-full"
          >
            {gridValues.map((value, index) => (
              <g key={`${value}-${index}`}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="#dce5ec"
                  strokeDasharray="4 5"
                />
                <text
                  x={left - 10}
                  y={y(value) + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#627586"
                >
                  {formatValue(value)}
                </text>
              </g>
            ))}
            <path d={area} fill="#dcecf8" opacity="0.8" />
            <path
              d={path}
              fill="none"
              stroke="#1769aa"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((point, index) => (
              <circle
                key={point.id ?? `${point.period}-${index}`}
                cx={x(index)}
                cy={y(point.numericValue)}
                r={index === points.length - 1 ? 5 : 2.8}
                fill={index === points.length - 1 ? "#1769aa" : "#fff"}
                stroke="#1769aa"
                strokeWidth="1.8"
              >
                <title>{`${point.period}: ${formatValue(point.numericValue)} ${point.unit || unit}`}</title>
              </circle>
            ))}
            <text x={left} y={height - 12} fontSize="11" fill="#627586">
              {points[0].period}
            </text>
            <text
              x={width - right}
              y={height - 12}
              textAnchor="end"
              fontSize="11"
              fill="#627586"
            >
              {latestPoint.period}
            </text>
          </svg>
        ) : (
          <div
            className="public-indicator-chart-frame public-indicator-chart-empty flex min-w-[520px] items-center justify-center rounded-lg bg-surface-secondary px-6 text-center text-sm leading-6 text-muted"
            role="status"
          >
            Grafik akan tersedia setelah terdapat sedikitnya dua periode dengan
            nilai angka.
          </div>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        Sumber: data indikator pada portal. Grafik hanya menampilkan nilai yang
        telah tersedia untuk umum.
      </p>
    </section>
  );
}

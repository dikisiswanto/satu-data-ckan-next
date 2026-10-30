function formatValue(value) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(value);
}

/** Accessible lightweight SVG trend chart generated from CKAN DataStore rows. */
export function IndicatorTrendChart({ observations = [], title = "Tren indikator", unit = "" }) {
  const points = observations
    .filter((item) => Number.isFinite(item.numericValue))
    .slice(-36);
  if (points.length < 2) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5" aria-label={title}>
        <h2 className="text-lg font-semibold">Tren nilai</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Grafik akan muncul setelah resource DataStore memiliki sedikitnya dua nilai numerik dengan kolom <code>period</code> dan <code>value</code>.</p>
      </section>
    );
  }
  const width = 760;
  const height = 260;
  const left = 54;
  const right = 22;
  const top = 20;
  const bottom = 42;
  const values = points.map((item) => item.numericValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue || Math.max(Math.abs(maxValue) * 0.1, 1);
  const x = (index) => left + (index * (width - left - right)) / (points.length - 1);
  const y = (value) => top + ((maxValue - value) / spread) * (height - top - bottom);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(point.numericValue).toFixed(2)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(2)},${height - bottom} L${x(0).toFixed(2)},${height - bottom} Z`;
  const gridValues = [maxValue, minValue + spread / 2, minValue];

  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-6" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Tren nilai indikator</h2><p className="mt-1 text-sm text-muted">{points.length} titik data terakhir{unit ? ` · ${unit}` : ""}</p></div>
        <p className="text-right"><strong className="block text-xl tabular-nums">{formatValue(points.at(-1).numericValue)}</strong><span className="text-xs text-muted">{points.at(-1).period}</span></p>
      </div>
      <div className="mt-5 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. Nilai terkini ${formatValue(points.at(-1).numericValue)} ${unit}.`} className="h-auto min-w-[520px] w-full">
          {gridValues.map((value, index) => <g key={`${value}-${index}`}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#dce5ec" strokeDasharray="4 5" /><text x={left - 10} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#627586">{formatValue(value)}</text></g>)}
          <path d={area} fill="#dcecf8" opacity="0.8" />
          <path d={path} fill="none" stroke="#1769aa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => <circle key={point.id ?? `${point.period}-${index}`} cx={x(index)} cy={y(point.numericValue)} r={index === points.length - 1 ? 5 : 2.8} fill={index === points.length - 1 ? "#1769aa" : "#fff"} stroke="#1769aa" strokeWidth="1.8"><title>{`${point.period}: ${formatValue(point.numericValue)} ${point.unit || unit}`}</title></circle>)}
          <text x={left} y={height - 12} fontSize="11" fill="#627586">{points[0].period}</text>
          <text x={width - right} y={height - 12} textAnchor="end" fontSize="11" fill="#627586">{points.at(-1).period}</text>
        </svg>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">Sumber: resource DataStore CKAN. Grafik tidak menginterpolasi data yang tidak tersedia.</p>
    </section>
  );
}

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export function SimpleLineChart({
  max,
  min,
  series,
  xLabels
}: {
  max: number;
  min: number;
  series: LineSeries[];
  xLabels: string[];
}) {
  const width = 640;
  const height = 220;
  const padding = 28;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  function point(value: number, index: number, count: number): string {
    const x = padding + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
    const ratio = (value - min) / Math.max(1, max - min);
    const y = padding + plotHeight - ratio * plotHeight;
    return `${x},${y}`;
  }

  return (
    <div className="overflow-auto">
      <svg aria-label="Trend chart" className="w-full" viewBox={`0 0 ${width} ${height}`} role="img">
        <line stroke="#d9e2ec" x1={padding} x2={padding} y1={padding} y2={height - padding} />
        <line stroke="#d9e2ec" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        {series.map((item) => {
          const points = item.values.map((value, index) => point(value, index, item.values.length)).join(" ");
          return (
            <g key={item.key}>
              <polyline fill="none" points={points} stroke={item.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              {item.values.map((value, index) => {
                const [cx, cy] = point(value, index, item.values.length).split(",");
                return <circle cx={cx} cy={cy} fill={item.color} key={`${item.key}-${index}`} r="4" />;
              })}
            </g>
          );
        })}
        {xLabels.map((label, index) => {
          const x = padding + (xLabels.length <= 1 ? plotWidth / 2 : (index / (xLabels.length - 1)) * plotWidth);
          return <text fill="#64748b" fontSize="10" key={label + index} textAnchor="middle" x={x} y={height - 8}>{label}</text>;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {series.map((item) => (
          <span className="flex items-center gap-2" key={item.key}>
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

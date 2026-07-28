import { useState } from "react";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: Array<number | null>;
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
  const [hoveredPoint, setHoveredPoint] = useState<{
    color: string;
    label: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);
  const width = 640;
  const height = 220;
  const padding = 40;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const validSeries = series
    .map((item) => ({
      ...item,
      points: item.values
        .map((value, index) => (value === null || value === undefined ? null : { index, value }))
        .filter((value): value is { index: number; value: number } => value !== null)
    }))
    .filter((item) => item.points.length > 0);

  function point(value: number, index: number, count: number): { x: number; y: number } {
    const x = padding + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
    const ratio = Math.min(1, Math.max(0, (value - min) / Math.max(1, max - min)));
    const y = padding + plotHeight - ratio * plotHeight;
    return { x, y };
  }

  function buildSegments(points: Array<{ index: number; value: number }>, count: number): string[] {
    const segments: string[] = [];
    let current: string[] = [];
    let previousIndex: number | null = null;

    points.forEach((dataPoint) => {
      if (previousIndex !== null && dataPoint.index !== previousIndex + 1) {
        if (current.length > 1) {
          segments.push(current.join(" "));
        }
        current = [];
      }
      const { x, y } = point(dataPoint.value, dataPoint.index, count);
      current.push(`${x},${y}`);
      previousIndex = dataPoint.index;
    });

    if (current.length > 1) {
      segments.push(current.join(" "));
    }

    return segments;
  }

  if (validSeries.length === 0) {
    return <p className="py-10 text-sm text-muted">No score data for this selection yet.</p>;
  }

  const tooltipWidth = hoveredPoint ? Math.max(62, hoveredPoint.value.toString().length * 7 + 44) : 0;
  const tooltipHeight = 22;
  const tooltipX = hoveredPoint
    ? Math.min(width - padding - tooltipWidth, Math.max(padding, hoveredPoint.x - tooltipWidth / 2))
    : 0;
  const tooltipY = hoveredPoint ? Math.max(8, hoveredPoint.y - tooltipHeight - 10) : 0;

  return (
    <div className="overflow-auto">
      <svg aria-label="Trend chart" className="w-full" viewBox={`0 0 ${width} ${height}`} role="img">
        <line stroke="#d9e2ec" x1={padding} x2={padding} y1={padding} y2={height - padding} />
        <line stroke="#d9e2ec" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        {validSeries.map((item) => {
          const segments = buildSegments(item.points, item.values.length);
          return (
            <g key={item.key}>
              {segments.map((segment, index) => (
                <polyline
                  fill="none"
                  key={`${item.key}-segment-${index}`}
                  points={segment}
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
              ))}
              {item.points.map((dataPoint) => {
                const { x, y } = point(dataPoint.value, dataPoint.index, item.values.length);
                return (
                  <circle
                    aria-label={`${item.label}: ${dataPoint.value}`}
                    className="score-trend-dot"
                    cx={x}
                    cy={y}
                    fill={item.color}
                    key={`${item.key}-${dataPoint.index}`}
                    onBlur={() => setHoveredPoint(null)}
                    onFocus={() => setHoveredPoint({ color: item.color, label: item.label, value: dataPoint.value, x, y })}
                    onMouseEnter={() => setHoveredPoint({ color: item.color, label: item.label, value: dataPoint.value, x, y })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    r="4"
                    tabIndex={0}
                  />
                );
              })}
            </g>
          );
        })}
        {hoveredPoint ? (
          <g className="score-trend-tooltip" pointerEvents="none">
            <rect
              fill="#0f172a"
              height={tooltipHeight}
              opacity="0.94"
              rx="11"
              width={tooltipWidth}
              x={tooltipX}
              y={tooltipY}
            />
            <circle cx={tooltipX + 11} cy={tooltipY + tooltipHeight / 2} fill={hoveredPoint.color} r="3" />
            <text
              fill="#ffffff"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              x={tooltipX + tooltipWidth / 2 + 6}
              y={tooltipY + 14}
            >
              {hoveredPoint.value}
            </text>
          </g>
        ) : null}
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

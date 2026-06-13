import { asString } from "../../services/visualValidationService";
import { AxisFrame, getNumericRecordValue, getRecordArray, getTitle, PADDING, SVG_HEIGHT, SVG_WIDTH, VisualFrame } from "./chartUtils";

export function BarGraphRenderer({ data }: { data: Record<string, unknown> }) {
  const bars = getRecordArray(data.bars);
  const maxValue = Math.max(...bars.map((bar) => getNumericRecordValue(bar, "value", 0)), 1);
  const chartWidth = SVG_WIDTH - PADDING * 2;
  const barWidth = bars.length > 0 ? chartWidth / bars.length - 10 : 0;

  return (
    <VisualFrame>
      <AxisFrame title={getTitle(data)} />
      {bars.map((bar, index) => {
        const value = getNumericRecordValue(bar, "value", 0);
        const height = (value / maxValue) * (SVG_HEIGHT - PADDING * 2);
        const x = PADDING + index * (chartWidth / bars.length) + 5;
        const y = SVG_HEIGHT - PADDING - height;
        return (
          <g key={`${asString(bar.label, String(index))}-${index}`}>
            <rect fill="#14b8a6" height={height} rx="2" width={Math.max(barWidth, 8)} x={x} y={y} />
            <text className="fill-slate-600 text-xs" textAnchor="middle" x={x + Math.max(barWidth, 8) / 2} y={SVG_HEIGHT - 16}>
              {asString(bar.label, String(index + 1))}
            </text>
          </g>
        );
      })}
    </VisualFrame>
  );
}

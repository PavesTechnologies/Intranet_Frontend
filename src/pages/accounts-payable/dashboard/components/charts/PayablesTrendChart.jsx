import React from "react";
import { PageCard } from "../../../../../components/Cards/PageCard";
import { Fonts } from "../../../../../components/Fonts/Fonts";
import { formatCompactCurrency } from "../../../utils/formatters";

const WIDTH = 400;
const HEIGHT = 160;
const PADDING = 24;

export default function PayablesTrendChart({ data = [] }) {
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((point, idx) => {
    const x = PADDING + (idx * (WIDTH - PADDING * 2)) / Math.max(1, data.length - 1);
    const y = HEIGHT - PADDING - ((point.value - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y, ...point };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${points[0]?.x},${HEIGHT - PADDING} ${linePoints} ${points[points.length - 1]?.x},${HEIGHT - PADDING}`;

  return (
    <PageCard className="p-4">
      <h3 className={Fonts.subheading}>Payables Trend</h3>
      <p className="mb-3 text-xs text-slate-400">Total outstanding balance, last {data.length} months</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Payables trend line chart">
        <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="#e1e0d9" />
        <polygon points={areaPoints} fill="#2a78d6" fillOpacity="0.15" />
        <polyline points={linePoints} fill="none" stroke="#2a78d6" strokeWidth="2" strokeLinecap="round" />
        {points.map((point, idx) => (
          <circle
            key={point.month}
            cx={point.x}
            cy={point.y}
            r={idx === points.length - 1 ? 5 : 4}
            fill="#fff"
            stroke="#2a78d6"
            strokeWidth="2"
          >
            <title>{`${point.month}: ${formatCompactCurrency(point.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        {data.map((point) => (
          <span key={point.month}>{point.month}</span>
        ))}
      </div>
    </PageCard>
  );
}

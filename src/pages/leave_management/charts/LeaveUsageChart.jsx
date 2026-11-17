import { useState } from "react";
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from "recharts";
import Button from "../../../components/Button/Button";

const LEAVE_THEMES = {
  EARNED_LEAVE:       { from: "#34d399", to: "#059669", bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200" },
  SICK_LEAVE:         { from: "#f87171", to: "#dc2626", bg: "bg-red-50",      text: "text-red-700",      ring: "ring-red-200"     },
  COMPENSATORY_LEAVE: { from: "#60a5fa", to: "#2563eb", bg: "bg-blue-50",     text: "text-blue-700",     ring: "ring-blue-200"    },
  UNPAID_LEAVE:       { from: "#a8a29e", to: "#57534e", bg: "bg-stone-50",    text: "text-stone-700",    ring: "ring-stone-200"   },
  DEFAULT:            { from: "#a78bfa", to: "#7c3aed", bg: "bg-violet-50",   text: "text-violet-700",   ring: "ring-violet-200"  },
};

// Same "active shape" pattern as CustomActiveShapePieChart.jsx — the hovered
// slice grows a thin highlighted outer ring instead of just re-coloring.
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 2}
        outerRadius={outerRadius + 4}
        fill={fill}
      />
    </g>
  );
};

function LeaveRing({ used, remaining, isUnpaid, theme, size = 98 }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = isUnpaid
    ? [{ name: "Unpaid", value: 1 }]
    : [
        { name: "Remaining", value: Math.max(remaining, 0) },
        { name: "Used", value: Math.max(used, 0) },
      ];

  const active = activeIndex != null ? data[activeIndex] : null;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size, overflow: "visible" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2 - 4}
            startAngle={90}
            endAngle={-270}
            activeIndex={activeIndex ?? -1}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            isAnimationActive
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={isUnpaid || entry.name === "Remaining" ? theme.to : "#f1f5f9"}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {isUnpaid ? (
          <span className="text-base font-bold text-stone-700">∞</span>
        ) : (
          <>
            {/* <span className="text-sm font-bold text-gray-800 leading-none">{used}</span> */}
            <span className="text-[12px] font-semibold text-gray-500 mt-0.5">{Math.max(remaining, 0)}</span>
            {/* <span className="text-[10px] font-medium text-gray-400 ">Available</span> */}
          </>
        )}
      </div>

      {/* Tooltip — fixed above the chart, doesn't chase the cursor */}
      {active && (
        <div
          className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 z-20
            pointer-events-none whitespace-nowrap
            bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-1.5"
        >
          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: active.name === "Remaining" ? theme.to : "#cbd5e1" }}
            />
            <span className="font-semibold text-gray-800">{active.value}</span> days · {active.name}
          </p>
        </div>
      )}
    </div>
  );
}

export default function LeaveUsageChart({
  leave,
  displayName,
  year,
  accentClass,
  onViewDetails,
  style,
}) {
  const { accruedLeaves, usedLeaves, leaveType, remainingLeaves, totalLeaves } = leave;
  const leaveName = leaveType?.leaveName ?? "DEFAULT";
  const isUnpaid = leaveName === "UNPAID_LEAVE";
  const isCompOff = leaveName === "COMPENSATORY_LEAVE";
  const theme = LEAVE_THEMES[leaveName] ?? LEAVE_THEMES.DEFAULT;

  const remaining = Math.max(remainingLeaves, 0);

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border 
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        p-5 flex flex-col gap-4
      `}
      style={style}
    >
      {/* Card header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {displayName}
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">{year} Balance</p>
        </div>
        {onViewDetails && (
          <Button
            onClick={onViewDetails}
            variant="link"
            className="text-[11px] font-medium text-indigo-500 hover:text-indigo-700 ml-2 whitespace-nowrap"
          >
            Details →
          </Button>
        )}
      </div>

      <div className="py-1">
        {/* flex-col on small cards, flex-row only when card is wide enough */}
        <div className="flex flex-col items-center gap-5 [@media(min-width:320px)]:flex-row [@media(min-width:320px)]:items-center">

          <LeaveRing used={usedLeaves} remaining={remaining} isUnpaid={isUnpaid} theme={theme} size={92} />

          {/* Stats — takes remaining width, never overflows */}
          <div className="w-full flex-1 space-y-1 min-w-0 overflow-hidden">
            <div className="px-1.5 py-0 rounded-md transition-colors hover:bg-gray-50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Used</span>
                <span className="text-xs font-semibold text-gray-700 tabular-nums">{usedLeaves} days</span>
              </div>
              {/* <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: isUnpaid || !accruedLeaves ? "0%" : `${Math.min((usedLeaves / accruedLeaves) * 100, 100)}%`,
                    background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
                  }} /> 
              </div> */}
            </div>

            {!isCompOff && !isUnpaid && (
              <div className="px-1.5 py-0 rounded-md transition-colors hover:bg-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Accrued</span>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{accruedLeaves} days</span>
                </div>
                {/* <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 opacity-40"
                    style={{
                      width: totalLeaves > 0 ? `${Math.min((accruedLeaves / totalLeaves) * 100, 100)}%` : "0%",
                      background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
                    }} />
                </div> */}
              </div>
            )}

            <div className="flex justify-between items-center px-1.5 py-0 rounded-md transition-colors hover:bg-gray-50">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Remaining</span>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                {isUnpaid ? "∞" : `${remaining.toFixed(2)} days`}
              </span>
            </div>
            <div className="flex justify-between items-center px-1.5 py-0 rounded-md transition-colors hover:bg-gray-50">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Leaves</span>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                {isUnpaid ? "∞" : `${totalLeaves.toFixed(2)} days`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

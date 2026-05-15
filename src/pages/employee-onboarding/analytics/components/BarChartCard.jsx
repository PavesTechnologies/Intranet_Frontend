import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Rectangle,
} from "recharts";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import RawDataModal from "./RawDataModal";
import ViewRawButton from "./ViewRawButton";

const renderCircleLegend = ({ payload }) => {
  if (!payload) return null;

  return (
    <div className="mt-3 flex flex-wrap justify-center gap-5 text-sm">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const renderCustomTooltip = ({ active, payload, label, title }) => {
  if (!active || !payload || !payload.length) return null;

  const isStacked = payload.length > 1;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <div className="mb-1 font-semibold text-slate-900">
        {title ? `${title} : ${label}` : label}
      </div>

      {isStacked ? (
        <>
          {payload.map((item, index) =>
            item.value ? (
              <div key={index} style={{ color: item.color }}>
                {item.name} : {item.value}
              </div>
            ) : null,
          )}
          <div className="mt-1 font-semibold text-slate-900">
            Total : {payload.reduce((sum, item) => sum + (item.value || 0), 0)}
          </div>
        </>
      ) : (
        <div style={{ color: payload[0].color }}>
          value : {payload[0].value}
        </div>
      )}
    </div>
  );
};

const buildBarShape = (bars) => (props) => {
  const { payload, dataKey } = props;
  const currentIndex = bars.findIndex((bar) => bar.key === dataKey);
  const hasVisibleBarAbove = bars
    .slice(currentIndex + 1)
    .some((bar) => (payload?.[bar.key] || 0) > 0);

  return (
    <Rectangle
      {...props}
      radius={hasVisibleBarAbove ? [0, 0, 0, 0] : [6, 6, 0, 0]}
    />
  );
};

export default function BarChartCard({
  title,
  data = [],
  xKey,
  bars,
  accentColor,
}) {
  const [showRaw, setShowRaw] = useState(false);

  const processedData = data.map((item) => {
    const total = bars.reduce((sum, bar) => sum + (item[bar.key] || 0), 0);
    return { ...item, total };
  });

  return (
    <>
      <PageCard
        className="relative overflow-hidden rounded-2xl border-slate-200 bg-white"
      >
        <span
          className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
          style={{
            backgroundColor: accentColor || bars?.[0]?.color || "#6366F1",
          }}
        />
        <PageCardContent className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <ViewRawButton onClick={() => setShowRaw(true)} />
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedData}
                barGap={0}
                barCategoryGap="22%"
                maxBarSize={40}
              >
                <CartesianGrid strokeDasharray="2 2" stroke="#E2E8F0" />
                <XAxis dataKey={xKey} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  content={(props) =>
                    renderCustomTooltip({
                      ...props,
                      title: title.includes("Experience")
                        ? "Experience"
                        : title.includes("Age")
                          ? "Age of Employees"
                          : "",
                    })
                  }
                />
                <Legend content={renderCircleLegend} />

                {bars.map((bar, index) => (
                  <Bar
                    key={index}
                    dataKey={bar.key}
                    fill={bar.color}
                    stackId={bars.length > 1 ? "a" : undefined}
                    barSize={50}
                    stroke="none"
                    shape={buildBarShape(bars)}
                  >
                    <LabelList
                      dataKey={bar.key}
                      position="center"
                      formatter={(value) => (value === 0 ? "" : value)}
                      style={{
                        fill: "#fff",
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PageCardContent>
      </PageCard>

      {showRaw && (
        <RawDataModal
          title={title}
          data={data}
          onClose={() => setShowRaw(false)}
        />
      )}
    </>
  );
}

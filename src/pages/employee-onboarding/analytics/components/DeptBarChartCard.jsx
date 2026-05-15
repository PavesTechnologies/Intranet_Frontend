import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import RawDataModal from "./RawDataModal";
import ViewRawButton from "./ViewRawButton";

export default function DeptBarChartCard({
  title,
  data = [],
  xKey,
  bars,
  accentColor,
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <>
      <PageCard
        className="relative mt-5 overflow-hidden rounded-2xl border-slate-200 bg-white"
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

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {bars.map((bar, index) => (
                  <Bar
                    key={index}
                    dataKey={bar.key}
                    fill={bar.color}
                    radius={[4, 4, 0, 0]}
                  />
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

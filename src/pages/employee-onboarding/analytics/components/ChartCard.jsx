import { useState } from "react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import DonutChart from "./DonutChart";
import RawDataModal from "./RawDataModal";
import ViewRawButton from "./ViewRawButton";

export default function ChartCard({ title, data, total, colors, accentColor }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <>
      <PageCard
        className="relative h-full min-h-[330px] overflow-hidden rounded-2xl border-slate-200 bg-white"
      >
        <span
          className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
          style={{ backgroundColor: accentColor || colors?.[0] || "#6366F1" }}
        />
        <PageCardContent className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <ViewRawButton onClick={() => setShowRaw(true)} />
          </div>

          <div className="flex min-h-[250px] flex-col items-center justify-center gap-8 xl:flex-row xl:items-center xl:justify-start">
            <div className="flex min-w-[280px] justify-center">
              <DonutChart
                data={data}
                total={total}
                colors={colors}
                size={270}
                innerRadius={62}
                outerRadius={118}
              />
            </div>

            <div className="w-full max-w-[260px] space-y-3 text-base text-slate-700">
              {[...(data || [])]
                .sort((a, b) => b.value - a.value)
                .map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full"
                      style={{
                        background: item.color || colors?.[index % colors.length] || "#ccc",
                      }}
                    />
                    <span>
                      {item.label} <b>{item.value}</b>
                    </span>
                  </div>
                ))}
            </div>
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

import React from "react";

/**
 * Small KPI card row (e.g. Total / Active / Inactive) shared across the
 * Admin master-data panels (Billing Type today, other masters later).
 * items: [{ label, value, tone?: "neutral" | "success" | "danger" }]
 */
const TONE_STYLES = {
  neutral: { icon: "bg-[#0A0082]/10 text-[#0A0082]", value: "text-slate-800" },
  success: { icon: "bg-emerald-100 text-emerald-700", value: "text-emerald-700" },
  danger: { icon: "bg-rose-100 text-rose-700", value: "text-rose-700" },
};

const MasterStatCards = ({ items = [] }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item, idx) => {
        const tone = TONE_STYLES[item.tone] || TONE_STYLES.neutral;
        const isInteractive = typeof item.onClick === "function";
        const Card = isInteractive ? "button" : "div";
        return (
          <Card
            key={item.key || idx}
            type={isInteractive ? "button" : undefined}
            onClick={item.onClick}
            aria-pressed={isInteractive ? Boolean(item.active) : undefined}
            className={`flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left font-[inherit] shadow-sm transition ${isInteractive ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082] focus-visible:ring-offset-2" : ""
              } ${item.active ? "border-[#0A0082]/40 ring-1 ring-[#0A0082]/15" : "border-slate-200"}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${tone.value}`}>{item.value}</p>
            </div>
            {item.icon && (
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tone.icon}`}>
                {item.icon}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default MasterStatCards;

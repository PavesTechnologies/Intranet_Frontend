import React from "react";
import ARKPICard from "./ARKPICard";

const TONE_COLORS = {
  neutral: "bg-[#0A0082] text-white",
  success: "bg-emerald-600 text-white",
  danger: "bg-rose-600 text-white",
};

const MasterStatCards = ({ items = [] }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {items.map((item, idx) => {
      const isInteractive = typeof item.onClick === "function";
      return (
        <button
          key={item.key || idx}
          type="button"
          onClick={item.onClick}
          aria-pressed={isInteractive ? Boolean(item.active) : undefined}
          className="w-full rounded-xl text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <ARKPICard
            label={item.label}
            value={item.value}
            icon={item.icon}
            color={TONE_COLORS[item.tone] || TONE_COLORS.neutral}
            active={Boolean(item.active)}
            className="h-full w-full"
          />
        </button>
      );
    })}
  </div>
);

export default MasterStatCards;

import React from "react";
import { KPICard } from "../../../components/kpi/KPI";

const KPISection = ({ items = [] }) => {
  return (
    <div className="flex flex-nowrap gap-4 overflow-x-auto">
      {items.map((item) => (
        <KPICard
          key={item.label}
          label={item.label}
          value={item.value}
          icon={item.icon}
          color={item.iconWrapperClassName || "bg-slate-100 text-slate-700"}
          className="min-w-[220px] flex-1"
        />
      ))}
    </div>
  );
};

export default KPISection;

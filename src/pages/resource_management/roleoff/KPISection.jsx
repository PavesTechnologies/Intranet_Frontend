import React from "react";
import { KPICard } from "../../../components/kpi/KPI";

const KPISection = ({ items = [] }) => {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <KPICard
          key={item.label}
          label={item.label}
          value={item.value}
          icon={item.icon}
          color={item.iconWrapperClassName || "bg-slate-100 text-slate-700"}
          className="h-full w-full"
        />
      ))}
    </div>
  );
};

export default KPISection;

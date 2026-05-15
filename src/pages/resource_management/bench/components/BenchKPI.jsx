import React from "react";
import { KPICard } from "../../../../components/kpi/KPI";
import {
  ProjectsIcon,
  SecurityAlertIcon,
  TeamIcon,
  ZapIcon,
} from "@/components/icons";

const ICONS = {
  "Bench Resources": ProjectsIcon,
  "Ready Now": ZapIcon,
  "Internal Pool": TeamIcon,
  "Cost / Risk Watch": SecurityAlertIcon,
};

const BenchKPI = ({ items = [] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = ICONS[item.label] || ProjectsIcon;
        return (
          <KPICard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={<Icon className="h-5 w-5" />}
            color={item.iconClassName || "border-slate-100 bg-slate-50 text-slate-700"}
          />
        );
      })}
    </div>
  );
};

export default BenchKPI;

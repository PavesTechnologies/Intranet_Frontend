import React from "react";
import { cn } from "@/lib/utils";

const KPISection = ({ items = [] }) => {
  return (
    <div className="flex flex-nowrap gap-4 overflow-x-auto">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
              item.iconWrapperClassName || "bg-slate-100 text-slate-700",
            )}
          >
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-xs font-medium tracking-tight text-slate-500">
              {item.label}
            </p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {item.value}
            </p>
            {item.helper ? (
              <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPISection;

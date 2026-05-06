import React from "react";
import { Briefcase, ShieldAlert, Sparkles, Users } from "lucide-react";

const ICONS = {
  "Bench Resources": Briefcase,
  "Ready Now": Sparkles,
  "Internal Pool": Users,
  "Cost / Risk Watch": ShieldAlert,
};

const BenchKPI = ({ items = [] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = ICONS[item.label] || Briefcase;

        return (
          <div
            key={item.label}
            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md group"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${item.iconClassName || "border-slate-100 bg-slate-50 text-slate-700"} group-hover:scale-105 transition-transform duration-300`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-black capitalize tracking-widest text-slate-400">{item.label}</p>
              <p className="text-2xl font-black tracking-tight text-slate-900">{item.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BenchKPI;

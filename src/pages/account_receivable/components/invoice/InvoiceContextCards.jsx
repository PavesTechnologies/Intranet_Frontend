import React from "react";
import { Briefcase, Building2, Calendar, DollarSign } from "lucide-react";

/**
 * InvoiceContextCards
 * Displays four compact horizontal information cards:
 * 1. Project
 * 2. Client
 * 3. Billing Period
 * 4. Currency
 */
export default function InvoiceContextCards({
  projectName = "—",
  clientName = "—",
  billingPeriod = "—",
  currency = "USD",
}) {
  const cards = [
    {
      label: "Project",
      value: projectName,
      icon: Briefcase,
    },
    {
      label: "Client",
      value: clientName,
      icon: Building2,
    },
    {
      label: "Billing Period",
      value: billingPeriod,
      icon: Calendar,
    },
    {
      label: "Currency",
      value: currency,
      icon: DollarSign,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-shadow hover:shadow-xs"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50/80 text-indigo-700">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {c.label}
              </span>
              <span
                className="mt-0.5 block truncate text-sm font-bold text-slate-800"
                title={typeof c.value === "string" ? c.value : undefined}
              >
                {c.value || "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

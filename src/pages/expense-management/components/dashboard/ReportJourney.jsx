import React from "react";
import { BadgeCheck, FilePen, Landmark, ShieldCheck, Undo2, UserCheck } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

// Where the employee's expense reports are right now, as the five steps every report goes through.
// Counts come from the backend's `pipeline`. Amounts are left to the ledgers, so no figure is shown twice.
// Reports sent back for correction sit outside the line, so they are shown as their own callout.

const STEPS = {
  draft: { kpi: "draft", icon: FilePen, caption: "Not submitted yet" },
  approval: { kpi: "approvals", icon: UserCheck, caption: "With your manager" },
  finance: { kpi: "finance", icon: ShieldCheck, caption: "Being verified" },
  ap: { kpi: "payment", icon: Landmark, caption: "Queued for payment" },
  paid: { kpi: "paid", icon: BadgeCheck, caption: "Money received" },
};

export default function ReportJourney({ pipeline = [], byKey, currency }) {
  const stages = pipeline.filter((s) => STEPS[s.key]);
  if (!stages.length) return null;

  const inFlight = stages.filter((s) => ["approval", "finance", "ap"].includes(s.key)).reduce((a, s) => a + Number(s.count || 0), 0);
  const returnedValue = byKey.action ? Number(byKey.action.value) || 0 : 0;

  return (
    <div data-journey className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0082]/5 px-3 py-1 text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0A0082]" aria-hidden="true" />
          <span className="font-semibold tabular-nums text-[#0a174e]">{inFlight}</span> report{inFlight === 1 ? "" : "s"} moving through approval
        </span>
        {returnedValue > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-rose-700">
            <Undo2 size={12} aria-hidden="true" />
            Sent back to you: <span className="font-semibold tabular-nums">{formatMoney(returnedValue, currency)}</span>
          </span>
        )}
      </div>

      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-0">
        {stages.map((s, i) => {
          const step = STEPS[s.key];
          const Icon = step.icon;
          const count = Number(s.count || 0);
          const active = count > 0;
          const done = s.key === "paid";
          return (
            <li key={s.key} data-stage={s.key} className="relative flex flex-col items-center text-center lg:px-2">
              {/* connector to the next step (wide screens only) */}
              {i < stages.length - 1 && (
                <span aria-hidden="true" className="absolute left-1/2 top-5 hidden h-0.5 w-full bg-gradient-to-r from-[#0A0082]/25 to-[#0A0082]/10 lg:block" />
              )}
              <span
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl ring-4 ring-white transition ${
                  active
                    ? done
                      ? "bg-emerald-500 text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.8)]"
                      : "bg-[#0A0082] text-white shadow-[0_8px_20px_-8px_rgba(10,0,130,0.8)]"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {active && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3d72] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {count}
                  </span>
                )}
              </span>
              <p className={`mt-2 text-sm font-semibold ${active ? "text-[#0a174e]" : "text-slate-500"}`}>{s.label}</p>
              <p className="text-[11px] text-slate-400">{step.caption}</p>
              <p className={`mt-1 text-xs tabular-nums ${active ? "font-semibold text-slate-700" : "text-slate-400"}`}>
                {count} report{count === 1 ? "" : "s"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

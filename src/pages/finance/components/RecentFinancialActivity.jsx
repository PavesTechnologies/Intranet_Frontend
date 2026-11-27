import { useNavigate } from "react-router-dom";
import { Receipt, FileText, HandCoins, History, ChevronRight } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";
import { formatInrFull, formatShortDate } from "../utils/financeFormatters";

const MODULES = {
  ap: { label: "Accounts Payable", Icon: FileText },
  ar: { label: "Accounts Receivable", Icon: HandCoins },
  xms: { label: "Expense Management", Icon: Receipt },
};

const STATUS = {
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  "in-progress": { label: "In Progress", cls: "bg-[#0A0082]/[0.06] text-[#0A0082] ring-[#0A0082]/20", dot: "bg-[#0A0082]" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
};

/** `moduleLinks` maps module id → route, set only for modules the user can open. */
export default function RecentFinancialActivity({ items, moduleLinks = {}, className = "" }) {
  const navigate = useNavigate();
  return (
    <FinanceSectionCard title="Recent Financial Activity" subtitle="Latest events across finance modules" icon={History} className={className}>
      <div className="-mx-4 -mb-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5 font-semibold">Activity</th>
              <th className="px-4 py-2.5 font-semibold">Module</th>
              <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="w-8 px-3 py-2.5"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((row) => {
              const status = STATUS[row.status] || STATUS.pending;
              const mod = MODULES[row.module];
              const ModIcon = mod?.Icon;
              const to = moduleLinks[row.module];
              return (
                <tr
                  key={row.id}
                  onClick={to ? () => navigate(to) : undefined}
                  className={`group transition ${to ? "cursor-pointer hover:bg-[#0A0082]/[0.03]" : ""}`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {to ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(to);
                        }}
                        className="text-left group-hover:text-[#0A0082] focus:outline-none focus-visible:underline"
                      >
                        {row.activity}
                      </button>
                    ) : (
                      row.activity
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      {ModIcon && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0A0082]/[0.06] text-[#0A0082]" aria-hidden="true">
                          <ModIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {mod?.label || row.module}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatInrFull(row.amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${status.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                      {status.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{formatShortDate(row.date)}</td>
                  <td className="px-3 py-2.5">
                    {to && <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0A0082]" aria-hidden="true" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </FinanceSectionCard>
  );
}

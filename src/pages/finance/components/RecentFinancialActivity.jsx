import FinanceSectionCard from "./FinanceSectionCard";
import { formatInrFull, formatShortDate } from "../utils/financeFormatters";

const MODULE_LABELS = { ap: "Accounts Payable", ar: "Accounts Receivable", xms: "Expense Management" };

const STATUS = {
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  "in-progress": { label: "In Progress", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 ring-red-200" },
};

export default function RecentFinancialActivity({ items, className = "" }) {
  return (
    <FinanceSectionCard title="Recent Financial Activity" subtitle="Latest events across finance modules" accent="bg-gray-400" className={className}>
      <div className="-mx-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-gray-100 bg-gray-50/70 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2 font-medium">Activity</th>
              <th className="px-4 py-2 font-medium">Module</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((row) => {
              const status = STATUS[row.status] || STATUS.pending;
              return (
                <tr key={row.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 text-gray-800">{row.activity}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{MODULE_LABELS[row.module] || row.module}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-900">{formatInrFull(row.amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${status.cls}`}>{status.label}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{formatShortDate(row.date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </FinanceSectionCard>
  );
}

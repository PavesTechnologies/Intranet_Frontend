import { useNavigate } from "react-router-dom";
import FinanceSectionCard from "./FinanceSectionCard";

/**
 * Shortcut buttons to the existing module destinations. Always shown (current
 * phase); the destination routes keep their own guards.
 */
export default function FinanceQuickActions({ modules, reportsRoute, className = "" }) {
  const navigate = useNavigate();
  const actions = [
    { id: "ap", label: "Open Accounts Payable", to: modules.ap.to, cls: "bg-[#1e1b7b] hover:bg-[#16135e]" },
    { id: "ar", label: "Review Receivables", to: modules.ar.to, cls: "bg-pink-600 hover:bg-pink-700" },
    { id: "xms", label: "Review Expenses", to: modules.xms.to, cls: "bg-emerald-600 hover:bg-emerald-700" },
    { id: "reports", label: "Financial Reports", to: reportsRoute, cls: "bg-blue-600 hover:bg-blue-700" },
  ];

  return (
    <FinanceSectionCard title="Quick Actions" accent="bg-indigo-600" className={className}>
      <div className="flex flex-wrap gap-2.5">
        {actions.map(({ id, label, to, cls }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(to)}
            className={`rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 ${cls}`}
          >
            {label}
          </button>
        ))}
      </div>
    </FinanceSectionCard>
  );
}

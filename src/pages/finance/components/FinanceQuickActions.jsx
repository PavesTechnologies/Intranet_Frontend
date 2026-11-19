import { useNavigate } from "react-router-dom";
import { FileText, HandCoins, Receipt, BarChart3, ArrowUpRight, Zap } from "lucide-react";
import FinanceSectionCard from "./FinanceSectionCard";

/**
 * Shortcut tiles to the existing module destinations. Always shown (current
 * phase); the destination routes keep their own guards.
 */
export default function FinanceQuickActions({ modules, reportsRoute, className = "" }) {
  const navigate = useNavigate();
  const actions = [
    { id: "ap", label: "Open Accounts Payable", to: modules.ap.to, Icon: FileText, primary: true },
    { id: "ar", label: "Review Receivables", to: modules.ar.to, Icon: HandCoins },
    { id: "xms", label: "Review Expenses", to: modules.xms.to, Icon: Receipt },
    { id: "reports", label: "Financial Reports", to: reportsRoute, Icon: BarChart3 },
  ];

  return (
    <FinanceSectionCard title="Quick Actions" subtitle="Jump straight into common tasks" icon={Zap} className={className}>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map(({ id, label, to, Icon, primary }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(to)}
            className={`group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-[13px] font-semibold leading-snug transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 focus-visible:ring-offset-2 ${
              primary
                ? "border-transparent bg-[#0A0082] text-white shadow-sm hover:bg-[#080066]"
                : "border-slate-200 bg-white text-slate-800 hover:border-[#0A0082]/30 hover:bg-[#0A0082]/[0.03]"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                primary ? "bg-white/15 text-white" : "bg-[#0A0082]/[0.07] text-[#0A0082]"
              }`}
              aria-hidden="true"
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 pr-4">{label}</span>
            <ArrowUpRight
              className={`absolute right-2.5 top-2.5 h-4 w-4 shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
                primary ? "text-white/70" : "text-slate-400 group-hover:text-[#0A0082]"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </FinanceSectionCard>
  );
}

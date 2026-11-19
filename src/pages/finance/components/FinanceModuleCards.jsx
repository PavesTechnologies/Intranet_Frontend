import { useNavigate } from "react-router-dom";
import { Receipt, ArrowRight, Layers } from "lucide-react";
import ApModuleIcon from "../../../components/icons/ApModuleIcon";
import ArModuleIcon from "../../../components/icons/ArModuleIcon";
import FinanceSectionCard from "./FinanceSectionCard";

const MODULE_META = {
  ar: {
    name: "Accounts Receivable",
    desc: "Customer invoices, collections, outstanding balances and customer TDS credits.",
    Icon: ArModuleIcon,
  },
  ap: {
    name: "Accounts Payable",
    desc: "Vendor invoices, procurement, invoice approvals, payments, GST and TDS operations.",
    Icon: ApModuleIcon,
  },
  xms: {
    name: "Expense Management",
    desc: "Employee claims, reimbursements, policy checks and department spending.",
    Icon: Receipt,
  },
};

const ORDER = ["ar", "ap", "xms"];

/**
 * Primary entry points into each finance application. All three are shown to
 * every user in the current phase; each card is fully clickable and navigates
 * to the existing module dashboard, whose own route guard still enforces access.
 */
export default function FinanceModuleCards({ modules, metrics = {}, className = "" }) {
  const navigate = useNavigate();

  return (
    <FinanceSectionCard title="Finance Modules" subtitle="Select a module to open its dashboard" icon={Layers} className={className}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ORDER.map((id) => {
          const { name, desc, Icon } = MODULE_META[id];
          const go = () => navigate(modules[id].to);
          return (
            <div
              key={id}
              role="link"
              tabIndex={0}
              aria-label={`Open ${name}`}
              onClick={go}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  go();
                }
              }}
              className="group flex h-full cursor-pointer flex-col rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-3.5 transition hover:-translate-y-0.5 hover:border-[#0A0082]/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A0082]/[0.07] text-[#0A0082] transition group-hover:bg-[#0A0082] group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-2.5 text-sm font-semibold text-slate-900">{name}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500" title={desc}>{desc}</p>
              {metrics[id] && (
                <p className="mt-auto flex items-center justify-between gap-2 mt-3 border-t border-slate-100 pt-2.5 text-xs font-semibold text-[#0A0082]">
                  <span>{metrics[id]}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </p>
              )}
            </div>
          );
        })}
      </div>
    </FinanceSectionCard>
  );
}

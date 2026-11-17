import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import ApModuleIcon from "../../../components/icons/ApModuleIcon";
import ArModuleIcon from "../../../components/icons/ArModuleIcon";
import FinanceSectionCard from "./FinanceSectionCard";

const MODULE_META = {
  ar: {
    name: "Accounts Receivable",
    desc: "Customer invoices, collections, outstanding balances and customer TDS credits.",
    Icon: ArModuleIcon,
    iconCls: "text-emerald-600",
    hover: "hover:border-emerald-300",
  },
  ap: {
    name: "Accounts Payable",
    desc: "Vendor invoices, procurement, invoice approvals, payments, GST and TDS operations.",
    Icon: ApModuleIcon,
    iconCls: "text-indigo-600",
    hover: "hover:border-indigo-300",
  },
  xms: {
    name: "Expense Management",
    desc: "Employee claims, reimbursements, policy checks and department spending.",
    Icon: Receipt,
    iconCls: "text-pink-600",
    hover: "hover:border-pink-300",
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
    <FinanceSectionCard
      title="Finance Modules"
      accent="bg-amber-500"
      linkLabel="Select a module to open its dashboard"
      className={className}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ORDER.map((id) => {
          const { name, desc, Icon, iconCls, hover } = MODULE_META[id];
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
              className={`group flex h-full cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-3.5 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${hover}`}
            >
              <Icon className={`h-5 w-5 ${iconCls}`} />
              <h3 className="mt-4 text-sm font-semibold text-gray-900">{name}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{desc}</p>
              {metrics[id] && (
                <p className="mt-auto pt-3 text-[11px] font-semibold text-blue-600 group-hover:underline">
                  {metrics[id]} →
                </p>
              )}
            </div>
          );
        })}
      </div>
    </FinanceSectionCard>
  );
}

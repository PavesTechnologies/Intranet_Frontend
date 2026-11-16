import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Receipt, Landmark } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import AppCard from "../../components/Cards/AppCard";
import ApModuleIcon from "../../components/icons/ApModuleIcon";
import ArModuleIcon from "../../components/icons/ArModuleIcon";
import { XMS_EVERYONE, AR_MAKER_ROLES, AR_CHECKER_ROLES } from "../../config/sidebarConfig";
import { AP_ALL_ROLES } from "../accounts-payable/constants/apRoles";
import { AP_ROUTES } from "../accounts-payable/constants/routes";
import { isFinanceEnabled } from "../../utils/applicationRoutes";

// Finance Management landing page — the entry point when a user switches
// from Paves Intranet to Finance via the Application Switcher. Each card is
// gated by the same role sets that already gate the corresponding sidebar
// flyout (see Sidebar.jsx), so this page never surfaces a module the user
// can't actually open.
const FinanceDashboard = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  // Global kill switch (public/config.js FINANCE_TOGGLE) — closes off direct
  // URL access too, not just the Application Switcher entry point.
  if (!isFinanceEnabled()) {
    return <Navigate to="/dashboard" replace />;
  }

  // AR is split Maker (Finance Executive)/Checker (Finance Manager) — Super
  // Admin satisfies both. A pure Checker must land on Billing Approvals, not
  // the Maker dashboard (AR_MAKER_ROLES-gated, would 403 them) — see
  // AR_MAKER_ROLES/AR_CHECKER_ROLES in sidebarConfig.js and the matching
  // route guards in App.jsx / menu split in Sidebar.jsx.
  const isFinanceExecutive = hasRole(["Finance_Executive", "FINANCE_EXECUTIVE"]);
  const canSeeArMaker = hasRole(AR_MAKER_ROLES);
  const canSeeArChecker = hasRole(AR_CHECKER_ROLES) && !isFinanceExecutive;

  const modules = [
    {
      id: "xms",
      name: "Expense Management",
      desc: "Submit and track expenses, cash advances, and reimbursements.",
      icon: <Receipt className="h-5 w-5" />,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-700",
      to: "/expense-management/dashboard",
      visible: hasRole(XMS_EVERYONE),
    },
    {
      id: "ap",
      name: "Accounts Payable",
      desc: "Manage vendors, invoices, and outgoing payments.",
      icon: <ApModuleIcon className="h-5 w-5" />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-700",
      to: AP_ROUTES.DASHBOARD,
      visible: hasRole(AP_ALL_ROLES),
    },
    {
      id: "ar",
      name: "Accounts Receivable",
      desc: "Manage project billing setup and billing data acquisition.",
      icon: <ArModuleIcon className="h-5 w-5" />,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-700",
      to: canSeeArMaker || isFinanceExecutive ? "/account-receivable/dashboard" : "/account-receivable/billing-approvals",
      visible: canSeeArMaker || canSeeArChecker || isFinanceExecutive,
    },
  ].filter((module) => module.visible);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#263383]/10 text-[#263383] flex items-center justify-center">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance Management</h1>
          <p className="text-sm text-gray-600">
            Expense Management, Accounts Payable, and Accounts Receivable in one place.
          </p>
        </div>
      </div>

      {modules.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <AppCard
              key={module.id}
              icon={module.icon}
              iconBg={module.iconBg}
              iconColor={module.iconColor}
              title={module.name}
              subtitle={module.desc}
              onClick={() => navigate(module.to)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          You don't have access to any Finance modules yet.
        </p>
      )}
    </div>
  );
};

export default FinanceDashboard;

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../contexts/AuthContext";
// RBAC disabled for AP module development — restore this import to re-enable role checks
// import { AP_CLERK_PLUS_ROLES, AP_ROLES } from "../../constants/apRoles";

// roles keys commented out below (RBAC disabled for AP module development) — restore them
// alongside the import above to re-enable per-action role gating.
const ACTIONS = [
  { key: "new-invoice", label: "New Invoice", to: "/accounts-payable/invoices?new=1", /* roles: AP_CLERK_PLUS_ROLES, */ color: "bg-[#0A0082]" },
  { key: "register-vendor", label: "Register Vendor", to: "/accounts-payable/vendors?new=1", /* roles: AP_CLERK_PLUS_ROLES, */ color: "bg-emerald-600" },
  { key: "start-payment-run", label: "Start Payment Run", to: "/accounts-payable/payments/processing", /* roles: [AP_ROLES.AP_MANAGER, AP_ROLES.AP_ADMIN], */ color: "bg-slate-500" },
  { key: "review-exceptions", label: "Review Exceptions", to: "/accounts-payable/exceptions", /* roles: AP_CLERK_PLUS_ROLES, */ color: "bg-amber-500" },
  { key: "approval-rules", label: "Approval Rules", to: "/accounts-payable/approvals/rules", /* roles: [AP_ROLES.AP_ADMIN], */ color: "bg-slate-500" },
];

export default function QuickActionsPanel() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  return (
    <div className="flex flex-col gap-2">
      {ACTIONS.map((action) => {
        const allowed = true; // RBAC disabled for AP module development — restore: hasRole(action.roles)
        return (
          <button
            key={action.key}
            type="button"
            disabled={!allowed}
            onClick={() => allowed && navigate(action.to)}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition ${
              allowed
                ? "border-gray-200 bg-white text-slate-700 hover:border-[#0A0082]"
                : "cursor-not-allowed border-gray-100 bg-gray-50 text-slate-400"
            }`}
          >
            <span className={`h-6 w-6 shrink-0 rounded-md ${allowed ? action.color : "bg-gray-300"}`} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

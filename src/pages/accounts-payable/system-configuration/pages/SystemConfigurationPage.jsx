import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import FiscalYearTab from "../components/FiscalYearTab";
import TaxComplianceTab from "../components/TaxComplianceTab";
import StatusMasterTab from "../components/StatusMasterTab";
import ApprovalPoliciesTab from "../components/ApprovalPoliciesTab";
import DepartmentApproversTab from "../components/DepartmentApproversTab";
import DepartmentsAndCategoriesTab from "../components/DepartmentsAndCategoriesTab";
import TdsConfigurationTab from "../components/TdsConfigurationTab";
import { useApPermissions } from "../../hooks/useApPermissions";

// Admin-only — see useApPermissions.canManageSystemConfig / constants/permissions.js's
// MANAGE_SYSTEM_CONFIG. Finance_Executive never sees these, even though the SYSTEM_CONFIG route
// itself stays open to every AP role (see App.jsx's comment on that route).
const BASE_TABS = [
  { id: "fiscalYear", label: "Fiscal Years" },
  { id: "taxCompliance", label: "Tax & Compliance" },
  { id: "status", label: "Status Master" },
  { id: "departmentsAndCategories", label: "Departments & Categories" },
];

// Approval Policies / Department Approvers configure who approves what — real backend policy
// engine (see approvalPolicyService.js), gated by APPROVAL_POLICY_MANAGE since misconfiguring
// this affects every invoice sent for approval, not just this page. Independent of the
// Admin/Finance_Executive split below — untouched by it.
const APPROVAL_TABS = [
  { id: "approvalPolicies", label: "Approval Policies" },
  { id: "departmentApprovers", label: "Department Approvers" },
];

// Finance_Executive-only — see useApPermissions.canManageTdsConfig. Admin is deliberately
// excluded from this tab, a true two-way split with BASE_TABS above, not a superset relationship.
const TDS_TABS = [{ id: "tdsConfiguration", label: "TDS Configuration" }];

export default function SystemConfigurationPage() {
  const { canManageApprovalPolicy, canManageSystemConfig, canManageTdsConfig, canViewTdsConfig } =
    useApPermissions();
  // TDS Configuration requires BOTH the Finance_Executive-only access-model gate AND the real
  // TDS_CONFIG_VIEW permission the backend actually enforces — role alone isn't sufficient (a
  // Finance_Executive not yet granted TDS_CONFIG_VIEW in UMS shouldn't see a tab that 403s).
  const canOpenTdsConfig = canManageTdsConfig && canViewTdsConfig;
  const tabs = useMemo(() => {
    const visible = [
      ...(canManageSystemConfig ? BASE_TABS : []),
      // Independent of canManageSystemConfig on purpose — see APPROVAL_TABS's comment above:
      // narrowing this to Admin-only too would lock out any Approval-Policy-permission holder
      // who isn't Admin/Finance_Executive, breaking existing access for that hypothetical user.
      ...(canManageApprovalPolicy ? APPROVAL_TABS : []),
      ...(canOpenTdsConfig ? TDS_TABS : []),
    ];
    return visible;
  }, [canManageApprovalPolicy, canManageSystemConfig, canOpenTdsConfig]);
  // The Approval Policy create/edit page is a separate route (ApprovalPolicyFormPage) now, not a
  // modal — navigating back here needs to land back on the Approval Policies tab, not reset to
  // the first tab, so the caller passes it via router state.
  const location = useLocation();
  const requestedTab = location.state?.activeTab;
  const [activeTab, setActiveTab] = useState(
    requestedTab && tabs.some((t) => t.id === requestedTab) ? requestedTab : tabs[0]?.id ?? null,
  );

  // Finance_Executive only ever sees the TDS Configuration tab (see TDS_TABS's gating above) —
  // the generic "System Configuration" / "fiscal years, tax compliance..." header describes tabs
  // they can't see at all, so it's swapped for TDS-specific copy whenever that's the only tab
  // this user has. Admin (and anyone who also holds canManageSystemConfig/canManageApprovalPolicy)
  // keeps the general header unchanged.
  const isTdsOnlyView = canOpenTdsConfig && !canManageSystemConfig && !canManageApprovalPolicy;

  return (
    <div className="p-6">
      <PageHeader
        title={isTdsOnlyView ? "TDS Configuration" : "System Configuration"}
        subtitle={
          isTdsOnlyView
            ? "Manage TDS rules, nature of payment, deductors, and bulk Excel import."
            : "Manage AP master data — fiscal years, tax compliance, approval thresholds, and statuses."
        }
      />

      {tabs.length === 0 ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          You don't have access to any System Configuration section.
        </div>
      ) : (
        <>
          <div className="flex gap-6 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm transition ${
                  activeTab === tab.id
                    ? "border-b-2 border-[#0A0082] font-semibold text-[#0A0082]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === "fiscalYear" && canManageSystemConfig && <FiscalYearTab />}
            {activeTab === "taxCompliance" && canManageSystemConfig && <TaxComplianceTab />}
            {activeTab === "status" && canManageSystemConfig && <StatusMasterTab />}
            {activeTab === "departmentsAndCategories" && canManageSystemConfig && <DepartmentsAndCategoriesTab />}
            {activeTab === "approvalPolicies" && canManageApprovalPolicy && <ApprovalPoliciesTab />}
            {activeTab === "departmentApprovers" && canManageApprovalPolicy && <DepartmentApproversTab />}
            {activeTab === "tdsConfiguration" && canOpenTdsConfig && <TdsConfigurationTab />}
          </div>
        </>
      )}
    </div>
  );
}

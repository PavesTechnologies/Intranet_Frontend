import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import FiscalYearTab from "../components/FiscalYearTab";
import TaxComplianceTab from "../components/TaxComplianceTab";
import StatusMasterTab from "../components/StatusMasterTab";
import ApprovalPoliciesTab from "../components/ApprovalPoliciesTab";
import DepartmentApproversTab from "../components/DepartmentApproversTab";
import DepartmentsAndCategoriesTab from "../components/DepartmentsAndCategoriesTab";
import { useApPermissions } from "../../hooks/useApPermissions";

const BASE_TABS = [
  { id: "fiscalYear", label: "Fiscal Years" },
  { id: "taxCompliance", label: "Tax & Compliance" },
  { id: "status", label: "Status Master" },
  { id: "departmentsAndCategories", label: "Departments & Categories" },
];

// Approval Policies / Department Approvers configure who approves what — real backend policy
// engine (see approvalPolicyService.js), gated by APPROVAL_POLICY_MANAGE since misconfiguring
// this affects every invoice sent for approval, not just this page.
const APPROVAL_TABS = [
  { id: "approvalPolicies", label: "Approval Policies" },
  { id: "departmentApprovers", label: "Department Approvers" },
];

export default function SystemConfigurationPage() {
  const { canManageApprovalPolicy } = useApPermissions();
  const tabs = useMemo(
    () => (canManageApprovalPolicy ? [...BASE_TABS, ...APPROVAL_TABS] : BASE_TABS),
    [canManageApprovalPolicy],
  );
  // The Approval Policy create/edit page is a separate route (ApprovalPolicyFormPage) now, not a
  // modal — navigating back here needs to land back on the Approval Policies tab, not reset to
  // the first tab, so the caller passes it via router state.
  const location = useLocation();
  const requestedTab = location.state?.activeTab;
  const [activeTab, setActiveTab] = useState(
    requestedTab && tabs.some((t) => t.id === requestedTab) ? requestedTab : tabs[0].id,
  );

  return (
    <div className="p-6">
      <PageHeader
        title="System Configuration"
        subtitle="Manage AP master data — fiscal years, tax compliance, approval thresholds, and statuses."
      />

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
        {activeTab === "fiscalYear" && <FiscalYearTab />}
        {activeTab === "taxCompliance" && <TaxComplianceTab />}
        {activeTab === "status" && <StatusMasterTab />}
        {activeTab === "departmentsAndCategories" && <DepartmentsAndCategoriesTab />}
        {activeTab === "approvalPolicies" && canManageApprovalPolicy && <ApprovalPoliciesTab />}
        {activeTab === "departmentApprovers" && canManageApprovalPolicy && <DepartmentApproversTab />}
      </div>
    </div>
  );
}

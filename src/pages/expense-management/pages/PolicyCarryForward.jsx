import React from "react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import { PolicyWorkspaceLayout, PolicyToolbar } from "@/pages/expense-management/components/policy/common/PolicyWorkspaceLayout";

// Carry-forward policy rules CF-01 to CF-10, as in docs/policy/cash-advance-recovery-policy.md (Route 1).
// Draft until Finance approves the policy.
const CARRY_FORWARD_RULES = [
  { id: "CF-01", text: "Each employee's outstanding advance balance is tracked across trips and months." },
  { id: "CF-02", text: "Any unused balance remains outstanding and carries forward by default." },
  { id: "CF-03", text: "The employee is not asked to repay the unused amount after each expense report." },
  { id: "CF-04", text: "Eligible expenses approved through the expense verification workflow reduce the outstanding advance." },
  { id: "CF-05", text: "When an employee requests an advance for a new trip, the available carry-forward balance is retrieved." },
  { id: "CF-06", text: "If the new request is the total trip budget, the existing balance is subtracted to give the additional amount Finance disburses." },
  { id: "CF-07", text: "The same outstanding funds may not be allocated to more than one active trip." },
  { id: "CF-08", text: "Authorized Finance users decide, per policy, to retain the balance, carry it forward, start salary recovery, or settle it." },
  { id: "CF-09", text: "The ledger is updated when the related expense adjustment, disbursement, repayment or payroll recovery is confirmed." },
  { id: "CF-10", text: "The audit trail records the original advance, expenses, carry-forward amount, Finance decisions and settlement transactions." },
];

const breadcrumbs = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Policy & Compliance", to: "/expense-management/policy-engine/dashboard" },
  { label: "Carry Forward" },
];

export default function PolicyCarryForward() {
  return (
    <PolicyWorkspaceLayout>
      <Breadcrumb items={breadcrumbs} />

      <PolicyToolbar
        title="Carry Forward"
        subtitle="Conditions for moving a pending cash advance amount to the next expense. Off until Finance approves this policy."
      />

      <PageCard>
        <PageCardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Status: <strong>Draft, not approved.</strong> Carry forward is manual and stays off until a Finance approver
            activates this policy.
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Policy rules</h2>
            <ol className="list-decimal space-y-2 pl-5 text-xs text-gray-700">
              {CARRY_FORWARD_RULES.map((rule) => (
                <li key={rule.id}>
                  <span className="font-semibold">{rule.id}</span> {rule.text}
                </li>
              ))}
            </ol>
          </div>
        </PageCardContent>
      </PageCard>
    </PolicyWorkspaceLayout>
  );
}

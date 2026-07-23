import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function ReimbursementsPage() {
  return (
    <ModulePlaceholder
      title="Reimbursements"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Finance", to: "/expense-management/finance/verification" },
        { label: "Reimbursements" },
      ]}
      description="Track and process employee reimbursements."
    />
  );
}

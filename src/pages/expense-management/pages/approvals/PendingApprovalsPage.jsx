import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function PendingApprovalsPage() {
  return (
    <ModulePlaceholder
      title="Pending"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Approvals", to: "/expense-management/approvals/pending" },
        { label: "Pending" },
      ]}
      description="Expense and advance requests awaiting your approval."
    />
  );
}

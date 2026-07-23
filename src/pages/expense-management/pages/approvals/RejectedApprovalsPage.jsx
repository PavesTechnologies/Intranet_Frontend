import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function RejectedApprovalsPage() {
  return (
    <ModulePlaceholder
      title="Rejected"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Approvals", to: "/expense-management/approvals/pending" },
        { label: "Rejected" },
      ]}
      description="Requests you've rejected."
    />
  );
}

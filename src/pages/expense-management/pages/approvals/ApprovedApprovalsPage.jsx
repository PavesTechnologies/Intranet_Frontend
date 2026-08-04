import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function ApprovedApprovalsPage() {
  return (
    <ModulePlaceholder
      title="Approved"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Approvals", to: "/expense-management/approvals/pending" },
        { label: "Approved" },
      ]}
      description="Requests you've approved."
    />
  );
}

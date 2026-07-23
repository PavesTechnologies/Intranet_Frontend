import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Reports" },
      ]}
      description="Cross-functional reporting across expenses, advances, and reimbursements."
    />
  );
}

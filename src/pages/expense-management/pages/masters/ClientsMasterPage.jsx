import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function ClientsMasterPage() {
  return (
    <ModulePlaceholder
      title="Clients"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Masters", to: "/expense-management/masters/expense-categories" },
        { label: "Clients" },
      ]}
      description="Manage clients available for billable expense allocation."
    />
  );
}

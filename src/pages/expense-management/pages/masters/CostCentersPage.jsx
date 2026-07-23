import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function CostCentersPage() {
  return (
    <ModulePlaceholder
      title="Cost Centers"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Masters", to: "/expense-management/masters/expense-categories" },
        { label: "Cost Centers" },
      ]}
      description="Manage cost centers used for expense allocation."
    />
  );
}

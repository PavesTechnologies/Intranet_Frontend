import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function CurrencyManagementPage() {
  return (
    <ModulePlaceholder
      title="Currency Management"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Masters", to: "/expense-management/masters/expense-categories" },
        { label: "Currency Management" },
      ]}
      description="Manage supported currencies and exchange rates."
    />
  );
}

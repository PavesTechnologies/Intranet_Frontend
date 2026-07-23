import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function TaxConfigurationPage() {
  return (
    <ModulePlaceholder
      title="Tax Configuration"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Masters", to: "/expense-management/masters/expense-categories" },
        { label: "Tax Configuration" },
      ]}
      description="Configure tax rates applied to expense categories."
    />
  );
}

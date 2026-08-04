import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function PoliciesPage() {
  return (
    <ModulePlaceholder
      title="Policies"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Policies" },
      ]}
      description="Manage expense policies and approval thresholds."
    />
  );
}

import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function DashboardPage() {
  return (
    <ModulePlaceholder
      title="Dashboard"
      breadcrumbs={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Dashboard" }]}
      description="Overview of expense activity, pending approvals, and key metrics."
    />
  );
}

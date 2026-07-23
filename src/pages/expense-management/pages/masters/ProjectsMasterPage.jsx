import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function ProjectsMasterPage() {
  return (
    <ModulePlaceholder
      title="Projects"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Masters", to: "/expense-management/masters/expense-categories" },
        { label: "Projects" },
      ]}
      description="Manage projects available for expense allocation."
    />
  );
}

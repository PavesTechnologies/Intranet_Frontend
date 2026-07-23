import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function ExpenseCategoriesPage() {
  return (
    <ModulePlaceholder
      title="Expense Categories"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Masters", to: "/expense-management/masters/expense-categories" },
        { label: "Expense Categories" },
      ]}
      description="Manage the list of expense categories available to employees."
    />
  );
}

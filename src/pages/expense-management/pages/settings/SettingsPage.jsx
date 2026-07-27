import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Settings"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Settings" },
      ]}
      description="Module-level configuration for Expense Management."
    />
  );
}

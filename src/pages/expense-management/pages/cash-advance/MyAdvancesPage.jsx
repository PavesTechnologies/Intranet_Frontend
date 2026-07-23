import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function MyAdvancesPage() {
  return (
    <ModulePlaceholder
      title="My Advances"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Cash Advance", to: "/expense-management/cash-advance/my" },
        { label: "My Advances" },
      ]}
      description="Track the status of your cash advance requests."
    />
  );
}

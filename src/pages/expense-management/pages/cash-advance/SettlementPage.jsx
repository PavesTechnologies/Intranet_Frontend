import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function SettlementPage() {
  return (
    <ModulePlaceholder
      title="Settlement"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Cash Advance", to: "/expense-management/cash-advance/my" },
        { label: "Settlement" },
      ]}
      description="Settle outstanding cash advances against submitted expenses."
    />
  );
}

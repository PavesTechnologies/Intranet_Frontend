import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function ReceiptLibraryPage() {
  return (
    <ModulePlaceholder
      title="Receipt Library"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Receipts", to: "/expense-management/receipts/library" },
        { label: "Receipt Library" },
      ]}
      description="Browse and manage uploaded receipts."
    />
  );
}

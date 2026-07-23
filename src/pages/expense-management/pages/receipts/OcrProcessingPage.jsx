import React from "react";
import ModulePlaceholder from "../../components/ModulePlaceholder";

export default function OcrProcessingPage() {
  return (
    <ModulePlaceholder
      title="OCR Processing"
      breadcrumbs={[
        { label: "Expense Management", to: "/expense-management/dashboard" },
        { label: "Receipts", to: "/expense-management/receipts/library" },
        { label: "OCR Processing" },
      ]}
      description="Review receipts processed via OCR extraction."
    />
  );
}

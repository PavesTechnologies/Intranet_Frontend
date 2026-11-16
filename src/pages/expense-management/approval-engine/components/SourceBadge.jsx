import React from "react";

export default function SourceBadge({ cashAdvanceId }) {
  const isCashAdvance = Boolean(cashAdvanceId);
  return (
    <span
      className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        isCashAdvance ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-600"
      }`}
    >
      {isCashAdvance ? "Cash Advance" : "Direct Expense"}
    </span>
  );
}

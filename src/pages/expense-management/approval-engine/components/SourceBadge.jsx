import React from "react";

// Either the report's cashAdvanceId, or a server-computed source ("DIRECT" / "CASH_ADVANCE") such as a late receipt's.
export default function SourceBadge({ cashAdvanceId, source }) {
  const isCashAdvance = source ? source === "CASH_ADVANCE" : Boolean(cashAdvanceId);
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

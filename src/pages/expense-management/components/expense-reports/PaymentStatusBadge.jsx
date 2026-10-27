import React from "react";

/**
 * The employee-payment track of a report, separate from its approval status. "Paid" appears only
 * once AP has confirmed the actual payment (paymentRoutingStatus PAYMENT_COMPLETED) - never on
 * approval or when the report is merely with AP.
 */
export const paymentStateOf = (report) => {
  if (!report) return null;
  if (report.paymentRoutingStatus === "PAYMENT_COMPLETED") {
    return { key: "PAID", label: "Paid", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  if (report.paymentRoutingStatus === "APPROVED_FOR_PAYMENT") {
    return { key: "AWAITING_PAYMENT", label: "Awaiting payment", className: "border-indigo-200 bg-indigo-50 text-indigo-700" };
  }
  if (report.noPaymentDue) {
    return { key: "NO_PAYMENT_DUE", label: "Settled - no payment due", className: "border-gray-200 bg-gray-50 text-gray-600" };
  }
  return null;
};

export default function PaymentStatusBadge({ report, className = "" }) {
  const state = paymentStateOf(report);
  if (!state) return null;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${state.className} ${className}`}
    >
      {state.label}
    </span>
  );
}

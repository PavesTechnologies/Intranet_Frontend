import React from "react";
import StatusBadge from "@/components/status/statusbadge";

// Backend InvoiceHandoffStatus -> label. Independent of paymentRoutingStatus: a client-billable
// report is reimbursed to the employee by AP AND separately handed off to the invoice team.
const LABELS = {
  PENDING: "Invoice Pending",
  COMPLETED: "Invoiced",
};

/** Renders nothing for NOT_APPLICABLE / missing — only client-billable approved reports have an invoice track. */
export default function InvoiceHandoffBadge({ status, size = "sm" }) {
  const label = LABELS[status];
  return label ? <StatusBadge label={label} size={size} /> : null;
}

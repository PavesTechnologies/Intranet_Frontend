import React from "react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import { formatCurrency, formatDate, daysBetween } from "../../utils/formatters";

const HEADERS = ["Invoice #", "Vendor", "Amount", "Tier", "Submitted Date", "Days Waiting", "Actions"];
const COLUMNS = ["invoiceNo", "vendor", "amount", "tier", "submittedDate", "daysWaiting", "actions"];

export default function ApprovalQueueTable({ invoices = [], loading = false, onReview }) {
  const rows = invoices.map((invoice) => ({
    invoiceNo: invoice.id,
    vendor: invoice.vendorName,
    amount: formatCurrency(invoice.amount),
    tier: <StatusBadge label={invoice.tier} size="sm" />,
    submittedDate: formatDate(invoice.submittedDate),
    daysWaiting: daysBetween(invoice.submittedDate),
    actions: (
      <Button size="small" variant="primary" onClick={() => onReview?.(invoice)}>
        Review
      </Button>
    ),
  }));

  return <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={loading} />;
}

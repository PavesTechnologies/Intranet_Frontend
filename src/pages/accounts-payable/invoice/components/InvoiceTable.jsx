import React from "react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import { getVendorNameById } from "../../mocks/apFixtures";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { formatCurrency, formatDate } from "../../utils/formatters";

/**
 * Shared invoice rows table. `mode="inbox"` renders triage actions
 * (Validate / Match); default mode renders a plain "View" action.
 */
const InvoiceTable = ({ invoices = [], loading = false, mode = "list", onView, onValidate, onMatch }) => {
  const headers =
    mode === "inbox"
      ? ["Invoice #", "Vendor", "PO #", "Amount", "Submitted Date", "Status", "Actions"]
      : ["Invoice #", "Vendor", "PO #", "Amount", "Submitted Date", "Status", "Actions"];

  const columns = ["invoiceNo", "vendor", "poNumber", "amount", "submittedDate", "status", "actions"];

  const rows = invoices.map((invoice) => ({
    onRowClick: onView ? () => onView(invoice) : undefined,
    invoiceNo: <span className="font-semibold text-slate-900">{invoice.id}</span>,
    vendor: getVendorNameById(invoice.vendorId) || "—",
    poNumber: invoice.poNumber || "—",
    amount: formatCurrency(invoice.amount),
    submittedDate: formatDate(invoice.submittedDate),
    status: <StatusBadge label={invoice.status} size="sm" />,
    actions: (
      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        {mode === "inbox" && invoice.status === INVOICE_STATUS.PENDING_VALIDATION && (
          <Button size="small" variant="primary" onClick={() => onValidate?.(invoice)}>
            Validate
          </Button>
        )}
        {mode === "inbox" && invoice.status === INVOICE_STATUS.PENDING_MATCH && (
          <Button size="small" variant="secondary" onClick={() => onMatch?.(invoice)}>
            Match
          </Button>
        )}
        <Button size="small" variant="outline" onClick={() => onView?.(invoice)}>
          View
        </Button>
      </div>
    ),
  }));

  return <GenericTable headers={headers} columns={columns} rows={rows} loading={loading} />;
};

export default InvoiceTable;

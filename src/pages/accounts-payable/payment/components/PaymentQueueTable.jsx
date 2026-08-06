import React from "react";
import GenericTable from "../../../../components/Table/table";
import { formatCurrency, formatDate } from "../../utils/formatters";

/**
 * Read-only invoice table with a manual checkbox-based selection column.
 * GenericTable has no selection concept itself — the checkbox is plain JSX
 * wired to selection state owned by the parent (backed by the zustand store).
 */
const PaymentQueueTable = ({ invoices = [], selectedInvoiceIds = [], onToggleInvoice, loading = false }) => {
  const rows = invoices.map((invoice) => ({
    select: (
      <input
        type="checkbox"
        checked={selectedInvoiceIds.includes(invoice.id)}
        onChange={() => onToggleInvoice?.(invoice.id)}
        className="h-4 w-4 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]"
        aria-label={`Select invoice ${invoice.id}`}
      />
    ),
    invoiceNumber: invoice.id,
    vendor: invoice.vendorName,
    amount: formatCurrency(invoice.amount),
    dueDate: formatDate(invoice.dueDate),
    approvedDate: formatDate(invoice.approvedDate),
  }));

  return (
    <GenericTable
      headers={["Select", "Invoice #", "Vendor", "Amount", "Due Date", "Approved Date"]}
      columns={["select", "invoiceNumber", "vendor", "amount", "dueDate", "approvedDate"]}
      rows={rows}
      loading={loading}
    />
  );
};

export default PaymentQueueTable;

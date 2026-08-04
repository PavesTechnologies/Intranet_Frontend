import React from "react";
import GenericTable from "../../../../components/Table/table";
import { formatCurrency, formatNumber } from "../../utils/formatters";

/**
 * Groups a payment batch's invoices by vendor and shows how the batch total
 * allocates across vendors: invoice count, allocated amount, % of batch total.
 */
const PaymentAllocationGrid = ({ batch }) => {
  if (!batch) return null;

  const groupsMap = new Map();

  (batch.invoices || []).forEach((invoice) => {
    const key = invoice.vendorId;
    const existing = groupsMap.get(key) || {
      vendorId: key,
      vendorName: invoice.vendorName,
      invoiceCount: 0,
      allocatedAmount: 0,
    };
    existing.invoiceCount += 1;
    existing.allocatedAmount += invoice.amount;
    groupsMap.set(key, existing);
  });

  const groups = Array.from(groupsMap.values()).sort((a, b) => b.allocatedAmount - a.allocatedAmount);

  const rows = groups.map((group) => ({
    vendor: group.vendorName,
    invoiceCount: formatNumber(group.invoiceCount),
    allocatedAmount: formatCurrency(group.allocatedAmount),
    percentOfBatch: batch.totalAmount ? `${((group.allocatedAmount / batch.totalAmount) * 100).toFixed(1)}%` : "—",
  }));

  return (
    <GenericTable
      headers={["Vendor", "Invoice Count", "Allocated Amount", "% of Batch"]}
      columns={["vendor", "invoiceCount", "allocatedAmount", "percentOfBatch"]}
      rows={rows}
    />
  );
};

export default PaymentAllocationGrid;

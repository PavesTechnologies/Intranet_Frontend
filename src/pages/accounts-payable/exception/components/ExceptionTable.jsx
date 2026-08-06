import React from "react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import { formatCurrency, daysBetween } from "../../utils/formatters";

const ExceptionTable = ({ exceptions = [], loading = false, onResolve }) => {
  const headers = ["Invoice #", "Vendor", "Amount", "Exception Type", "Detail", "Age (days)", "Actions"];
  const columns = ["invoiceNo", "vendor", "amount", "type", "detail", "age", "actions"];

  const rows = exceptions.map((exception) => ({
    invoiceNo: <span className="font-semibold text-slate-900">{exception.invoiceId}</span>,
    vendor: exception.vendorName || "—",
    amount: formatCurrency(exception.amount),
    type: exception.type,
    detail: <span className="text-sm text-slate-600">{exception.detail}</span>,
    age: daysBetween(exception.submittedDate),
    actions: (
      <Button size="small" variant="primary" onClick={() => onResolve?.(exception)}>
        Resolve
      </Button>
    ),
  }));

  return <GenericTable headers={headers} columns={columns} rows={rows} loading={loading} />;
};

export default ExceptionTable;

import React from "react";
import { useNavigate } from "react-router-dom";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import { formatCurrency } from "../../utils/formatters";

const PRIORITY_LABEL = { critical: "Critical", high: "High", normal: "Normal" };

const resolveTarget = (item) =>
  item.type === "Bank Verification"
    ? "/accounts-payable/vendors"
    : `/accounts-payable/invoices/${item.reference}`;

export default function WorkQueuePanel({ items = [], loading = false }) {
  const navigate = useNavigate();

  const rows = items.map((item) => ({
    type: item.type,
    reference: <span className="font-semibold text-slate-800">{item.reference}</span>,
    vendor: item.vendor || "—",
    amount: item.amount != null ? formatCurrency(item.amount) : "—",
    age: item.ageDays === 0 ? "Today" : `${item.ageDays} day${item.ageDays === 1 ? "" : "s"}`,
    priority: <StatusBadge label={PRIORITY_LABEL[item.priority] || item.priority} size="sm" />,
    actions: (
      <Button size="small" variant="outline" onClick={() => navigate(resolveTarget(item))}>
        {item.action}
      </Button>
    ),
  }));

  return (
    <GenericTable
      headers={["Type", "Reference", "Vendor", "Amount", "Age", "Priority", ""]}
      columns={["type", "reference", "vendor", "amount", "age", "priority", "actions"]}
      rows={rows}
      loading={loading}
    />
  );
}

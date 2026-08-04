import React from "react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";

const HEADERS = ["Tier", "Range", "Approver Role", "Escalation Days", "Active", "Edit"];
const COLUMNS = ["tier", "range", "approverRole", "escalationDays", "active", "edit"];

export default function ApprovalRuleTable({ rules = [], loading = false, onEdit }) {
  const rows = rules.map((rule) => ({
    tier: rule.tier,
    range: rule.range,
    approverRole: rule.approverRole,
    escalationDays: rule.escalationDays,
    active: <StatusBadge label={rule.active ? "Active" : "Inactive"} size="sm" />,
    edit: (
      <Button size="small" variant="outline" onClick={() => onEdit?.(rule)}>
        Edit
      </Button>
    ),
  }));

  return <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={loading} />;
}

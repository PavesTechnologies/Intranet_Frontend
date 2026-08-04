import React from "react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import { formatDate } from "../../utils/formatters";

const HEADERS = [
  "Jurisdiction",
  "Tax Type",
  "Rate (%)",
  "Effective Date",
  "Active",
  "Actions",
];

const COLUMNS = ["jurisdiction", "taxType", "rate", "effectiveDate", "active", "actions"];

const TaxRuleTable = ({ rules = [], loading = false, onEdit, onDeleteRequest }) => {
  const rows = rules.map((rule) => ({
    jurisdiction: rule.jurisdiction,
    taxType: rule.taxType,
    rate: `${rule.ratePct}%`,
    effectiveDate: formatDate(rule.effectiveDate),
    active: <StatusBadge label={rule.active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center justify-center gap-2">
        <Button size="small" variant="outline" onClick={() => onEdit(rule)}>
          Edit
        </Button>
        <Button size="small" variant="danger" onClick={() => onDeleteRequest(rule)}>
          Delete
        </Button>
      </div>
    ),
  }));

  return (
    <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={loading} />
  );
};

export default TaxRuleTable;

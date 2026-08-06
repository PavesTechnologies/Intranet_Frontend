import React from "react";
import GenericTable from "../../../../components/Table/table";

// Thin composition point so the report sections share one table wrapper.
export default function ReportSummaryTable({ headers = [], columns = [], rows = [], loading = false }) {
  return <GenericTable headers={headers} columns={columns} rows={rows} loading={loading} />;
}

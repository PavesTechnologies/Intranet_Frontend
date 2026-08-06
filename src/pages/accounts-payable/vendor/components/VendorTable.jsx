import React from "react";
import { useNavigate } from "react-router-dom";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import useApLookups from "../../hooks/useApLookups";

const VendorTable = ({ vendors = [], loading = false }) => {
  const navigate = useNavigate();
  const { countries, vendorStatuses } = useApLookups();

  const countryNameById = new Map(countries.map((c) => [c.country_id, c.country_name]));
  const statusNameById = new Map(vendorStatuses.map((s) => [s.status_id, s.status_name]));

  const rows = vendors.map((vendor) => ({
    name: vendor.vendor_name,
    code: vendor.vendor_code || "—",
    country: countryNameById.get(vendor.country_id) || "—",
    status: vendor.status_id ? (
      <StatusBadge label={statusNameById.get(vendor.status_id) || "Unknown"} size="sm" />
    ) : (
      "—"
    ),
    email: vendor.email || "—",
    actions: (
      <Button
        size="small"
        variant="outline"
        onClick={() => navigate(`/accounts-payable/vendors/${vendor.vendor_id}`)}
      >
        View
      </Button>
    ),
  }));

  return (
    <GenericTable
      headers={["Name", "Vendor Code", "Country", "Status", "Email", "Actions"]}
      columns={["name", "code", "country", "status", "email", "actions"]}
      rows={rows}
      loading={loading}
    />
  );
};

export default VendorTable;

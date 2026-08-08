import { Link, useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import { AP_ROUTES } from "../../constants/routes";
import useApLookups from "../../hooks/useApLookups";

const HEADERS = ["Name", "Vendor Code", "Country", "Status", "Email", "Actions"];
const COLUMNS = ["name", "code", "country", "status", "email", "actions"];

const VendorTable = ({ vendors = [], loading = false }) => {
  const navigate = useNavigate();
  const { countries, vendorStatuses } = useApLookups();

  const countryNameById = new Map(countries.map((c) => [c.country_id, c.country_name]));
  const statusNameById = new Map(vendorStatuses.map((s) => [s.status_id, s.status_name]));

  const rows = vendors.map((vendor) => ({
    name: (
      <Link
        to={AP_ROUTES.VENDOR_DETAIL(vendor.vendor_id)}
        className="font-semibold text-[#0A0082] hover:underline"
      >
        {vendor.vendor_name}
      </Link>
    ),
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
        onClick={() => navigate(AP_ROUTES.VENDOR_DETAIL(vendor.vendor_id))}
      >
        <Eye className="h-3.5 w-3.5" /> View
      </Button>
    ),
  }));

  return <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={loading} />;
};

export default VendorTable;

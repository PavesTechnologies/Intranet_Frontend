import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";

export default function VendorListPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <PageHeader
        title="Vendors"
        subtitle="This page will be implemented in Phase 4."
        actions={
          <Button variant="primary" onClick={() => navigate(AP_ROUTES.VENDOR_ONBOARD)}>
            Register Vendor
          </Button>
        }
      />
    </div>
  );
}

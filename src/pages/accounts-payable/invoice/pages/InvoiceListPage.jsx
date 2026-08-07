import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";

export default function InvoiceListPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <PageHeader
        title="All Invoices"
        subtitle="This page will be implemented in Phase 6."
        actions={
          <Button variant="primary" onClick={() => navigate(AP_ROUTES.INVOICE_UPLOAD)}>
            Upload Invoice
          </Button>
        }
      />
    </div>
  );
}

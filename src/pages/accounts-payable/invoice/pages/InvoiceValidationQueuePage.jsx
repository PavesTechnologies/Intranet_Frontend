import { Link } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import { AP_ROUTES } from "../../constants/routes";

/**
 * There is no standalone "validation" stage on the backend — POST /apm/invoice/validate-fields
 * only runs inline during upload, before an invoice is ever persisted, and there's no
 * validate/reject-validation endpoint for an already-created invoice. The OCR Review Queue is
 * the backend's real equivalent workflow, so this route stays registered but honestly explains
 * the gap instead of rendering a queue that can never match anything.
 */
export default function InvoiceValidationQueuePage() {
  return (
    <div className="p-6">
      <PageHeader title="Validation Queue" subtitle="Backend-dependent — not available yet" />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-gray-700">
          The backend doesn't expose a standalone validation stage for already-created invoices.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
          Field validation runs once, automatically, during upload. Once an invoice needs a human
          look, it appears in the OCR Review Queue instead.
        </p>
        <Link
          to={AP_ROUTES.INVOICE_OCR_REVIEW}
          className="mt-4 inline-block text-sm font-medium text-[#0A0082] hover:underline"
        >
          Go to OCR Review Queue →
        </Link>
      </div>
    </div>
  );
}

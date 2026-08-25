import { useState } from "react";
import { toast } from "react-toastify";
import { Eye } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import StatusBadge from "../../../../components/status/statusbadge";
import { useReviewQueue } from "../hooks/useReviewQueue";
import { invoiceService } from "../services/invoiceService";
import { getApiErrorMessage } from "../../utils/apiError";
import OcrReviewModal from "../components/OcrReviewModal";

const PAGE_SIZE = 10;

const HEADERS = ["File", "Invoice #", "Vendor", "Net Amount", "Confidence", "Status", "Actions"];
const COLUMNS = ["file", "invoiceNumber", "vendor", "netAmount", "confidence", "status", "actions"];

const TABS = [
  { key: "A", label: "Needs Correction" },
  { key: "B", label: "No Vendor Match" },
];

function formatConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

async function handleViewDocument(inboundDocumentId) {
  if (!inboundDocumentId) {
    toast.info("Source document is not available for this item.");
    return;
  }
  try {
    const { blob, contentType } = await invoiceService.viewInvoice(inboundDocumentId);
    const url = URL.createObjectURL(new Blob([blob], { type: contentType || "application/pdf" }));
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not load the source document."));
  }
}

/**
 * OCR Review Queue against the real GET /apm/invoice/review-queue endpoint. The backend
 * distinguishes two paths in one response: Path A (an invoice already exists, status
 * OCR_REVIEW_PENDING — a field correction) and Path B (fields were extracted but no vendor
 * could be matched, so invoice_id is still null). Both are corrected through the same PATCH
 * endpoint, keyed by inbound_document_id.
 */
export default function InvoiceOcrReviewQueuePage() {
  const [activeTab, setActiveTab] = useState("A");
  const [page, setPage] = useState(1);
  const [reviewItem, setReviewItem] = useState(null);

  const skip = (page - 1) * PAGE_SIZE;
  const { data, isLoading, isError, error } = useReviewQueue({ skip, limit: PAGE_SIZE });

  const items = (data?.items || []).filter((item) => item.path === activeTab);
  const totalForTab = activeTab === "A" ? data?.total_path_a ?? 0 : data?.total_path_b ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalForTab / PAGE_SIZE));

  const rows = items.map((item) => ({
    file: item.file_name || `Document #${item.inbound_document_id}`,
    invoiceNumber: item.invoice_number || "—",
    vendor: item.vendor_id ? `Vendor #${item.vendor_id}` : "Unmatched",
    netAmount: item.net_amount ?? "—",
    confidence: formatConfidence(item.extraction_confidence),
    status: item.status_code ? <StatusBadge label={item.status_code} size="sm" /> : "—",
    actions: (
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="small" onClick={() => handleViewDocument(item.inbound_document_id)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="primary" size="small" onClick={() => setReviewItem(item)}>
          Review
        </Button>
      </div>
    ),
  }));

  return (
    <div className="p-6">
      <PageHeader title="OCR Review Queue" subtitle="Invoices awaiting OCR field review or vendor assignment" />

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load the review queue right now.")}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-[#0A0082] text-[#0A0082]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {tab.key === "A" ? data?.total_path_a ?? 0 : data?.total_path_b ?? 0}
                </span>
              </button>
            ))}
          </div>

          {activeTab === "B" && (
            <p className="mb-3 text-xs text-gray-500">
              These documents were extracted successfully but no vendor could be matched automatically — assign a vendor to persist them as invoices.
            </p>
          )}

          <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={isLoading} />

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}

      <OcrReviewModal
        item={reviewItem}
        isOpen={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        onViewDocument={handleViewDocument}
      />
    </div>
  );
}

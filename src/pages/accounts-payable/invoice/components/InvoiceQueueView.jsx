import { useEffect, useState } from "react";
import PageGuide from "../../guide/components/PageGuide";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import InvoiceStatusTabs from "./InvoiceStatusTabs";
import InvoiceFilterPanel from "./InvoiceFilterPanel";
import InvoiceTable from "./InvoiceTable";
import InvoiceKpiCards from "./InvoiceKpiCards";
import { useInvoices } from "../hooks/useInvoices";
import { useInvoiceFilters } from "../hooks/useInvoiceFilters";
import { QUEUE_STATUS_FILTERS, getVisibleQueueTypes } from "../../constants/queueTypes";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";
import { useApPermissions } from "../../hooks/useApPermissions";

const PAGE_SIZE = 10;

/**
 * Shared list+filter+tabs+table+pagination view behind InvoiceListPage, InvoiceOcrReviewQueuePage,
 * and InvoiceValidationQueuePage — one implementation, not three near-duplicate list pages (see
 * PART D: "Do not create another invoice list page"). Each page just supplies a title/subtitle
 * and which queue tab starts active; switching tabs re-filters in place rather than navigating.
 *
 * KPI cards are opt-in (showKpis) so only Invoice Management gains them — the OCR Review and
 * Validation queue pages stay exactly as they were.
 *
 * Upload and the starting tab are both permission-aware: Upload only for whoever can actually
 * create an invoice (INVOICE_CREATE), and if the caller's requested defaultQueueType isn't one
 * of this user's visible tabs (see InvoiceStatusTabs/getVisibleQueueTypes), fall back to their
 * first visible one instead of landing on a tab they can't see.
 *
 * The starting tab can also be deep-linked via `?queue=<QUEUE_TYPES value>` (e.g. the AP
 * Dashboard's "Approved Invoices" tile links to `?queue=approved` so it opens straight on the
 * Approved tab instead of Invoice Management's default) — same one-shot
 * `useState(searchParams.get(...) || default)` pattern already used for `?prId=` in
 * VendorSelectionTab/QuotationTab. An unrecognized or not-currently-visible value is ignored, same
 * as an unrecognized defaultQueueType.
 */
// What an empty tab means, and what brings invoices into it.
const EMPTY_QUEUE = {
  all_invoices: { title: "No invoices yet.", hint: "Upload an invoice, or let the mailbox / SharePoint pickup bring them in." },
  ocr_review: { title: "Nothing to review.", hint: "New invoices land here after upload - their details are read for you to check." },
  approval: { title: "Nothing waiting for approval.", hint: "Invoices come here when an AP Executive sends them for approval." },
  approved: { title: "No approved invoices waiting.", hint: "Approved invoices wait here until Finance verifies TDS and marks them ready for payment." },
  ready_for_payment: { title: "Nothing ready for payment.", hint: "Invoices come here once Finance marks them ready." },
  paid: { title: "No paid invoices yet.", hint: "Invoices move here when their payment is recorded with its receipt." },
};

export default function InvoiceQueueView({ title, subtitle, defaultQueueType, showUploadAction = false, showKpis = false, guide = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const permissions = useApPermissions();
  const visibleQueueTypes = getVisibleQueueTypes(permissions);
  const requestedQueueType = searchParams.get("queue");
  const [queueType, setQueueType] = useState(
    requestedQueueType && visibleQueueTypes.includes(requestedQueueType)
      ? requestedQueueType
      : visibleQueueTypes.includes(defaultQueueType) ? defaultQueueType : visibleQueueTypes[0],
  );
  const { filters, setSearch, setInvoiceType, setStatus, setDateRange, setPage, resetFilters, hasActiveFilters } =
    useInvoiceFilters();

  // The permission set can go from "not yet loaded" to real values between the first render and
  // the auth context settling (see AuthContext's mount-time token decode) — if that changes
  // which tab is valid, snap back to a visible one rather than silently querying a hidden tab's
  // statuses forever.
  useEffect(() => {
    if (!visibleQueueTypes.includes(queueType)) {
      setQueueType(visibleQueueTypes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleQueueTypes.join(",")]);

  const { invoices, page, totalPages, isLoading, isError, error } = useInvoices({
    ...filters,
    statuses: QUEUE_STATUS_FILTERS[queueType],
    pageSize: PAGE_SIZE,
  });

  const handleQueueChange = (nextQueueType) => {
    setQueueType(nextQueueType);
    resetFilters();
  };

  return (
    <div className="p-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          showUploadAction && (permissions.canUploadInvoice || permissions.canBulkUploadInvoices) ? (
            <>
              {permissions.canBulkUploadInvoices && (
                <Button variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_BULK_UPLOAD)}>
                  Bulk Upload
                </Button>
              )}
              {permissions.canUploadInvoice && (
                <Button variant="primary" onClick={() => navigate(AP_ROUTES.INVOICE_UPLOAD)}>
                  Upload Invoice
                </Button>
              )}
            </>
          ) : undefined
        }
      />
      {guide && <PageGuide page="invoices" />}

      {showKpis && <InvoiceKpiCards onSelect={handleQueueChange} visibleQueues={visibleQueueTypes} />}

      <InvoiceStatusTabs activeQueueType={queueType} onChange={handleQueueChange} />

      <InvoiceFilterPanel
        filters={filters}
        onSearch={setSearch}
        onInvoiceTypeChange={setInvoiceType}
        onStatusChange={setStatus}
        onDateRangeChange={setDateRange}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load invoices right now.")}
        </div>
      ) : isLoading ? (
        <InvoiceTable invoices={[]} loading />
      ) : invoices.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-gray-700">
            {hasActiveFilters ? "No invoices match your filters." : (EMPTY_QUEUE[queueType] || EMPTY_QUEUE.all_invoices).title}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters ? "Try changing or clearing the filters." : (EMPTY_QUEUE[queueType] || EMPTY_QUEUE.all_invoices).hint}
          </p>
          {!hasActiveFilters && permissions.canUploadInvoice && ["all_invoices", "ocr_review"].includes(queueType) && (
            <Button variant="primary" className="mt-4" onClick={() => navigate(AP_ROUTES.INVOICE_UPLOAD)}>Upload Invoice</Button>
          )}
        </div>
      ) : (
        <>
          <InvoiceTable invoices={invoices} loading={false} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPrevious={() => setPage(Math.max(1, page - 1))}
            onNext={() => setPage(Math.min(totalPages, page + 1))}
          />
        </>
      )}
    </div>
  );
}

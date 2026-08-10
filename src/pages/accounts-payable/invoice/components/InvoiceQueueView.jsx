import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import InvoiceStatusTabs from "./InvoiceStatusTabs";
import InvoiceFilterPanel from "./InvoiceFilterPanel";
import InvoiceTable from "./InvoiceTable";
import { useInvoices } from "../hooks/useInvoices";
import { useInvoiceFilters } from "../hooks/useInvoiceFilters";
import { QUEUE_STATUS_FILTERS } from "../../constants/queueTypes";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";

const PAGE_SIZE = 10;

/**
 * Shared list+filter+tabs+table+pagination view behind InvoiceListPage, InvoiceOcrReviewQueuePage,
 * and InvoiceValidationQueuePage — one implementation, not three near-duplicate list pages (see
 * PART D: "Do not create another invoice list page"). Each page just supplies a title/subtitle
 * and which queue tab starts active; switching tabs re-filters in place rather than navigating.
 */
export default function InvoiceQueueView({ title, subtitle, defaultQueueType, showUploadAction = false }) {
  const navigate = useNavigate();
  const [queueType, setQueueType] = useState(defaultQueueType);
  const { filters, setSearch, setInvoiceType, setDateRange, setPage, resetFilters, hasActiveFilters } =
    useInvoiceFilters();

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
          showUploadAction ? (
            <Button variant="primary" onClick={() => navigate(AP_ROUTES.INVOICE_UPLOAD)}>
              Upload Invoice
            </Button>
          ) : undefined
        }
      />

      <InvoiceStatusTabs activeQueueType={queueType} onChange={handleQueueChange} />

      <InvoiceFilterPanel
        filters={filters}
        onSearch={setSearch}
        onInvoiceTypeChange={setInvoiceType}
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
        <div className="rounded-lg border border-gray-200 bg-white py-10 text-center text-sm text-gray-500">
          {hasActiveFilters
            ? "No invoices match your filters. Try changing your search criteria."
            : "No invoices found."}
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

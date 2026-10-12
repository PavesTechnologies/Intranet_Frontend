import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import StatusBadge from "../../../../components/status/statusbadge";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import EmptyState from "../../procurement/components/EmptyState";
import RecordPaymentModal from "../components/RecordPaymentModal";
import { useReadyForPayment } from "../hooks/usePaymentTracking";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useApPermissions } from "../../hooks/useApPermissions";
import { AP_ROUTES } from "../../constants/routes";
import PaymentTermStatusBadge from "../../invoice/components/PaymentTermStatusBadge";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

const HEADERS = [
  "Invoice #", "Vendor", "Invoice Date", "Due Date", "Invoice Amount", "TDS",
  "Net Payable", "Paid", "Remaining", "Status", "Terms", "Action",
];
const COLUMNS = [
  "invoiceNumber", "vendor", "invoiceDate", "dueDate", "invoiceAmount", "tds",
  "netPayable", "paid", "remaining", "status", "terms", "action",
];

const STATUS_OPTIONS = [
  { value: "", label: "All payable" },
  { value: "READY_FOR_PAYMENT", label: "Ready for Payment" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
];

/**
 * Invoices Finance can pay now: READY_FOR_PAYMENT and PARTIALLY_PAID (GET /payment/ready-for-payment,
 * server-side search/filter/pagination). TDS, net payable and remaining all come from the backend.
 */
export default function PaymentReadyPage() {
  const { canRecordPayment } = useApPermissions();
  // Deep-linkable via `?status=READY_FOR_PAYMENT`/`?status=PARTIALLY_PAID` (e.g. from the AP
  // Dashboard's "Ready for Payment"/"Partially Paid" tiles) — one-shot initial read, same pattern
  // as InvoiceQueueView's `?queue=`. An unrecognized value just behaves like "All payable".
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() => {
    const requested = searchParams.get("status");
    return STATUS_OPTIONS.some((o) => o.value === requested) ? requested : "";
  });
  // `?overdue=1` deep link (Finance dashboard's Overdue card) - same one-shot initial read as `?status=`.
  const [overdue, setOverdue] = useState(() => searchParams.get("overdue") === "1");
  const [payingInvoice, setPayingInvoice] = useState(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const { items, total, page, setPage, totalPages, isLoading, isFetching, isError, error } = useReadyForPayment({
    search: debouncedSearch,
    status,
    overdue,
  });

  const rows = items.map((invoice) => {
    const symbol = invoice.currencySymbol;
    return {
      invoiceNumber: (
        <Link to={AP_ROUTES.PAYMENT_DETAIL(invoice.invoiceId)} className="font-medium text-[#0A0082] hover:underline">
          {invoice.invoiceNumber}
        </Link>
      ),
      vendor: invoice.vendorName,
      invoiceDate: formatDate(invoice.invoiceDate),
      dueDate: (
        <span className={invoice.isOverdue ? "font-medium text-red-600" : ""}>
          {formatDate(invoice.dueDate)}
          {invoice.isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
          {invoice.statutoryDueDate && (
            <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-700" title="MSME supplier — statutory payment limit applies">
              MSME
            </span>
          )}
        </span>
      ),
      invoiceAmount: formatCurrency(invoice.invoiceAmount, symbol),
      tds: invoice.tdsApplicable ? formatCurrency(invoice.tdsAmount, symbol) : "—",
      netPayable: formatCurrency(invoice.netPayable, symbol),
      paid: formatCurrency(invoice.amountPaid, symbol),
      remaining: <span className="font-semibold">{formatCurrency(invoice.remainingAmount, symbol)}</span>,
      status: <StatusBadge label={invoice.statusName || invoice.statusCode} size="sm" />,
      terms: <PaymentTermStatusBadge status={invoice.paymentTermStatus} />,
      action:
        canRecordPayment && invoice.remainingAmount > 0 ? (
          <Button variant="primary" size="small" onClick={() => setPayingInvoice(invoice)}>
            Record Payment
          </Button>
        ) : (
          <Link to={AP_ROUTES.PAYMENT_DETAIL(invoice.invoiceId)} className="text-sm font-medium text-[#0A0082] hover:underline">
            View
          </Link>
        ),
    };
  });

  const filtered = Boolean(debouncedSearch || status || overdue);

  return (
    <div className="p-6">
      <PageHeader
        title="Ready for Payment"
        subtitle="Approved invoices with verified TDS and an outstanding payable balance"
        actions={
          <Link to={AP_ROUTES.PAYMENT_HISTORY} className="text-sm font-medium text-[#0A0082] hover:underline">
            Payment History →
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
        <FormInput
          label="Search"
          name="search"
          placeholder="Invoice number or vendor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:col-span-2"
        />
        <FormSelect label="Status" name="status" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />
          Overdue only
        </label>
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load invoices ready for payment right now.")}
        </div>
      ) : !isLoading && items.length === 0 ? (
        <EmptyState
          title="No invoices are currently ready for payment."
          description={filtered ? "Try clearing the filters." : undefined}
        />
      ) : (
        <>
          <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={isLoading} />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{isFetching && !isLoading ? "Refreshing…" : `${total} invoice${total === 1 ? "" : "s"}`}</span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </>
      )}

      <RecordPaymentModal isOpen={Boolean(payingInvoice)} invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />
    </div>
  );
}

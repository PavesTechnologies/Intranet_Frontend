import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import StatusBadge from "../../../../components/status/statusbadge";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import EmptyState from "../../procurement/components/EmptyState";
import { usePaymentHistoryList, usePaymentMetadata } from "../hooks/usePaymentTracking";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { AP_ROUTES } from "../../constants/routes";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

const HEADERS = [
  "Invoice #", "Vendor", "Invoice Amount", "TDS", "Net Payable", "Paid",
  "Last Payment", "Mode", "UTR / Reference", "Status", "Receipts", "",
];
const COLUMNS = [
  "invoiceNumber", "vendor", "invoiceAmount", "tds", "netPayable", "paid",
  "lastPayment", "mode", "reference", "status", "receipts", "view",
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
];

/**
 * Invoices that have received at least one payment (GET /payment/history), most recently paid
 * first. One row per invoice — an invoice can have several payments; the row shows the latest and
 * "View" opens every payment with its receipts.
 */
export default function PaymentHistoryPage() {
  const { data: metadata } = usePaymentMetadata();
  // Deep-linkable via `?status=PAID`/`?status=PARTIALLY_PAID` (e.g. from the AP Dashboard's
  // "Paid Invoices" tile) — one-shot initial read, same pattern as InvoiceQueueView's `?queue=`.
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() => {
    const requested = searchParams.get("status");
    return STATUS_OPTIONS.some((o) => o.value === requested) ? requested : "";
  });
  const [paymentMode, setPaymentMode] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());

  const { items, total, page, setPage, totalPages, isLoading, isError, error } = usePaymentHistoryList({
    search: debouncedSearch,
    status,
    paymentMode,
    paidFrom,
    paidTo,
  });

  const modeLabel = Object.fromEntries((metadata?.paymentModes ?? []).map((m) => [m.value, m.label]));
  const modeOptions = [{ value: "", label: "All modes" }, ...(metadata?.paymentModes ?? []).map((m) => ({ value: m.value, label: m.label }))];

  const rows = items.map((invoice) => {
    const symbol = invoice.currencySymbol;
    const detailLink = AP_ROUTES.PAYMENT_DETAIL(invoice.invoiceId);
    return {
      invoiceNumber: (
        <Link to={detailLink} className="font-medium text-[#0A0082] hover:underline">
          {invoice.invoiceNumber}
        </Link>
      ),
      vendor: invoice.vendorName,
      invoiceAmount: formatCurrency(invoice.invoiceAmount, symbol),
      tds: invoice.tdsApplicable ? formatCurrency(invoice.tdsAmount, symbol) : "—",
      netPayable: formatCurrency(invoice.netPayable, symbol),
      paid: (
        <div>
          <div>{formatCurrency(invoice.amountPaid, symbol)}</div>
          {invoice.remainingAmount > 0 && (
            <div className="text-xs text-gray-500">Remaining {formatCurrency(invoice.remainingAmount, symbol)}</div>
          )}
        </div>
      ),
      lastPayment: (
        <div>
          <div>{formatDate(invoice.lastPaymentDate)}</div>
          {invoice.paymentCount > 1 && <div className="text-xs text-gray-500">{invoice.paymentCount} payments</div>}
        </div>
      ),
      mode: modeLabel[invoice.lastPaymentMode] || invoice.lastPaymentMode || "—",
      reference: invoice.lastPaymentReference || "—",
      status: <StatusBadge label={invoice.statusName || invoice.statusCode} size="sm" />,
      receipts: invoice.receiptCount > 0 ? `${invoice.receiptCount} file${invoice.receiptCount === 1 ? "" : "s"}` : "—",
      view: (
        <Link to={detailLink} className="text-sm font-medium text-[#0A0082] hover:underline">
          View
        </Link>
      ),
    };
  });

  const filtered = Boolean(debouncedSearch || status || paymentMode || paidFrom || paidTo);

  return (
    <div className="p-6">
      <PageHeader
        title="Payment History"
        subtitle="Invoices with recorded payments"
        actions={
          <Link to={AP_ROUTES.PAYMENT_READY} className="text-sm font-medium text-[#0A0082] hover:underline">
            ← Ready for Payment
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5 md:items-end">
        <FormInput
          label="Search"
          name="search"
          placeholder="Invoice number or vendor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FormSelect label="Status" name="status" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
        <FormSelect label="Payment Mode" name="paymentMode" options={modeOptions} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} />
        <FormDatePicker label="Paid From" name="paidFrom" value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)} />
        <FormDatePicker label="Paid To" name="paidTo" value={paidTo} min={paidFrom || undefined} onChange={(e) => setPaidTo(e.target.value)} />
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load payment history right now.")}
        </div>
      ) : !isLoading && items.length === 0 ? (
        <EmptyState title="No payment records found." description={filtered ? "Try clearing the filters." : undefined} />
      ) : (
        <>
          <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={isLoading} />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{`${total} invoice${total === 1 ? "" : "s"}`}</span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </>
      )}
    </div>
  );
}

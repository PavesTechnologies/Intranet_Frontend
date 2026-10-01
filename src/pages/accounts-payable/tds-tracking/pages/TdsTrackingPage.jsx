import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import StatusBadge from "../../../../components/status/statusbadge";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import EmptyState from "../../procurement/components/EmptyState";
import { useTdsTrackingList, useTdsTrackingMetadata } from "../hooks/useTdsTracking";
import { useDebouncedValue } from "../../payment/hooks/useDebouncedValue";
import { sectionLabel } from "../utils/tdsTrackingFormat";
import { AP_ROUTES } from "../../constants/routes";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

const HEADERS = [
  "Invoice #", "Vendor", "Invoice Date", "Payment Nature", "Section / Rule", "Invoice Amount",
  "TDS Rate", "TDS Amount", "Net Payable", "Invoice Status", "TDS Status", "",
];
const COLUMNS = [
  "invoiceNumber", "vendor", "invoiceDate", "nature", "section", "invoiceAmount",
  "rate", "tdsAmount", "netPayable", "invoiceStatus", "tdsStatus", "view",
];

const DETERMINATION_OPTIONS = [
  { value: "", label: "Any determination" },
  { value: "VERIFIED", label: "Verified" },
  { value: "DETERMINED", label: "Determined (not verified)" },
];

/**
 * Invoices whose backend TDS determination says TDS is applicable (GET /tds/tracking). Every TDS
 * figure is the backend's determination snapshot — nothing is recalculated here. Invoice payment
 * status and TDS status are shown side by side because they are independent.
 */
export default function TdsTrackingPage() {
  const { data: metadata } = useTdsTrackingMetadata();
  const [search, setSearch] = useState("");
  const [tdsStatus, setTdsStatus] = useState("");
  const [determinationStatus, setDeterminationStatus] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());

  const { items, total, page, setPage, totalPages, isLoading, isError, error } = useTdsTrackingList({
    search: debouncedSearch,
    tdsStatus,
    determinationStatus,
  });

  const statusOptions = [
    { value: "", label: "All TDS statuses" },
    ...(metadata?.tracking_statuses ?? []).map((s) => ({ value: s.value, label: s.label })),
  ];

  const rows = items.map((row) => {
    const link = AP_ROUTES.TDS_TRACKING_DETAIL(row.invoiceId);
    return {
      invoiceNumber: (
        <Link to={link} className="font-medium text-[#0A0082] hover:underline">
          {row.invoiceNumber}
        </Link>
      ),
      vendor: row.vendorName,
      invoiceDate: formatDate(row.invoiceDate),
      nature: row.paymentNature?.name || "—",
      section: sectionLabel(row),
      invoiceAmount: formatCurrency(row.invoiceAmount, row.currencySymbol),
      rate: row.tdsRate != null ? `${row.tdsRate}%` : "—",
      tdsAmount: formatCurrency(row.tdsAmount, row.currencySymbol),
      netPayable: formatCurrency(row.netPayable, row.currencySymbol),
      invoiceStatus: <StatusBadge label={row.invoiceStatusName || row.invoiceStatusCode || "—"} size="sm" />,
      tdsStatus: (
        <div>
          <StatusBadge label={row.trackingStatusLabel} size="sm" />
          {row.determinationStatus !== "VERIFIED" && (
            <div className="mt-1 text-xs text-amber-600">Awaiting TDS verification</div>
          )}
        </div>
      ),
      view: (
        <Link to={link} className="text-sm font-medium text-[#0A0082] hover:underline">
          View
        </Link>
      ),
    };
  });

  const filtered = Boolean(debouncedSearch || tdsStatus || determinationStatus);

  return (
    <div className="p-6">
      <PageHeader
        title="TDS Tracking"
        subtitle="Invoices with TDS withheld — record deduction, challan payment and return filing done outside the Intranet"
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
        <FormSelect label="TDS Status" name="tdsStatus" options={statusOptions} value={tdsStatus} onChange={(e) => setTdsStatus(e.target.value)} />
        <FormSelect
          label="Determination"
          name="determinationStatus"
          options={DETERMINATION_OPTIONS}
          value={determinationStatus}
          onChange={(e) => setDeterminationStatus(e.target.value)}
        />
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load TDS invoices right now.")}
        </div>
      ) : !isLoading && items.length === 0 ? (
        <EmptyState title="No TDS-applicable invoices found." description={filtered ? "Try clearing the filters." : undefined} />
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

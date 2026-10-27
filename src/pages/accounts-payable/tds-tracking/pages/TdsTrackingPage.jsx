import { useState } from "react";
import PageGuide from "../../guide/components/PageGuide";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import ApStatusBadge from "../../components/ApStatusBadge";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import EmptyState from "../../procurement/components/EmptyState";
import { SegmentedTabs } from "../../dashboard/components/insights";
import { useTdsTrackingList } from "../hooks/useTdsTracking";
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

// TDS is deducted when the vendor is paid, so TDS work starts at payment: the default view is the paid
// invoices; unpaid ones (TDS still to verify, coming up) are one tab away.
const VIEWS = [
  { value: "paid", label: "Paid", statuses: "TDS_DEDUCTED,TDS_DEPOSITED,TDS_FILED",
    hint: "Invoices paid to the vendor - TDS withheld, then deposited by the 7th of the next month and filed in the quarterly 26Q." },
  { value: "deposit", label: "To deposit", statuses: "TDS_DEDUCTED", hint: "TDS withheld from the vendor, not yet paid to the government with a challan." },
  { value: "file", label: "To file", statuses: "TDS_DEPOSITED", hint: "Deposited with a challan, not yet in a quarterly statement." },
  { value: "filed", label: "Filed", statuses: "TDS_FILED", hint: "Included in a filed quarterly statement." },
  { value: "unpaid", label: "Not yet paid", statuses: "TDS_PENDING",
    hint: "Approved or still in progress - TDS is deducted when the vendor is paid. Finance verifies the TDS before payment." },
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
  const [params, setParams] = useSearchParams();
  const view = VIEWS.find((v) => v.value === params.get("view")) || VIEWS[0];
  const tdsStatus = view.statuses;
  const [search, setSearch] = useState("");
  const [determinationStatus, setDeterminationStatus] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());

  const { items, total, page, setPage, totalPages, isLoading, isError, error } = useTdsTrackingList({
    search: debouncedSearch,
    tdsStatus,
    determinationStatus,
  });

  const setView = (value) => {
    setPage(1);
    setParams(value === VIEWS[0].value ? {} : { view: value }, { replace: true });
  };

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
      invoiceStatus: <ApStatusBadge status={row.invoiceStatusName || row.invoiceStatusCode} />,
      tdsStatus: (
        <ApStatusBadge
          type="tds"
          status={row.trackingStatus}
          label={row.trackingStatusLabel}
          determinationStatus={row.determinationStatus}
        />
      ),
      view: (
        <Link to={link} className="text-sm font-medium text-[#0A0082] hover:underline">
          View
        </Link>
      ),
    };
  });

  const filtered = Boolean(debouncedSearch || determinationStatus);

  return (
    <div className="p-6">
      <PageHeader
        title="TDS Tracking"
        subtitle="Invoices with TDS withheld — record deduction, challan payment and return filing done outside the Intranet"
        actions={
          <Link to={AP_ROUTES.TDS_CHALLANS}>
            <Button variant="primary">Challans &amp; filings</Button>
          </Link>
        }
      />
      <PageGuide page="tdsTracking" />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SegmentedTabs value={view.value} onChange={setView} tabs={VIEWS.map(({ value, label }) => ({ value, label }))} />
        <p className="text-xs text-gray-500">{view.hint}</p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
        <FormInput
          label="Search"
          name="search"
          placeholder="Invoice number or vendor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:col-span-2"
        />
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
        <EmptyState title={`No invoices in "${view.label}".`} description={filtered ? "Try clearing the filters." : undefined} />
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

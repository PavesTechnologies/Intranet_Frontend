import SearchInput from "../../../../components/filter/Searchbar";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import { INVOICE_TYPE_OPTIONS } from "../../constants/invoiceTypes";
import { INVOICE_STATUS_OPTIONS } from "../../constants/invoiceStatus";

const DATE_FIELD_OPTIONS = [
  { value: "invoiceDate", label: "Invoice Date" },
  { value: "dueDate", label: "Due Date" },
];

const INVOICE_TYPE_FILTER_OPTIONS = [{ value: "", label: "All Types" }, ...INVOICE_TYPE_OPTIONS];
const ALL_STATUSES_OPTION = { value: "", label: "All Statuses" };

/**
 * Combined search + type + status + date-range filter bar. Filters compose (search AND type AND
 * status AND date range are all applied together by invoiceService.getInvoices) rather than
 * being mutually exclusive — e.g. picking a Status while a tab is active narrows within that tab.
 *
 * `tabStatuses` is the active tab's status allowlist (null for "All"): the Status filter only
 * offers statuses that tab can contain, since any other pick could never match. "Clear Filters"
 * clears type/status/date only — the search term is cleared from the search box itself.
 *
 * Search covers invoice number and vendor name — the only searchable fields the invoice list
 * response carries (it has vendor_id/po_id, but no vendor code or PO number).
 */
export default function InvoiceFilterPanel({
  filters,
  onSearch,
  onInvoiceTypeChange,
  onStatusChange,
  onDateRangeChange,
  onReset,
  hasActiveFilters,
  tabStatuses = null,
}) {
  const statusOptions = [
    ALL_STATUSES_OPTION,
    ...(tabStatuses
      ? INVOICE_STATUS_OPTIONS.filter((option) => tabStatuses.includes(option.value))
      : INVOICE_STATUS_OPTIONS),
  ];

  // Responsive layout, every control bottom-aligned (items-end) at the same 40px height:
  //   mobile  — one column, stacked
  //   sm      — 2 columns
  //   lg      — 4 columns (search spans 2)
  //   xl+     — a single line: wide search, five equal filters, then Clear Filters at its natural width
  return (
    <div className="mb-4 grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(13rem,1.6fr)_repeat(5,minmax(0,1fr))_auto]">
      <div className="sm:col-span-2 lg:col-span-2 xl:col-span-1">
        <SearchInput
          value={filters.search}
          onSearch={onSearch}
          placeholder="Search invoice # or vendor name"
        />
      </div>

      <FormSelect
        label="Invoice Type"
        name="invoiceType"
        options={INVOICE_TYPE_FILTER_OPTIONS}
        value={filters.invoiceType}
        onChange={(e) => onInvoiceTypeChange(e.target.value)}
      />

      <FormSelect
        label="Status"
        name="status"
        options={statusOptions}
        value={filters.status}
        onChange={(e) => onStatusChange(e.target.value)}
      />

      <FormSelect
        label="Filter By"
        name="dateField"
        options={DATE_FIELD_OPTIONS}
        value={filters.dateField}
        onChange={(e) => onDateRangeChange(filters.dateFrom, filters.dateTo, e.target.value)}
      />

      <FormDatePicker
        label="From"
        name="dateFrom"
        value={filters.dateFrom}
        onChange={(e) => onDateRangeChange(e.target.value, filters.dateTo, filters.dateField)}
        inputClassName="h-10 py-0 text-sm"
      />

      <FormDatePicker
        label="To"
        name="dateTo"
        value={filters.dateTo}
        onChange={(e) => onDateRangeChange(filters.dateFrom, e.target.value, filters.dateField)}
        inputClassName="h-10 py-0 text-sm"
      />

      <div>
        <Button
          variant="outline"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="h-10 w-full whitespace-nowrap py-0"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
}

import SearchInput from "../../../../components/filter/Searchbar";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import { INVOICE_TYPE_OPTIONS } from "../../constants/invoiceTypes";

const DATE_FIELD_OPTIONS = [
  { value: "invoiceDate", label: "Invoice Date" },
  { value: "dueDate", label: "Due Date" },
];

const INVOICE_TYPE_FILTER_OPTIONS = [{ value: "", label: "All Types" }, ...INVOICE_TYPE_OPTIONS];

/**
 * Combined search + type + date-range filter bar. Filters compose (search AND type AND date
 * range are all applied together by invoiceService.getInvoices) rather than being mutually
 * exclusive.
 */
export default function InvoiceFilterPanel({ filters, onSearch, onInvoiceTypeChange, onDateRangeChange, onReset, hasActiveFilters }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <SearchInput
          value={filters.search}
          onSearch={onSearch}
          placeholder="Search invoice #, vendor, or PO number"
        />
      </div>

      <FormSelect
        label="Type"
        name="invoiceType"
        options={INVOICE_TYPE_FILTER_OPTIONS}
        value={filters.invoiceType}
        onChange={(e) => onInvoiceTypeChange(e.target.value)}
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
      />

      <FormDatePicker
        label="To"
        name="dateTo"
        value={filters.dateTo}
        onChange={(e) => onDateRangeChange(filters.dateFrom, e.target.value, filters.dateField)}
      />

      <div className="flex items-end">
        <Button variant="outline" onClick={onReset} disabled={!hasActiveFilters} className="w-full">
          Clear Filters
        </Button>
      </div>
    </div>
  );
}

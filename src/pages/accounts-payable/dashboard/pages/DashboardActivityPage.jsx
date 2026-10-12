import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Pagination from "../../../../components/Pagination/pagination";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { useEmployeeDirectory } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";
import { ActivityRows } from "../components/DashboardWidgets";
import { useDashboardActivity } from "../hooks/useDashboardActivity";
import { useDebouncedValue } from "../../payment/hooks/useDebouncedValue";
import { formatPeriodRange } from "../utils/dashboardFormatters";
import { getApiErrorMessage } from "../../utils/apiError";

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "invoice", label: "Invoice" },
  { value: "purchase_requisition", label: "Purchase Requisition" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "rfq", label: "RFQ" },
  { value: "vendor", label: "Vendor" },
];

const PAGE_SIZE = 20;

/**
 * Full activity history — GET /apm/dashboard/activity, the same endpoint the dashboard's Recent
 * Activity search box uses, paginated over the complete audit log rather than just the handful of
 * items the dashboard summary already loaded. Same visibility rules as the dashboard itself:
 * authorization comes from the caller's token, so an Invoice-only user can never search up
 * vendor/procurement activity here either. `entityType` values mirror this codebase's own
 * entity_type vocabulary (see dashboardNavigation.js's ENTITY_DETAIL_ROUTE) — not yet confirmed
 * 1:1 against the backend's accepted filter values, so an unexpected 422 here most likely means
 * one of these slugs needs adjusting against the real contract.
 */
export default function DashboardActivityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: employeeDirectory } = useEmployeeDirectory();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [entityType, setEntityType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, isLoading, isFetching, isError, error } = useDashboardActivity({
    search: debouncedSearch,
    entityType,
    fromDate,
    toDate,
    page,
    pageSize: PAGE_SIZE,
  });

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const is422 = error?.status === 422;

  // Any filter change restarts from page 1 — otherwise a narrower result set can leave `page`
  // pointing past the new last page.
  const updateFilter = (setter) => (value) => {
    setPage(1);
    setter(value);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Activity"
        subtitle={
          data?.period
            ? `Showing ${formatPeriodRange(data.period.from_date, data.period.to_date)}`
            : "Full activity history across your authorized AP scope"
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-5 md:items-end">
        <FormInput
          label="Search"
          name="search"
          placeholder="Invoice #, PR #, vendor name, or action"
          value={search}
          onChange={(e) => updateFilter(setSearch)(e.target.value)}
          className="md:col-span-2"
        />
        <FormSelect
          label="Type"
          name="entityType"
          options={ENTITY_TYPE_OPTIONS}
          value={entityType}
          onChange={(e) => updateFilter(setEntityType)(e.target.value)}
        />
        <FormDatePicker
          label="From"
          name="fromDate"
          value={fromDate}
          onChange={(e) => updateFilter(setFromDate)(e.target.value)}
          max={toDate || undefined}
        />
        <FormDatePicker
          label="To"
          name="toDate"
          value={toDate}
          onChange={(e) => updateFilter(setToDate)(e.target.value)}
          min={fromDate || undefined}
        />
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-12 text-center">
          <p className="text-sm font-semibold text-red-700">
            {is422 ? "That date range or filter isn't valid." : "Unable to load activity right now."}
          </p>
          <p className="max-w-md text-xs text-red-600">
            {getApiErrorMessage(error, is422 ? "Check the filters above and try again." : "Something went wrong — please try again.")}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-24">
          <LoadingSpinner text="Loading activity..." />
        </div>
      ) : items.length === 0 ? (
        <PageCard>
          <PageCardContent>
            <p className="py-10 text-center text-sm text-gray-500">
              {debouncedSearch ? `No activity matches "${debouncedSearch}".` : "No activity in this range."}
            </p>
          </PageCardContent>
        </PageCard>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <ActivityRows items={items} employeeDirectory={employeeDirectory} navigate={navigate} />
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>{isFetching ? "Refreshing…" : `${total} activit${total === 1 ? "y" : "ies"}`}</span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import SearchInput from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { useVendorOnboardingStatuses } from "../../hooks/useApLookups";

/**
 * Filters for the Internal Requests list, laid out exactly like VendorFilterPanel.
 *
 * Status options come from the VENDOR_ONBOARDING status master, so the filter sends a real
 * status_id to GET /apm/vendor-onboarding-requests rather than a hardcoded number.
 * "Assigned to me" maps to that endpoint's own assigned_to parameter.
 */
export default function InternalRequestsFilterPanel({ filters, onFiltersChange, canFilterMine }) {
  const { data: onboardingStatuses = [] } = useVendorOnboardingStatuses();

  const statusFilterOptions = [
    { value: "", label: "All Statuses" },
    ...onboardingStatuses.map((status) => ({
      value: status.status_id,
      label: status.status_name,
    })),
  ];

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center">
      <div className="w-full md:max-w-xs">
        <SearchInput
          value={filters.search}
          onSearch={(value) => onFiltersChange({ ...filters, search: value })}
          placeholder="Search by vendor, PR or request ID..."
        />
      </div>

      <div className="w-full md:w-56">
        <FilterListbox
          options={statusFilterOptions}
          value={filters.statusId}
          onChange={(value) => onFiltersChange({ ...filters, statusId: value })}
        />
      </div>

      {canFilterMine && (
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-gray-700">
          <input
            type="checkbox"
            checked={filters.mineOnly}
            onChange={(e) => onFiltersChange({ ...filters, mineOnly: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]/20"
          />
          Assigned to me
        </label>
      )}
    </div>
  );
}

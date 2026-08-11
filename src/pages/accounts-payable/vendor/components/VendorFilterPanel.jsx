import SearchInput from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
import useApLookups from "../../hooks/useApLookups";

const VendorFilterPanel = ({ filters, onFiltersChange }) => {
  const { countryOptions, vendorStatusOptions } = useApLookups();

  const statusFilterOptions = [{ value: "", label: "All Statuses" }, ...vendorStatusOptions];
  const countryFilterOptions = [{ value: "", label: "All Countries" }, ...countryOptions];

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center">
      <div className="w-full md:max-w-xs">
        <SearchInput
          value={filters.search}
          onSearch={(value) => onFiltersChange({ ...filters, search: value })}
          placeholder="Search vendors by name..."
        />
      </div>
      <div className="w-full md:w-56">
        <FilterListbox
          options={statusFilterOptions}
          value={filters.statusId}
          onChange={(value) => onFiltersChange({ ...filters, statusId: value })}
        />
      </div>
      <div className="w-full md:w-56">
        <FilterListbox
          options={countryFilterOptions}
          value={filters.countryId}
          onChange={(value) => onFiltersChange({ ...filters, countryId: value })}
        />
      </div>
    </div>
  );
};

export default VendorFilterPanel;

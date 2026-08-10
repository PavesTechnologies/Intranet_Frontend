import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { useApPermissions } from "../../hooks/useApPermissions";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";
import VendorTable from "../components/VendorTable";
import VendorFilterPanel from "../components/VendorFilterPanel";
import useVendors from "../hooks/useVendors";

const DEFAULT_FILTERS = { search: "", statusId: "", countryId: "" };

/** Route: /accounts-payable/vendors */
export default function VendorListPage() {
  const navigate = useNavigate();
  const { canOnboardVendor } = useApPermissions();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { vendors, isLoading, isError, error, page, setPage, totalPages } = useVendors(filters);

  return (
    <div className="p-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage vendor master records, bank details, and verification status."
        actions={
          canOnboardVendor ? (
            <Button variant="primary" onClick={() => navigate(AP_ROUTES.VENDOR_ONBOARD)}>
              <Plus className="h-4 w-4" /> Register Vendor
            </Button>
          ) : null
        }
      />

      <VendorFilterPanel filters={filters} onFiltersChange={setFilters} />

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load vendors.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading vendors..." />
      ) : (
        <div className="space-y-3">
          <VendorTable vendors={vendors} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      )}
    </div>
  );
}

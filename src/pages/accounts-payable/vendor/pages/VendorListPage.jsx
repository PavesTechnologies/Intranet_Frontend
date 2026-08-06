import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { useAuth } from "../../../../contexts/AuthContext";
// RBAC disabled for AP module development — restore to re-enable role checks
// import { AP_CLERK_PLUS_ROLES } from "../../constants/apRoles";
import VendorTable from "../components/VendorTable";
import VendorFilterPanel from "../components/VendorFilterPanel";
import useVendors from "../hooks/useVendors";

const DEFAULT_FILTERS = { search: "", statusId: "", countryId: "" };

export default function VendorListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { vendors, isLoading, isError, error, page, setPage, totalPages } = useVendors(filters);

  const canRegister = true; // RBAC disabled for AP module development — restore: hasRole(AP_CLERK_PLUS_ROLES)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage vendor master records, bank details, and verification status."
        actions={
          canRegister ? (
            <Button onClick={() => navigate("/accounts-payable/vendors/new")}>Register Vendor</Button>
          ) : null
        }
      />

      <VendorFilterPanel filters={filters} onFiltersChange={setFilters} />

      {isLoading && <LoadingSpinner text="Loading vendors..." />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load vendors{error?.message ? `: ${error.message}` : "."}
        </div>
      )}

      {!isLoading && !isError && (
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

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getApiErrorMessage } from "../../utils/apiError";
import { AP_ROUTES } from "../../constants/routes";
import { useAuth } from "../../../../contexts/AuthContext";
import { useApPermissions } from "../../hooks/useApPermissions";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import usePurchaseCategories from "../../system-configuration/hooks/usePurchaseCategories";
import { useOnboardingRequests } from "../../procurement/hooks/useVendorOnboarding";
import { useAllPurchaseRequisitions } from "../../procurement/hooks/usePurchaseRequisitions";
import useVendorOptions from "../../procurement/hooks/useVendorOptions";
import { currentUserId } from "../../procurement/utils/prAuthorization";
import RequesterLabel from "../../procurement/components/RequesterLabel";
import InternalRequestsTable from "../components/InternalRequestsTable";
import InternalRequestsFilterPanel from "../components/InternalRequestsFilterPanel";

const DEFAULT_FILTERS = { search: "", statusId: "", mineOnly: false };

/**
 * Route: /accounts-payable/vendors/internal-requests
 *
 * The Vendor Intaker's queue of Internal Vendor Onboarding Requests — raised by a Vendor
 * Officer from Procurement when no vendor was available for an approved PR, and processed
 * here in Vendor Management.
 *
 * Status and "assigned to me" are server-side filters on
 * GET /apm/vendor-onboarding-requests (status_id / assigned_to). Search is applied client-side
 * because that endpoint has no search parameter — it filters the rows already fetched and is
 * never used to decide anything about a request.
 */
export default function InternalRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canViewOnboarding } = useApPermissions();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const myUserId = currentUserId(user);

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
  } = useOnboardingRequests({
    statusId: filters.statusId || undefined,
    assignedTo: filters.mineOnly && myUserId ? String(myUserId) : undefined,
  });

  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = usePurchaseCategories();
  const { data: purchaseRequisitions = [] } = useAllPurchaseRequisitions();
  const { vendorNameById } = useVendorOptions();

  const departmentName = (id) => departments.find((d) => d.id === id)?.name || "—";
  const categoryName = (id) => categories.find((c) => c.id === id)?.name || "—";

  const prNumberById = useMemo(
    () => new Map(purchaseRequisitions.map((pr) => [Number(pr.id), pr.pr_number])),
    [purchaseRequisitions],
  );

  const visibleRequests = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    if (!term) return requests;

    return requests.filter((request) => {
      const prNumber = prNumberById.get(Number(request.pr_id)) || "";
      const vendorName =
        request.requested_vendor_name || vendorNameById?.get(Number(request.vendor_id)) || "";

      return (
        String(request.id).includes(term) ||
        vendorName.toLowerCase().includes(term) ||
        String(prNumber).toLowerCase().includes(term)
      );
    });
  }, [requests, filters.search, prNumberById, vendorNameById]);

  if (!canViewOnboarding) {
    return (
      <div className="p-6">
        <PageHeader title="Internal Requests" />
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          You don't have access to internal vendor onboarding requests. Contact your
          administrator if you believe this is incorrect.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumb
        items={[{ label: "Vendors", to: AP_ROUTES.VENDOR_LIST }, { label: "Internal Requests" }]}
      />

      <PageHeader
        title="Internal Requests"
        subtitle="Vendor onboarding requests raised from approved purchase requisitions that had no available vendor."
        actions={
          <Button variant="outline" onClick={() => navigate(AP_ROUTES.VENDOR_LIST)}>
            <ArrowLeft className="h-4 w-4" /> Back to Vendors
          </Button>
        }
      />

      <InternalRequestsFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        canFilterMine={Boolean(myUserId)}
      />

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load internal vendor onboarding requests.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading internal requests..." />
      ) : (
        <InternalRequestsTable
          requests={visibleRequests}
          departmentName={departmentName}
          categoryName={categoryName}
          prNumberById={prNumberById}
          vendorNameById={vendorNameById}
          requesterLabel={(createdBy) => (
            <RequesterLabel
              createdBy={createdBy}
              isRequester={String(createdBy || "") === String(myUserId || "")}
            />
          )}
        />
      )}
    </div>
  );
}

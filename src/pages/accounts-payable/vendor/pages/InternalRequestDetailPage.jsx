import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import StatusBadge from "../../../../components/status/statusbadge";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";
import { useAuth } from "../../../../contexts/AuthContext";
import { useApPermissions } from "../../hooks/useApPermissions";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import usePurchaseCategories from "../../system-configuration/hooks/usePurchaseCategories";
import useVendorDetail from "../hooks/useVendorDetail";
import usePurchaseRequisitionDetail from "../../procurement/hooks/usePurchaseRequisitionDetail";
import { useOnboardingRequest } from "../../procurement/hooks/useVendorOnboarding";
import { useVendorNda } from "../../procurement/hooks/useNda";
import RequesterLabel from "../../procurement/components/RequesterLabel";
import { currentUserId } from "../../procurement/utils/prAuthorization";
import {
  NDA_STATUS_LABEL,
  NDA_STATUS_TONE,
  ONBOARDING_STATUS,
  ONBOARDING_STATUS_LABEL,
  ONBOARDING_STATUS_TONE,
  isOnboardingOpen,
} from "../../procurement/constants/vendorOnboarding";

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col gap-1 border-b border-gray-100 py-2 last:border-0">
    <span className={Fonts.label}>{label}</span>
    <span className="text-sm text-gray-800">{value || "—"}</span>
  </div>
);

/**
 * Route: /accounts-payable/vendors/internal-requests/:requestId
 *
 * What the Vendor Intaker sees before starting work: the request itself, the procurement
 * context it carries (read-only — the backend reads department, category, requirement and
 * purpose from the request, never from this screen), and whatever vendor identity the officer
 * supplied.
 *
 * "Start Vendor Onboarding" hands off to the existing Register Vendor / Vendor Intake page
 * with `?onboardingRequestId=`; no second intake form exists.
 */
export default function InternalRequestDetailPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canViewOnboarding, canProcessOnboarding, canViewNda } = useApPermissions();

  const {
    data: request,
    isLoading,
    isError,
    error,
  } = useOnboardingRequest(requestId);

  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = usePurchaseCategories();
  const { data: pr } = usePurchaseRequisitionDetail(request?.pr_id);
  const { vendor } = useVendorDetail(request?.vendor_id);

  const { data: ndaLookup } = useVendorNda(request?.vendor_id, {
    departmentId: request?.department_id,
    purchaseCategoryId: request?.purchase_category_id,
    enabled: canViewNda && Boolean(request?.vendor_id),
  });

  if (!canViewOnboarding) {
    return (
      <div className="p-6">
        <PageHeader title="Internal Request" />
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          You don't have access to internal vendor onboarding requests.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading internal request..." />
      </div>
    );
  }

  if (isError || !request) {
    const notFound = error?.response?.status === 404;
    return (
      <div className="p-6">
        <PageHeader title="Internal Request" />
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-gray-700">
            {notFound ? "Request not found" : "Something went wrong"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {notFound
              ? "This onboarding request doesn't exist or may have been removed."
              : getApiErrorMessage(error, "Unable to load this request right now.")}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(AP_ROUTES.VENDOR_INTERNAL_REQUESTS)}
          >
            Back to Internal Requests
          </Button>
        </div>
      </div>
    );
  }

  const departmentName = departments.find((d) => d.id === request.department_id)?.name;
  const categoryName = categories.find((c) => c.id === request.purchase_category_id)?.name;
  const ndaStatusCode = ndaLookup?.nda?.status_code;

  // GST lives on the vendor's tax registrations, which only exist once intake has created
  // the vendor — shown when present rather than fabricated beforehand.
  const gstRegistration = (vendor?.vendor_address || [])
    .flatMap((address) => address.vendor_tax || [])
    .find((tax) => (tax.registration_type || "").toUpperCase().includes("GST"));

  const isOpen = isOnboardingOpen(request.status_code);
  const hasStarted = Boolean(request.engagement_id);

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Vendors", to: AP_ROUTES.VENDOR_LIST },
          { label: "Internal Requests", to: AP_ROUTES.VENDOR_INTERNAL_REQUESTS },
          { label: `Request #${request.id}` },
        ]}
      />

      <PageHeader
        title={`Internal Request #${request.id}`}
        subtitle="Vendor onboarding request raised from Procurement."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(AP_ROUTES.VENDOR_INTERNAL_REQUESTS)}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {canProcessOnboarding && isOpen && (
              <Button
                variant="primary"
                onClick={() =>
                  navigate(`${AP_ROUTES.VENDOR_ONBOARD}?onboardingRequestId=${request.id}`)
                }
              >
                {hasStarted ? "Continue Vendor Onboarding" : "Start Vendor Onboarding"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {!canProcessOnboarding && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span>
            You can view this request but not process it. Vendor onboarding is performed by a
            Vendor Intaker.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Request ───────────────────────────────────────────────────── */}
        <PageCard>
          <PageCardContent>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className={Fonts.subheading}>Request</h2>
              <StatusPill
                label={ONBOARDING_STATUS_LABEL[request.status_code] || request.status_code || "—"}
                tone={ONBOARDING_STATUS_TONE[request.status_code] || "neutral"}
                size="md"
              />
            </div>

            <DetailRow label="Request ID" value={`#${request.id}`} />
            <DetailRow
              label="Status"
              value={ONBOARDING_STATUS_LABEL[request.status_code] || request.status_code}
            />
            <DetailRow
              label="Raised By"
              value={
                <RequesterLabel
                  createdBy={request.created_by}
                  isRequester={
                    String(request.created_by || "") === String(currentUserId(user) || "")
                  }
                />
              }
            />
            <DetailRow label="Created Date" value={formatDate(request.created_at)} />
            <DetailRow
              label="Assigned Intaker"
              value={
                request.assigned_to ? (
                  <RequesterLabel
                    createdBy={request.assigned_to}
                    isRequester={
                      String(request.assigned_to) === String(currentUserId(user) || "")
                    }
                  />
                ) : (
                  "Unassigned"
                )
              }
            />
          </PageCardContent>
        </PageCard>

        {/* ── Procurement context (read-only) ───────────────────────────── */}
        <PageCard>
          <PageCardContent>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className={Fonts.subheading}>Procurement Context</h2>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Lock className="h-3 w-3" /> Read-only
              </span>
            </div>

            <DetailRow
              label="PR Number"
              value={
                pr?.pr_number ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-[#0A0082] hover:underline"
                    onClick={() => navigate(AP_ROUTES.PROCUREMENT_PR_DETAIL(request.pr_id))}
                  >
                    {pr.pr_number}
                  </button>
                ) : (
                  `PR #${request.pr_id}`
                )
              }
            />
            <DetailRow
              label="PR Status"
              value={pr?.status_code ? <StatusBadge label={pr.status_code} size="sm" /> : "—"}
            />
            <DetailRow label="Department" value={departmentName} />
            <DetailRow label="Purchase Category" value={categoryName} />
            <DetailRow label="Business Requirement" value={request.business_requirement} />
            <DetailRow label="Purpose of Onboarding" value={request.purpose_of_onboarding} />
          </PageCardContent>
        </PageCard>

        {/* ── Vendor ────────────────────────────────────────────────────── */}
        <PageCard className="lg:col-span-2">
          <PageCardContent>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className={Fonts.subheading}>Vendor</h2>
              {ndaStatusCode && (
                <StatusPill
                  label={`NDA ${NDA_STATUS_LABEL[ndaStatusCode] || ndaStatusCode}`}
                  tone={NDA_STATUS_TONE[ndaStatusCode] || "neutral"}
                  size="md"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
              <DetailRow
                label="Vendor Name"
                value={
                  vendor?.vendor_name ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#0A0082] hover:underline"
                      onClick={() => navigate(AP_ROUTES.VENDOR_DETAIL(request.vendor_id))}
                    >
                      {vendor.vendor_name}
                    </button>
                  ) : (
                    request.requested_vendor_name || "Not created yet"
                  )
                }
              />
              <DetailRow
                label="Email"
                value={vendor?.email || request.requested_vendor_email}
              />
              <DetailRow label="Phone" value={vendor?.phone_number} />
              <DetailRow
                label="GSTIN"
                value={gstRegistration?.registration_number}
              />
              <DetailRow label="PAN" value={vendor?.pan_number} />
              <DetailRow
                label="GST Verified"
                value={
                  gstRegistration
                    ? gstRegistration.is_verified
                      ? "Yes"
                      : "No"
                    : undefined
                }
              />
            </div>

            {!hasStarted && (
              <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Vendor details are captured during Vendor Intake. Start the onboarding to open
                the Vendor Intake form with this request's context.
              </p>
            )}

            {request.status_code === ONBOARDING_STATUS.COMPLETED && (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Onboarding completed. This vendor is available to purchase requisition{" "}
                {pr?.pr_number || `#${request.pr_id}`}, which can now continue with RFQ.
              </p>
            )}
          </PageCardContent>
        </PageCard>
      </div>
    </div>
  );
}

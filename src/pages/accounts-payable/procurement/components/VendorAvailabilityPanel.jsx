import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, Search, UserPlus } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { getApiErrorMessage } from "../../utils/apiError";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useVendorAvailability, useOnboardingRequestsForPr } from "../hooks/useVendorOnboarding";
import {
  ONBOARDING_STATUS,
  ONBOARDING_STATUS_LABEL,
  ONBOARDING_STATUS_TONE,
  isOnboardingOpen,
} from "../constants/vendorOnboarding";
import VendorOnboardingRequestModal from "./VendorOnboardingRequestModal";

// One entry point into onboarding: the Internal Request detail page under Vendor
// Management, which is where the Vendor Intaker starts the work.
const onboardingWorkspaceLink = (requestId) =>
  AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL(requestId);

/**
 * The PR Officer's step between PR approval and RFQ: ask the backend whether a vendor is
 * already available for this requisition's department/category, and branch accordingly.
 *
 * Availability, the onboarding request's stage and whether onboarding is finished are all
 * read from the API — this panel never decides any of them. It only shows the state and
 * offers the action that matches it.
 *
 * @param {{ pr:object, departmentName:string, categoryName:string }} props
 */
export default function VendorAvailabilityPanel({ pr, departmentName, categoryName }) {
  const { canCheckVendorAvailability, canCreateOnboarding, canProcessOnboarding } =
    useApPermissions();

  const [hasChecked, setHasChecked] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: onboardingRequests = [], isLoading: requestsLoading } =
    useOnboardingRequestsForPr(pr?.id);

  const openRequest = onboardingRequests.find((request) => isOnboardingOpen(request.status_code));
  const completedRequest = onboardingRequests.find(
    (request) => request.status_code === ONBOARDING_STATUS.COMPLETED,
  );

  // Once onboarding has completed, re-ask availability without waiting for a click — the
  // officer coming back to the PR should land straight on "vendor available".
  const shouldCheck = hasChecked || Boolean(completedRequest);

  const {
    data: availability,
    isLoading: availabilityLoading,
    isFetching: availabilityFetching,
    isError: availabilityError,
    error: availabilityErrorObj,
    refetch: refetchAvailability,
  } = useVendorAvailability(pr?.id, { enabled: shouldCheck });

  if (!canCheckVendorAvailability) return null;

  const vendors = availability?.vendors || [];
  const isAvailable = availability?.available === true;
  const isUnavailable = availability?.available === false;

  return (
    <PageCard className="mb-4">
      <PageCardContent>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Vendor Availability</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Checks whether an onboarded vendor already exists for {departmentName} ·{" "}
              {categoryName}.
            </p>
          </div>
          <Button
            variant={shouldCheck ? "outline" : "primary"}
            size="small"
            className="w-full sm:w-auto"
            onClick={() => {
              setHasChecked(true);
              if (shouldCheck) refetchAvailability();
            }}
            loading={availabilityLoading || availabilityFetching}
            loadingText="Checking..."
          >
            {shouldCheck ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Re-check
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5" /> Check Vendor Availability
              </>
            )}
          </Button>
        </div>

        {!shouldCheck && !requestsLoading && !openRequest && (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
            Run the availability check to see whether this requisition can go straight to RFQ.
          </p>
        )}

        {(availabilityLoading || availabilityFetching) && (
          <LoadingSpinner text="Checking vendor availability..." />
        )}

        {availabilityError && !availabilityFetching && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {getApiErrorMessage(availabilityErrorObj, "Could not check vendor availability.")}
            </span>
          </div>
        )}

        {/* ── Vendor available → straight on to RFQ ─────────────────────── */}
        {isAvailable && !availabilityFetching && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-emerald-800">Vendor Available</p>
                  <StatusPill label={`${vendors.length} vendor(s)`} tone="success" />
                </div>
                {completedRequest && (
                  <p className="mt-1 text-xs text-emerald-700">
                    Vendor onboarding completed. You can continue with RFQ.
                  </p>
                )}
                <ul className="mt-2 divide-y divide-emerald-100">
                  {vendors.map((vendor) => (
                    <li
                      key={vendor.vendor_id}
                      className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="text-xs font-medium text-emerald-900">
                        {vendor.vendor_name}
                        {vendor.vendor_code ? (
                          <span className="ml-2 font-mono text-[11px] text-emerald-700">
                            {vendor.vendor_code}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] text-emerald-700">{vendor.email || "—"}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Link to={`${AP_ROUTES.PROCUREMENT}?tab=quotation&prId=${pr.id}`}>
                    <Button variant="primary" size="small">
                      Continue to RFQ / Sourcing <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── No vendor → onboarding branch ─────────────────────────────── */}
        {isUnavailable && !availabilityFetching && !openRequest && !completedRequest && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800">Vendor Onboarding Required</p>
                <p className="mt-1 text-xs text-amber-700">
                  No onboarded vendor exists for this department and purchase category. Raise an
                  onboarding request — a Vendor Intaker will complete the intake, Pre-Screen and
                  any NDA, and this requisition will resume at RFQ afterwards.
                </p>
                {canCreateOnboarding ? (
                  <Button
                    variant="primary"
                    size="small"
                    className="mt-3"
                    onClick={() => setCreateOpen(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Create Vendor Onboarding Request
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-amber-700">
                    You don't have permission to raise an onboarding request.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Onboarding request status (open or closed) ────────────────── */}
        {onboardingRequests.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Vendor Onboarding Request
            </p>
            {onboardingRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-900">
                    Request #{request.id}
                  </span>
                  <StatusPill
                    label={ONBOARDING_STATUS_LABEL[request.status_code] || request.status_code || "—"}
                    tone={ONBOARDING_STATUS_TONE[request.status_code] || "neutral"}
                    size="md"
                  />
                </div>

                <dl className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {[
                    { label: "Assigned Vendor Intaker", value: request.assigned_to || "Unassigned" },
                    { label: "Requested Vendor", value: request.requested_vendor_name || "—" },
                    {
                      label: "Current Stage",
                      value: ONBOARDING_STATUS_LABEL[request.status_code] || request.status_code || "—",
                    },
                    { label: "Vendor Record", value: request.vendor_id ? `#${request.vendor_id}` : "Not created yet" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between gap-3 border-b border-gray-100 py-1.5 last:border-0"
                    >
                      <dt className="text-xs text-gray-500">{row.label}</dt>
                      <dd className="text-xs font-medium text-gray-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                {request.status_code === ONBOARDING_STATUS.COMPLETED && (
                  <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Vendor onboarding completed. You can continue with RFQ.
                  </p>
                )}

                {isOnboardingOpen(request.status_code) && canProcessOnboarding && (
                  <Link to={onboardingWorkspaceLink(request.id)}>
                    <Button variant="outline" size="small" className="mt-3">
                      Open Internal Request <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </PageCardContent>

      <VendorOnboardingRequestModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        pr={pr}
        departmentName={departmentName}
        categoryName={categoryName}
      />
    </PageCard>
  );
}

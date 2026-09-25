import { useState } from "react";
import { toast } from "react-toastify";
import { Building2, FileSignature, Mail, Tag } from "lucide-react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";

import { getApiErrorMessage } from "../../utils/apiError";
import { useApPermissions } from "../../hooks/useApPermissions";

import { useInviteVendors } from "../hooks/useRfqMutations";
import { useVendorAvailability } from "../hooks/useVendorOnboarding";
import { useRfqEligibilityBatch } from "../hooks/useRfqEligibility";
import {
  ELIGIBILITY_CHECK_LABEL,
  NDA_NOT_GENERATED_STATUS,
  NDA_ROW_ACTION_LABEL,
  NDA_ROW_LABEL,
  NDA_ROW_TONE,
  NDA_STATUS,
  NDA_STATUS_LABEL,
} from "../constants/vendorOnboarding";

/**
 * Invites one or more vendors (not already invited) to an RFQ.
 *
 * The candidate list is the PR's own vendor availability, so only vendors associated with this
 * requisition's department and purchase category are offered — never the whole vendor master.
 *
 * Each candidate is checked against the backend's RFQ eligibility gates
 * (POST /apm/rfq/eligibility/check — PR / VENDOR / ONBOARDING / PRE_SCREEN / NDA). A blocked
 * vendor cannot be selected and shows the backend's own reason; nothing about eligibility is
 * decided here, and RFQService.require_eligible re-checks it server-side on invite anyway.
 *
 * Where the blocker is the NDA gate, the row is actionable rather than a dead end: it shows
 * where that vendor's NDA has got to and offers the next step, which opens the NDA workspace
 * via `onManageNda`. Each row carries its own vendor id, so one vendor's NDA state never
 * leaks into another's.
 *
 * @param {{ isOpen:boolean, onClose:()=>void, rfqId:string|number, prId:number,
 *   excludeVendorIds?:(number|string)[], departmentName?:string, categoryName?:string,
 *   onManageNda?:(vendor:{vendorId:number, vendorName:string, email:string|null,
 *     vendorCode:string|null})=>void }} props
 */
export default function InviteVendorsModal({
  isOpen,
  onClose,
  rfqId,
  prId,
  excludeVendorIds = [],
  departmentName,
  categoryName,
  onManageNda,
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  const { canViewNda } = useApPermissions();

  const normalizedRfqId = String(rfqId ?? "").trim();

  // Candidates come from the PR's own vendor availability
  // (GET /purchase-requisitions/{pr_id}/vendor-availability), which the backend already scopes
  // to that requisition's department and purchase category. Sourcing from the vendor master
  // instead would offer the whole directory, including vendors with no engagement for this
  // department/category at all. Same query key as the Vendor Availability panel, so opening
  // this modal reuses that result rather than issuing a second request.
  const {
    data: availability,
    isLoading,
    isError: availabilityError,
    error: availabilityErrorObj,
  } = useVendorAvailability(prId, { enabled: isOpen && Boolean(prId) });

  const relatedVendors = Array.isArray(availability?.vendors) ? availability.vendors : [];

  const inviteVendors =
    useInviteVendors(normalizedRfqId);

  const excluded = new Set(
    excludeVendorIds.map((id) => Number(id))
  );

  const invitableVendors = relatedVendors.filter(
    (vendor) =>
      !excluded.has(Number(vendor.vendor_id))
  );

  // One batch call for the whole candidate list rather than a request per row. Only runs
  // while the modal is open, and re-runs whenever onboarding/NDA state invalidates it.
  const {
    eligibilityByVendorId,
    isLoading: eligibilityLoading,
    isError: eligibilityError,
    error: eligibilityErrorObj,
  } = useRfqEligibilityBatch(
    prId,
    invitableVendors.map((vendor) => vendor.vendor_id),
    { enabled: isOpen && Boolean(prId) },
  );

  const isBlocked = (vendorId) => {
    const verdict = eligibilityByVendorId.get(Number(vendorId));
    // Unknown (still loading, or the check itself failed) is never treated as blocked — the
    // backend rejects an ineligible invite regardless, so the UI doesn't guess.
    return verdict ? verdict.eligible === false : false;
  };

  const blockingReason = (vendorId) => {
    const verdict = eligibilityByVendorId.get(Number(vendorId));
    if (!verdict || verdict.eligible) return null;

    const failed = verdict.failed_checks?.[0];
    return (
      verdict.reason ||
      failed?.message ||
      (failed ? `${ELIGIBILITY_CHECK_LABEL[failed.check] || failed.check}: ${failed.status}` : null)
    );
  };

  /** The NDA gate of the backend's verdict — the only source of a row's NDA state. */
  const ndaCheckFor = (vendorId) =>
    (eligibilityByVendorId.get(Number(vendorId))?.checks || []).find(
      (check) => check.check === "NDA",
    ) || null;

  const toggle = (vendorId) => {
    if (isBlocked(vendorId)) return;

    setSelectedIds((previous) =>
      previous.includes(vendorId)
        ? previous.filter((id) => id !== vendorId)
        : [...previous, vendorId]
    );
  };

  const handleClose = () => {
    setSelectedIds([]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!normalizedRfqId || selectedIds.length === 0) {
      return;
    }

    try {
      await inviteVendors.mutateAsync(selectedIds);

      toast.success(
        `${selectedIds.length} vendor(s) invited.`
      );

      handleClose();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Failed to invite vendors."
        )
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Vendors"
      subtitle="Vendors available for this requisition's department and purchase category."
      size="lg"
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={
              !normalizedRfqId ||
              selectedIds.length === 0
            }
            loading={inviteVendors.isPending}
            loadingText="Inviting..."
          >
            Invite{" "}
            {selectedIds.length > 0
              ? `(${selectedIds.length})`
              : ""}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <LoadingSpinner text="Loading vendors..." />
      ) : availabilityError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(
            availabilityErrorObj,
            "Could not load the vendors available for this requisition.",
          )}
        </p>
      ) : invitableVendors.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          {relatedVendors.length === 0
            ? "No vendors are available for this requisition's department and purchase category yet. Raise a vendor onboarding request to add one."
            : "Every available vendor for this requisition has already been invited."}
        </p>
      ) : (
        <div className="space-y-2">
          {eligibilityLoading && (
            <p className="text-xs text-gray-500">Checking RFQ eligibility...</p>
          )}

          {eligibilityError && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {getApiErrorMessage(
                eligibilityErrorObj,
                "Could not check RFQ eligibility — the invite will still be validated by the server.",
              )}
            </p>
          )}

          <div className="max-h-[26rem] space-y-1.5 overflow-y-auto py-1">
            {invitableVendors.map((vendor) => {
              const blocked = isBlocked(vendor.vendor_id);
              const reason = blockingReason(vendor.vendor_id);
              const verdict = eligibilityByVendorId.get(Number(vendor.vendor_id));
              const ndaCheck = ndaCheckFor(vendor.vendor_id);

              const ndaStatus = ndaCheck?.status || null;
              const ndaRequired = Boolean(ndaStatus) && ndaStatus !== NDA_STATUS.NOT_REQUIRED;

              // Generate is offered only when the backend says the requirement stands and no
              // NDA exists yet. An unrecognised state shows the backend's reason and no
              // action, rather than guessing that generating is the right move.
              const canGenerate = ndaStatus === NDA_NOT_GENERATED_STATUS;
              const actionLabel = canGenerate
                ? "Generate NDA"
                : NDA_ROW_ACTION_LABEL[ndaStatus] || null;

              const showNdaAction =
                ndaRequired && Boolean(actionLabel) && canViewNda && Boolean(onManageNda);

              return (
                <div
                  key={vendor.vendor_id}
                  className={`rounded-lg border px-2.5 py-2 text-sm ${
                    blocked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <label
                    className={`flex items-start gap-2 ${
                      blocked ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(
                        vendor.vendor_id
                      )}
                      disabled={blocked}
                      onChange={() =>
                        toggle(vendor.vendor_id)
                      }
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]/20 disabled:cursor-not-allowed"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {vendor.vendor_name}
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Mail className="h-3 w-3" />
                          {vendor.email || "no email"}
                        </span>

                        {ndaStatus && (
                          <StatusPill
                            label={NDA_ROW_LABEL[ndaStatus] || NDA_STATUS_LABEL[ndaStatus] || ndaStatus}
                            tone={NDA_ROW_TONE[ndaStatus] || "neutral"}
                          />
                        )}

                        {verdict && (
                          <StatusPill
                            label={blocked ? "RFQ Blocked" : "RFQ Eligible"}
                            tone={blocked ? "danger" : "success"}
                          />
                        )}
                      </span>

                      {/* The department / category the NDA requirement is scoped to. */}
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                        {departmentName && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            {departmentName}
                          </span>
                        )}
                        {categoryName && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="h-3 w-3 text-gray-400" />
                            {categoryName}
                          </span>
                        )}
                        {vendor.vendor_code && (
                          <span className="font-mono text-gray-400">{vendor.vendor_code}</span>
                        )}
                      </span>

                      {blocked && reason && (
                        <span className="mt-1 block text-xs text-rose-600">{reason}</span>
                      )}
                    </span>
                  </label>

                  {showNdaAction && (
                    <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-2">
                      <Button
                        size="small"
                        variant={canGenerate ? "primary" : "outline"}
                        onClick={() =>
                          onManageNda({
                            vendorId: vendor.vendor_id,
                            vendorName: vendor.vendor_name,
                            email: vendor.email || null,
                            vendorCode: vendor.vendor_code || null,
                          })
                        }
                      >
                        <FileSignature className="h-3.5 w-3.5" /> {actionLabel}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

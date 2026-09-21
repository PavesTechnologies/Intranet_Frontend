import { useState } from "react";
import { toast } from "react-toastify";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";

import { getApiErrorMessage } from "../../utils/apiError";

import { useInviteVendors } from "../hooks/useRfqMutations";
import useVendorOptions from "../hooks/useVendorOptions";
import { useRfqEligibilityBatch } from "../hooks/useRfqEligibility";
import { ELIGIBILITY_CHECK_LABEL } from "../constants/vendorOnboarding";

/**
 * Invites one or more ACTIVE vendors (not already invited) to an RFQ.
 *
 * Each candidate is checked against the backend's RFQ eligibility gates
 * (POST /apm/rfq/eligibility/check — PR / VENDOR / ONBOARDING / PRE_SCREEN / NDA). A blocked
 * vendor cannot be selected and shows the backend's own reason; nothing about eligibility is
 * decided here, and RFQService.require_eligible re-checks it server-side on invite anyway.
 */
export default function InviteVendorsModal({
  isOpen,
  onClose,
  rfqId,
  prId,
  excludeVendorIds = [],
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  const normalizedRfqId = String(rfqId ?? "").trim();

  const {
    activeVendors,
    isLoading,
  } = useVendorOptions();

  const inviteVendors =
    useInviteVendors(normalizedRfqId);

  const excluded = new Set(
    excludeVendorIds.map((id) => Number(id))
  );

  const invitableVendors = activeVendors.filter(
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
      subtitle="Select one or more active, RFQ-eligible vendors to invite to this RFQ."
      size="md"
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
      ) : invitableVendors.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          No more active vendors available to invite.
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

          <div className="max-h-80 space-y-1 overflow-y-auto py-1">
            {invitableVendors.map((vendor) => {
              const blocked = isBlocked(vendor.vendor_id);
              const reason = blockingReason(vendor.vendor_id);
              const verdict = eligibilityByVendorId.get(Number(vendor.vendor_id));

              return (
                <label
                  key={vendor.vendor_id}
                  className={`flex items-start gap-2 rounded-lg px-2 py-2 text-sm ${
                    blocked
                      ? "cursor-not-allowed bg-gray-50 opacity-80"
                      : "cursor-pointer text-gray-700 hover:bg-gray-50"
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

                      <span className="text-xs text-gray-400">
                        {vendor.email || "no email"}
                      </span>

                      {verdict && (
                        <StatusPill
                          label={blocked ? "RFQ Blocked" : "RFQ Eligible"}
                          tone={blocked ? "danger" : "success"}
                        />
                      )}
                    </span>

                    {blocked && reason && (
                      <span className="mt-0.5 block text-xs text-rose-600">{reason}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

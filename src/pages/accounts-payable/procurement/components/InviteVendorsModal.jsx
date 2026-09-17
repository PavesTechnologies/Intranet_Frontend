import { useState } from "react";
import { toast } from "react-toastify";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";

import { getApiErrorMessage } from "../../utils/apiError";

import { useInviteVendors } from "../hooks/useRfqMutations";
import useVendorOptions from "../hooks/useVendorOptions";

/**
 * Invites one or more ACTIVE vendors (not already invited) to an RFQ.
 */
export default function InviteVendorsModal({
  isOpen,
  onClose,
  rfqId,
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

  const toggle = (vendorId) => {
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
      subtitle="Select one or more active vendors to invite to this RFQ."
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
        <div className="max-h-80 space-y-1 overflow-y-auto py-1">
          {invitableVendors.map((vendor) => (
            <label
              key={vendor.vendor_id}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(
                  vendor.vendor_id
                )}
                onChange={() =>
                  toggle(vendor.vendor_id)
                }
                className="h-4 w-4 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]/20"
              />

              <span className="font-medium text-gray-900">
                {vendor.vendor_name}
              </span>

              <span className="text-xs text-gray-400">
                {vendor.email || "no email"}
              </span>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
import React, { useState } from "react";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import FormSelect from "../../../components/forms/FormSelect";

export default function CancellationModal({
  title,
  subtitle,
  isOpen,
  isRevoke = false,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  isLoading,
}) {
  const predefinedReasons = [
    "Workload increased",
    "Incorrect request submitted",
    "Entered wrong dates",
    "Enter Valid description",
    "Other",
  ];

  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const isOther = selectedReason === "Other";

  const handleConfirm = () => {
    const finalReason = isOther ? customReason : selectedReason;
    onConfirm(finalReason);
  };

  const resolvedTitle =
    title || (isRevoke ? "Confirm Revoke" : "Confirm Cancellation");
  const resolvedSubtitle =
    subtitle ||
    (isRevoke
      ? "Are you sure you want to Revoke this Leave Request?"
      : "Are you sure you want to Cancel this Leave Request?");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={resolvedTitle}
      subtitle={resolvedSubtitle}
      size="sm"
      // This is a destructive-action confirmation with no prior backdrop/Escape/X
      // dismiss paths — only the explicit Cancel button closed it before, so none
      // of canonical Modal's default dismiss affordances are enabled here.
      closeOnBackdrop={false}
      closeOnEscape={false}
      showCloseButton={false}
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={
              isLoading ||
              !selectedReason ||
              (isOther && customReason.trim().length === 0)
            }
          >
            {isLoading ? `${confirmText}ing...` : confirmText}
          </Button>
        </div>
      }
    >
      <>
        {/* Reason Label */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select a Reason <span className="text-red-500">*</span>
        </label>

        {/* Reason Dropdown */}
        <FormSelect
          name="cancellationReason"
          options={predefinedReasons.map((r) => ({ value: r, label: r }))}
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
          placeholder="Choose a reason"
        />

        {/* Custom Reason Textarea */}
        {isOther && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Enter Custom Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              maxLength="60"
              rows="2"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Type your reason here..."
              className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        )}
      </>
    </Modal>
  );
}

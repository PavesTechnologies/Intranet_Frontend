import React from "react";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import Modal from "../../../components/Modal/modal";

const EffectiveDeactivationDate = ({
  isOpen,
  onConfirm,
  onCancel,
  isLoading,
  confirmText = "Confirm",
  effectiveDate,
  setEffectiveDate,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Effective Deactivation Date"
      subtitle="Are you sure you want to deactivate this leave type?"
      size="sm"
      closeOnBackdrop={false}
      closeOnEscape={false}
      showCloseButton={false}
      footer={
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(effectiveDate)}
            disabled={isLoading || !effectiveDate}  // disabled until a date is chosen
          >
            {isLoading ? `${confirmText}ing...` : confirmText}
          </Button>
        </div>
      }
    >
      <FormInput
        type="date"
        name="effectiveDate"
        value={effectiveDate || ""}
        onChange={(e) => setEffectiveDate(e.target.value)}
        min={new Date().toISOString().split("T")[0]}
        required
      />
    </Modal>
  );
};

export default EffectiveDeactivationDate;
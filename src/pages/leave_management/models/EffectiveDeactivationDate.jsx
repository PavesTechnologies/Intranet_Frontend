import React from "react";
import Button from "../../../components/Button/Button";

const EffectiveDeactivationDate = ({
  isOpen,
  onConfirm,
  onCancel,
  isLoading,
  confirmText = "Confirm",
  effectiveDate,          
  setEffectiveDate,       
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg shadow-xl max-w-sm w-full">
        <h3 className="text-sm font-semibold mb-2">Effective Deactivation Date</h3>
        <p className="mb-4 text-sm text-gray-600">Are you sure you want to deactivate this leave type?</p>
        <input
          type="date"
          value={effectiveDate || ""}
          onChange={(e) => setEffectiveDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="border rounded w-full px-2 py-2 mb-4"
          required
        />

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
      </div>
    </div>
  );
};

export default EffectiveDeactivationDate;
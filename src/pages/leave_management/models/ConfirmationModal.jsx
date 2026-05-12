import React from "react";
import Button from "../../../components/Button/Button";

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading, 
  confirmText = "Confirm", 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg shadow-xl max-w-sm w-full">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="mb-4 text-sm text-gray-600">{message}</p>
        <div className="flex justify-end space-x-2">
          <Button
            onClick={onCancel}
            disabled={isLoading}
            variant="ghost"
            size="medium"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading} // Disable button when loading
            variant="primary"
            size="medium"
          >
            {/* Change text based on loading state */}
            {isLoading ? `${confirmText}ing...` : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
import React from "react";

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
          <button
            onClick={onCancel}
            disabled={isLoading} // Disable button when loading
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading} // Disable button when loading
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Change text based on loading state */}
            {isLoading ? `${confirmText}ing...` : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
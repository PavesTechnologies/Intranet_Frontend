import React from "react";
import Button from "../../../components/Button/Button";

const Modal = ({ title, children, onClose, onConfirm, loading }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <div className="mb-4">{children}</div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="px-4 py-2 border-gray-300 hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="primary"
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Processing..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;

import React from "react";
import Button from "../Button/Button";
import { Fonts } from "../Fonts/Fonts";

const ConfirmationModal = ({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure?",
  children,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
        <h3 className={Fonts.heading4}>{title}</h3>

        <p className="mt-2 mb-5 text-sm text-gray-600 leading-relaxed">
          {message}
        </p>

        {children && <div className="mb-5">{children}</div>}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>

          <Button
            variant={variant}
            size="small"
            onClick={onConfirm}
            loading={isLoading}
            loadingText="Processing..."
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
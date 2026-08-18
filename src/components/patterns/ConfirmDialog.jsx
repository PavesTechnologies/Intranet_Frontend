import React from "react";
import Modal from "../Modal/modal";
import Button from "../Button/Button";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
  // Dismissal control — all default to Modal's own defaults (true), so any
  // existing consumer that omits them renders exactly as before. Set any of
  // these to false to reproduce a stricter, button-only-dismiss dialog (e.g.
  // Leave Management's ConfirmationModal, which has no backdrop/Escape/close-
  // icon dismissal today).
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      showCloseButton={showCloseButton}
    >
      {description ? <p className="text-sm text-gray-600">{description}</p> : null}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

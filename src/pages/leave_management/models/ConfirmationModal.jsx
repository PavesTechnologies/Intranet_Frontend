import React from "react";
import ConfirmDialog from "../../../components/patterns/ConfirmDialog";

// Compatibility wrapper around the canonical ConfirmDialog — kept (not
// deleted, not renamed) because this exact API is depended on by 7
// consumers, including a cross-module Timesheet consumer
// (Timesheet/ManagerApproval/ManagerApprovalTable.jsx). Every consumer
// keeps using this component unchanged; the actual confirmation UI is now
// rendered by the canonical ConfirmDialog underneath.
//
// closeOnBackdrop/closeOnEscape/showCloseButton are explicitly forced to
// false to reproduce this component's original strict, button-only-dismiss
// behavior exactly (see docs/ui/phase-2-leave-management.md, "P2.2b —
// ConfirmationModal → ConfirmDialog Migration") — do not rely on
// ConfirmDialog's own defaults here.
const ConfirmationModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading,
  confirmText = "Confirm",
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    title={title}
    description={message}
    onConfirm={onConfirm}
    onClose={onCancel}
    confirmText={confirmText}
    cancelText="Cancel"
    variant="primary"
    loading={isLoading}
    closeOnBackdrop={false}
    closeOnEscape={false}
    showCloseButton={false}
  />
);

export default ConfirmationModal;
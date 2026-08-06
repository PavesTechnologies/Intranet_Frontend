import React, { useState } from "react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormSelect from "../../../../components/forms/FormSelect";
import FormInput from "../../../../components/forms/FormInput";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { RESOLUTION_ACTIONS, RESOLUTION_ACTION_OPTIONS } from "../services/exceptionService";
import { useResolveException } from "../hooks/useExceptions";

const RESOLUTION_MESSAGES = {
  [RESOLUTION_ACTIONS.CORRECT_RESUBMIT]: (invoiceId) =>
    `${invoiceId} sent back to Pending Validation for correction.`,
  [RESOLUTION_ACTIONS.WAIVE_PROCEED]: (invoiceId) =>
    `${invoiceId} waived and moved to Pending Approval.`,
  [RESOLUTION_ACTIONS.ESCALATE_VENDOR]: (invoiceId) =>
    `${invoiceId} escalated to vendor. Exception remains open.`,
};

const ExceptionResolutionModal = ({ isOpen, onClose, exception }) => {
  const [resolutionAction, setResolutionAction] = useState(RESOLUTION_ACTIONS.CORRECT_RESUBMIT);
  const [notes, setNotes] = useState("");
  const { mutate, isPending } = useResolveException();

  if (!isOpen || !exception) return null;

  const handleClose = () => {
    setResolutionAction(RESOLUTION_ACTIONS.CORRECT_RESUBMIT);
    setNotes("");
    onClose();
  };

  const handleApply = () => {
    mutate(
      { invoiceId: exception.invoiceId, resolutionAction, notes },
      {
        onSuccess: () => {
          showStatusToast(
            RESOLUTION_MESSAGES[resolutionAction]?.(exception.invoiceId) || "Exception resolved.",
            resolutionAction === RESOLUTION_ACTIONS.ESCALATE_VENDOR ? "info" : "success"
          );
          handleClose();
        },
        onError: () => {
          showStatusToast(`Failed to resolve ${exception.invoiceId}.`, "error");
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Resolve Exception"
      subtitle={exception.invoiceId}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="medium" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="medium"
            onClick={handleApply}
            loading={isPending}
            loadingText="Applying..."
          >
            Apply Resolution
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
          <div>
            <p className="text-xs uppercase text-gray-500">Invoice</p>
            <p className="font-medium text-gray-800">{exception.invoiceId}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Vendor</p>
            <p className="font-medium text-gray-800">{exception.vendorName}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Amount</p>
            <p className="font-medium text-gray-800">{formatCurrency(exception.amount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Submitted</p>
            <p className="font-medium text-gray-800">{formatDate(exception.submittedDate)}</p>
          </div>
          <div className="col-span-2">
            <p className="mb-1 text-xs uppercase text-gray-500">Exception Type</p>
            <StatusBadge label={exception.type} size="sm" />
          </div>
          <div className="col-span-2">
            <p className="text-xs uppercase text-gray-500">Detail</p>
            <p className="text-gray-700">{exception.detail}</p>
          </div>
        </div>

        <FormSelect
          label="Resolution Action"
          name="resolutionAction"
          options={RESOLUTION_ACTION_OPTIONS}
          value={resolutionAction}
          onChange={(e) => setResolutionAction(e.target.value)}
        />

        <FormInput
          label="Notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this resolution..."
        />
      </div>
    </Modal>
  );
};

export default ExceptionResolutionModal;

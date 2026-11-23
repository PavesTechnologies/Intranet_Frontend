import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import { formatDeadlineDate } from "./submissionDeadline";

/** Matches the backend's minimum (ApprovalWorkflowServiceImpl.MIN_LATE_REASON_LENGTH). */
export const MIN_LATE_REASON_LENGTH = 10;

/**
 * Asked when the employee submits a report after its submission deadline. The employee explains the delay and the
 * report is submitted with that reason, which is saved on the report and in the audit log so approvers can see it.
 */
export default function LateSubmissionReasonModal({ isOpen, deadline, submitting = false, onCancel, onSubmit }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTouched(false);
    }
  }, [isOpen]);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_LATE_REASON_LENGTH;

  const handleSubmit = () => {
    setTouched(true);
    if (!tooShort) onSubmit(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onCancel()}
      title="Submit after the deadline"
      subtitle={deadline ? `The submission deadline was ${formatDeadlineDate(deadline)}` : undefined}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} loadingText="Submitting..." disabled={submitting}>
            Submit with reason
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          This report is past its submission deadline. You can still submit it - tell your approver why it is late.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">
            Reason for the late submission <span className="text-red-600">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={4}
            maxLength={2000}
            disabled={submitting}
            placeholder="For example: I was travelling for another client and could not collect the receipts in time."
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15"
          />
        </label>
        <div className="flex justify-between text-[11px]">
          <span className={touched && tooShort ? "text-red-600" : "text-gray-400"}>
            {touched && tooShort ? `Please write at least ${MIN_LATE_REASON_LENGTH} characters.` : "Your approver will see this reason."}
          </span>
          <span className="text-gray-400">{trimmed.length}/2000</span>
        </div>
      </div>
    </Modal>
  );
}

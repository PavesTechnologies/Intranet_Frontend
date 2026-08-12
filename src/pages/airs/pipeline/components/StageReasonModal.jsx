import React, { useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";

// Shown only when the backend rejects a drag-and-drop move with "reason
// required" (PipelineTransitionReasonRequiredException) — the frontend
// never decides up front whether a transition needs a reason; it just
// reacts to that specific rejection and retries once with one.
export default function StageReasonModal({ isOpen, onClose, onConfirm, candidateName, stageLabel }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reason Required" width="420px">
      <p className="text-[12.5px] text-slate-600 mb-3">
        Moving {candidateName ? <span className="font-semibold text-slate-900">{candidateName}</span> : "this candidate"} to{" "}
        <span className="font-semibold text-slate-900">{stageLabel}</span> requires a reason.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Enter a reason..."
        className="w-full rounded-lg border border-slate-200 p-2.5 text-[12.5px] outline-none focus:border-indigo-400"
        autoFocus
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="small" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={handleConfirm}
          disabled={!reason.trim()}
          loading={submitting}
          loadingText="Moving..."
        >
          Confirm Move
        </Button>
      </div>
    </Modal>
  );
}

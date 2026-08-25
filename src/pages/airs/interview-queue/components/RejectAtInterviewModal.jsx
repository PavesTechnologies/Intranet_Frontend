import React, { useState } from "react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";

const MAX_WORDS = 500;

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// Mirrors the backend's reject-interview validator (`value.split().length
// <= 500`) client-side so the limit surfaces immediately, not only via a
// 422 after submitting.
export default function RejectAtInterviewModal({ candidateName, isSubmitting, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const count = wordCount(reason);
  const overLimit = count > MAX_WORDS;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("A reason is required to reject this candidate.");
      return;
    }
    if (overLimit) {
      setError(`Reason must be ${MAX_WORDS} words or fewer (currently ${count}).`);
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Modal isOpen onClose={onClose} title="Reject Candidate" size="md">
      <div className="space-y-3">
        <p className="text-xs text-slate-600">
          This rejects <span className="font-semibold text-slate-900">{candidateName}</span> at the interview stage. The reason is recorded on
          the candidate&apos;s decision record.
        </p>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            rows={4}
            placeholder="Why is this candidate being rejected?"
            className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none ${
              error ? "border-rose-400" : "border-slate-200"
            }`}
          />
          <p className={`text-[10px] mt-1 ${overLimit ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
            {count} / {MAX_WORDS} words
          </p>
          {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="small" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="danger" size="small" onClick={handleConfirm} loading={isSubmitting} loadingText="Rejecting...">
            Reject Candidate
          </Button>
        </div>
      </div>
    </Modal>
  );
}

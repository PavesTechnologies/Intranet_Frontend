import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button/Button";

export default function CancelInterviewModal({ onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("A reason is required to cancel this interview.");
      return;
    }
    onConfirm(reason);
  };

  return (
    <Modal isOpen onClose={onClose} title="Cancel Interview" width="440px">
      <div className="space-y-4">
        <p className="text-[12.5px] text-slate-600">
          This will mark the interview as cancelled. This is a preview only — it does not affect any backend record.
        </p>

        <div>
          <label className="text-[12px] font-semibold text-slate-600 block mb-1">
            Reason <span className="text-rose-500 ml-0.5">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="Why is this interview being cancelled?"
            className={`w-full px-3 py-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? "border-rose-400" : "border-slate-200"
            }`}
          />
          {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose}>
            Back
          </Button>
          <Button variant="danger" size="small" onClick={handleConfirm}>
            Confirm Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

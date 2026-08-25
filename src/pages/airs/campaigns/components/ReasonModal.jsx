import React, { useEffect, useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/Button/Button";

// The backend enforces min 10 chars on every reason field. Mirroring
// it here turns a 422 into inline guidance, but the server stays the authority.
const MIN_REASON = 10;

// Shared reason capture for stage move, bulk move, reject and apply/clear
// override, so the character minimum and the disabled-until-valid behaviour
// can't drift between them.
export default function ReasonModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "primary",
  placeholder = "Explain why you are making this change…",
  extraContent = null,
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Never carry one action's justification into the next dialog.
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setSubmitting(false);
    }
  }, [isOpen]);

  const tooShort = reason.trim().length < MIN_REASON;

  const submit = async () => {
    if (tooShort) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      // The caller closes on success; on failure we stay open so the typed
      // reason isn't lost and the user can retry.
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="520px">
      <div className="space-y-3">
        {description && <p className="text-xs text-slate-600">{description}</p>}
        {extraContent}
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className={`text-[10px] mt-1 ${tooShort ? "text-slate-400" : "text-emerald-600"}`}>
            {tooShort
              ? `${MIN_REASON - reason.trim().length} more character(s) needed — this is recorded in the audit trail.`
              : "Recorded in the audit trail."}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="small" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={variant}
            size="small"
            onClick={submit}
            disabled={tooShort}
            loading={submitting}
            loadingText="Saving..."
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

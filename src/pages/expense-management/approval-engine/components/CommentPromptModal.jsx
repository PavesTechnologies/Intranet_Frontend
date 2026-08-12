import React, { useState } from "react";
import Button from "@/components/Button/Button";
import { Fonts } from "@/components/Fonts/Fonts";

/**
 * Shared shape for the two actions that require a comment: whole-report Reject and per-line
 * Needs Correction. Comment is required client-side as a UX nicety - the server re-validates
 * regardless (RejectReportRequest / LineItemReviewRequest both reject a blank comment).
 */
export default function CommentPromptModal({
  isOpen,
  title,
  description,
  contextLabel,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  isLoading,
}) {
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const trimmed = comment.trim();

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
        <h3 className={Fonts.heading4}>{title}</h3>
        {description && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>}
        {contextLabel && (
          <p className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700">
            {contextLabel}
          </p>
        )}
        <textarea
          className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30"
          rows={4}
          placeholder="Comment (required)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="small" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="small"
            disabled={!trimmed}
            loading={isLoading}
            loadingText="Saving..."
            onClick={() => onConfirm(trimmed)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

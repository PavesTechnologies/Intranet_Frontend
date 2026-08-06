import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useApprovals } from "../hooks/useApprovals";
import { APPROVAL_DECISION } from "../../constants/approvalTiers";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function ApprovalDecisionModal({ isOpen, invoice, onClose }) {
  const { decideInvoice, isDeciding } = useApprovals();
  const [comment, setComment] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) setComment("");
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const runDecision = async (decision, decisionComment) => {
    try {
      await decideInvoice({ invoiceId: invoice.id, decision, comment: decisionComment });
      showStatusToast(`Invoice ${invoice.id} ${decision === APPROVAL_DECISION.APPROVE ? "approved" : decision === APPROVAL_DECISION.REJECT ? "rejected" : "returned for correction"}.`, "success");
      onClose();
    } catch (error) {
      showStatusToast(error?.message || "Failed to record decision.", "error");
    }
  };

  const handleApprove = () => runDecision(APPROVAL_DECISION.APPROVE, comment);
  const handleReturn = () => runDecision(APPROVAL_DECISION.RETURN, comment);

  const handleRejectClick = () => {
    if (!comment.trim()) {
      showStatusToast("Add a comment explaining the rejection before continuing.", "warning");
      return;
    }
    setShowRejectConfirm(true);
  };

  const handleRejectConfirm = async () => {
    await runDecision(APPROVAL_DECISION.REJECT, comment);
    setShowRejectConfirm(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Review Invoice"
        subtitle={invoice.id}
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleReturn} disabled={isDeciding}>
              Return for Correction
            </Button>
            <Button variant="danger" onClick={handleRejectClick} disabled={isDeciding}>
              Reject
            </Button>
            <Button variant="success" onClick={handleApprove} loading={isDeciding} loadingText="Saving...">
              Approve
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-2">
            <div>
              <p className={Fonts.smallText}>Vendor</p>
              <p className="text-sm font-medium text-gray-800">{invoice.vendorName}</p>
            </div>
            <div>
              <p className={Fonts.smallText}>PO Number</p>
              <p className="text-sm font-medium text-gray-800">{invoice.poNumber || "—"}</p>
            </div>
            <div>
              <p className={Fonts.smallText}>Amount</p>
              <p className="text-sm font-medium text-gray-800">{formatCurrency(invoice.amount)}</p>
            </div>
            <div>
              <p className={Fonts.smallText}>Approval Tier</p>
              <p className="text-sm font-medium text-gray-800">{invoice.tier}</p>
            </div>
            <div>
              <p className={Fonts.smallText}>Submitted Date</p>
              <p className="text-sm font-medium text-gray-800">{formatDate(invoice.submittedDate)}</p>
            </div>
            <div>
              <p className={Fonts.smallText}>Due Date</p>
              <p className="text-sm font-medium text-gray-800">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="approval-comment" className={Fonts.label}>
              Comment
              <span className="ml-1 text-xs font-normal text-gray-400">(required to reject)</span>
            </label>
            <textarea
              id="approval-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add context for this decision..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
            />
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={showRejectConfirm}
        title="Reject Invoice"
        message={`Are you sure you want to reject invoice ${invoice.id}? This action will notify the vendor and cannot be undone.`}
        confirmText="Reject Invoice"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeciding}
        onConfirm={handleRejectConfirm}
        onCancel={() => setShowRejectConfirm(false)}
      />
    </>
  );
}

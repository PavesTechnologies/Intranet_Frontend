import { useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { useApproveInvoiceMutation, useRejectInvoiceMutation } from "../hooks/useInvoiceMutations";
import { useAuth } from "../../../../contexts/AuthContext";
import { getApiErrorMessage } from "../../utils/apiError";
import { ISSUE_SEVERITY, ISSUE_STATUS } from "../../constants/invoiceIssues";
import { formatCurrency } from "../../utils/formatters";

/**
 * Business (approval) review — separate from Validation on purpose (see PART 14): a clean
 * validation pass and high OCR confidence only ever land an invoice in Pending Approval, never
 * Approved/Ready for Payment directly. Reaching Ready for Payment always requires this panel's
 * explicit human Approve action.
 */
export default function InvoiceApprovalPanel({ invoice }) {
  const { user } = useAuth();
  const approverName = user?.name || user?.email || "current_user";
  const approveInvoice = useApproveInvoiceMutation();
  const rejectInvoice = useRejectInvoiceMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const openIssues = invoice.issues.filter((issue) => issue.status === ISSUE_STATUS.OPEN);
  const hasOpenErrors = openIssues.some((issue) => issue.severity === ISSUE_SEVERITY.ERROR);
  const confidencePct = Math.round((invoice.ocrFields?.confidenceScore || 0) * 100);
  const symbol = invoice.currency?.symbol || "₹";

  const handleApprove = () => {
    approveInvoice.mutate(
      { invoiceId: invoice.id, approvedBy: approverName },
      {
        onSuccess: () => {
          toast.success(`Invoice ${invoice.invoiceNumber} approved and moved to Ready for Payment.`);
          setConfirmOpen(false);
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not approve this invoice.")),
      }
    );
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    rejectInvoice.mutate(
      { invoiceId: invoice.id, rejectedBy: approverName, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`Invoice ${invoice.invoiceNumber} rejected.`);
          setRejectOpen(false);
          setReason("");
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not reject this invoice.")),
      }
    );
  };

  return (
    <PageCard>
      <PageCardContent>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Approval</h3>

        <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Vendor</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{invoice.vendor?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">PO Number</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{invoice.purchaseOrder?.poNumber || "Not applicable"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Net Amount</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(invoice.netAmount, symbol)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">OCR Confidence</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{confidencePct}%</dd>
          </div>
        </dl>

        {hasOpenErrors ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <XCircle className="h-4 w-4 shrink-0" /> This invoice has unresolved validation errors — resolve them before approving.
          </div>
        ) : (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Validation passed and no duplicate detected — ready for business review.
          </div>
        )}

        <p className="mb-3 flex items-center gap-1 text-xs text-gray-500">
          <AlertTriangle className="h-3.5 w-3.5" /> High OCR confidence and a clean validation pass do not auto-approve — this decision is yours.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
          <Button variant="primary" onClick={() => setConfirmOpen(true)} disabled={hasOpenErrors}>
            Approve
          </Button>
        </div>
      </PageCardContent>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve invoice"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApprove} loading={approveInvoice.isPending}>
              Confirm Approval
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700">
          Approve invoice <span className="font-semibold">{invoice.invoiceNumber}</span> for{" "}
          <span className="font-semibold">{formatCurrency(invoice.netAmount, symbol)}</span> and move it to Ready for Payment?
        </p>
      </Modal>

      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject invoice"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={!reason.trim()} loading={rejectInvoice.isPending}>
              Confirm Rejection
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-gray-700">
          Reject invoice <span className="font-semibold">{invoice.invoiceNumber}</span>. A reason is required.
        </p>
        <FormTextArea
          label="Rejection reason"
          name="rejectionReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this invoice is being rejected..."
          rows={3}
          required
        />
      </Modal>
    </PageCard>
  );
}

import { useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { useApproveInvoiceMutation, useRejectInvoiceMutation, useInvoiceApprovals } from "../hooks/useInvoiceApprovals";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";

/**
 * Real approve/reject/history against POST /apm/invoice/{id}/approve, /reject and
 * GET /apm/invoice/{id}/approvals. History renders regardless of current status; the
 * approve/reject actions only show while the invoice is actually Pending Approval.
 */
export default function InvoiceApprovalPanel({ invoice }) {
  const approveInvoice = useApproveInvoiceMutation();
  const rejectInvoice = useRejectInvoiceMutation();
  const { data: history = [], isLoading: historyLoading } = useInvoiceApprovals(invoice.id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [rejectComments, setRejectComments] = useState("");

  const isPendingApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
  const symbol = invoice.currency?.symbol || "₹";

  const handleApprove = () => {
    approveInvoice.mutate(
      { invoiceId: invoice.id, comments: approveComments },
      {
        onSuccess: () => {
          toast.success(`Invoice ${invoice.invoiceNumber} approved.`);
          setConfirmOpen(false);
          setApproveComments("");
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not approve this invoice.")),
      },
    );
  };

  const handleReject = () => {
    if (!rejectComments.trim()) return;
    rejectInvoice.mutate(
      { invoiceId: invoice.id, comments: rejectComments.trim() },
      {
        onSuccess: () => {
          toast.success(`Invoice ${invoice.invoiceNumber} rejected.`);
          setRejectOpen(false);
          setRejectComments("");
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not reject this invoice.")),
      },
    );
  };

  return (
    <PageCard>
      <PageCardContent>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Approval</h3>

        <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Vendor</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{invoice.vendor?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Net Amount</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(invoice.netAmount, symbol)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{invoice.status}</dd>
          </div>
        </dl>

        {isPendingApproval && (
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
            <Button variant="primary" onClick={() => setConfirmOpen(true)}>
              Approve
            </Button>
          </div>
        )}

        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Approval History</h4>
        {historyLoading ? (
          <p className="text-sm text-gray-400">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm italic text-gray-500">No approval decisions recorded yet.</p>
        ) : (
          <ol className="space-y-2 border-l border-gray-200 pl-4">
            {history.map((entry) => (
              <li key={entry.invoice_approval_id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#0A0082]" />
                <p className="text-sm font-medium text-gray-900">
                  {entry.decision} — {entry.approver_name}
                </p>
                <p className="text-xs text-gray-500">{formatDate(entry.decided_at || entry.created_at)}</p>
                {entry.comments && <p className="mt-0.5 text-xs text-gray-600">{entry.comments}</p>}
              </li>
            ))}
          </ol>
        )}
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
        <p className="mb-3 text-sm text-gray-700">
          Approve invoice <span className="font-semibold">{invoice.invoiceNumber}</span> for{" "}
          <span className="font-semibold">{formatCurrency(invoice.netAmount, symbol)}</span>?
        </p>
        <FormTextArea
          label="Comments (optional)"
          name="approveComments"
          value={approveComments}
          onChange={(e) => setApproveComments(e.target.value)}
          rows={2}
        />
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
            <Button variant="danger" onClick={handleReject} disabled={!rejectComments.trim()} loading={rejectInvoice.isPending}>
              Confirm Rejection
            </Button>
          </div>
        }
      >
        <p className="mb-3 flex items-start gap-2 text-sm text-gray-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          Reject invoice <span className="font-semibold">{invoice.invoiceNumber}</span>. A reason is required.
        </p>
        <FormTextArea
          label="Rejection reason"
          name="rejectComments"
          value={rejectComments}
          onChange={(e) => setRejectComments(e.target.value)}
          placeholder="Explain why this invoice is being rejected..."
          rows={3}
          required
        />
      </Modal>
    </PageCard>
  );
}

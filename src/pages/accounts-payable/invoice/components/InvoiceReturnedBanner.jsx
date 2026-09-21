import { CornerUpLeft } from "lucide-react";
import ApproverLabel from "../../system-configuration/components/ApproverLabel";
import { useInvoiceApproval } from "../hooks/useInvoiceApprovals";
import { formatDate } from "../../utils/formatters";

/**
 * "Returned by / Reason / Returned at" for an invoice currently RETURNED_FOR_REVIEW (spec
 * section 12). This isn't a separate field on the invoice — it's read off the just-cancelled
 * InvoiceApproval instance send_back() left behind: GET .../approval already returns the
 * *latest* instance regardless of status (get_latest_invoice_approval_for_invoice), so right
 * after a send-back that's exactly the cancelled cycle, with the acting approver's decision row
 * (status REJECTED — see invoice_approval_service.py's send_back docstring for why there's no
 * distinct "returned" value at that granularity) carrying the reason/timestamp/who.
 */
export default function InvoiceReturnedBanner({ invoiceId }) {
  const { data: approval } = useInvoiceApproval(invoiceId);

  if (!approval || approval.status !== "CANCELLED") return null;

  const cancelledStep = (approval.steps || [])
    .filter((step) => step.status === "CANCELLED")
    .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))[0];
  const actor = (cancelledStep?.approvers || [])
    .filter((a) => a.status === "REJECTED")
    .sort((a, b) => new Date(b.decided_at || 0) - new Date(a.decided_at || 0))[0];

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <CornerUpLeft size={16} className="text-amber-700" />
        <h3 className="text-sm font-semibold text-amber-800">Returned for Review</h3>
      </div>
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-amber-700">Returned By</dt>
          <dd className="mt-0.5 text-amber-900">
            {actor ? <ApproverLabel userUuid={actor.user_uuid} /> : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-amber-700">Returned At</dt>
          <dd className="mt-0.5 text-amber-900">{actor?.decided_at ? formatDate(actor.decided_at) : "—"}</dd>
        </div>
        <div className="sm:col-span-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-amber-700">Reason</dt>
          <dd className="mt-0.5 text-amber-900">{actor?.comments || "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

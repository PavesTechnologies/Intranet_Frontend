import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, Circle, Clock, Send, XCircle } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import FormTextArea from "../../../../components/forms/FormTextArea";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ApproverLabel from "../../system-configuration/components/ApproverLabel";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import usePurchaseCategories from "../../system-configuration/hooks/usePurchaseCategories";
import { useApprovalPolicyDetail } from "../../system-configuration/hooks/useApprovalPolicies";
import {
  useInvoiceApproval,
  useSendForApprovalMutation,
  useApproveInvoiceMutation,
  useRejectInvoiceMutation,
} from "../hooks/useInvoiceApprovals";
import { useApPermissions } from "../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";

const APPROVER_TYPE_LABEL = {
  DEPARTMENT_APPROVER: "Department Approver",
  ROLE: "Role",
  USER: "User",
};

const APPROVAL_RULE_LABEL = { ANY_ONE: "Any One", ALL: "All" };

const IN_FLIGHT_STATUSES = ["PENDING", "IN_PROGRESS"];

function StepStatusIcon({ status }) {
  if (status === "APPROVED") return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (status === "REJECTED") return <XCircle size={16} className="text-rose-600" />;
  if (status === "SKIPPED" || status === "CANCELLED") return <Circle size={16} className="text-gray-300" />;
  if (status === "PENDING") return <Clock size={16} className="text-amber-500" />;
  return <Circle size={16} className="text-gray-300" />;
}

/**
 * Real multi-level approval workflow against send-for-approval/approve/reject/GET approval —
 * the step/approver list here IS the timeline, never hardcoded or reconstructed from current
 * UMS roles (Backend/API_Layer/interface/approval_interface.py: InvoiceApprovalDTO.steps[]).
 * Approve/Reject are gated by permission on the frontend, but backend eligibility (assigned
 * approver for the currently active step, not already decided) is the real gate — a permitted
 * user who isn't eligible gets the backend's own explanatory error surfaced via toast rather
 * than a client-side guess at eligibility.
 */
export default function InvoiceApprovalPanel({ invoice }) {
  const { canSendForApproval, canApproveInvoice, canRejectInvoice } = useApPermissions();
  const { data: approval, isLoading, error } = useInvoiceApproval(invoice.id);
  const sendForApproval = useSendForApprovalMutation();
  const approveInvoice = useApproveInvoiceMutation();
  const rejectInvoice = useRejectInvoiceMutation();

  // "Which policy matched" and "who's currently blocking this" — approval.approval_policy_id is
  // just an id (Backend/API_Layer/interface/approval_interface.py), so the policy itself is
  // fetched separately via the same policy-detail hook System Configuration uses.
  const { data: policy } = useApprovalPolicyDetail(approval?.approval_policy_id);
  const { data: departmentData } = useDepartments();
  const { data: categoryData } = usePurchaseCategories();
  const departmentsById = useMemo(() => new Map((departmentData || []).map((d) => [d.id, d])), [departmentData]);
  const categoriesById = useMemo(() => new Map((categoryData || []).map((c) => [c.id, c])), [categoryData]);

  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [rejectComments, setRejectComments] = useState("");

  const symbol = invoice.currency?.symbol || "₹";
  // A 404 here means send-for-approval was never called for this invoice — "no approval
  // instance yet", not a real error (see useInvoiceApprovals.js).
  const hasNoApprovalYet = error?.status === 404;
  const isLoadFailure = Boolean(error) && !hasNoApprovalYet;

  const steps = (approval?.steps || []).slice().sort((a, b) => a.level_number - b.level_number);
  const isInFlight = approval && IN_FLIGHT_STATUSES.includes(approval.status);
  // The backend's send-for-approval route itself rejects anything not already at Pending
  // Approval ("Invoice N cannot be sent for approval while in status ...") — an invoice still at
  // OCR Review Pending has to be reviewed/saved first (InvoiceReviewEditor), which is what
  // actually advances it to Pending Approval in the first place (apply_ocr_review).
  const canOfferSend = invoice.status === INVOICE_STATUS.PENDING_APPROVAL && canSendForApproval && (hasNoApprovalYet || !approval);

  const decidedApprovers = steps
    .flatMap((step) =>
      (step.approvers || [])
        .filter((a) => a.status === "APPROVED" || a.status === "REJECTED")
        .map((a) => ({ ...a, level_number: step.level_number })),
    )
    .sort((a, b) => new Date(a.decided_at) - new Date(b.decided_at));

  // The one step currently blocking progress — "who needs to approve it right now", as opposed
  // to the full level-by-level timeline below. Levels advance in order, so at most one should
  // ever be PENDING at a time.
  const currentStep = steps.find((step) => step.status === "PENDING");
  const currentApprovers = (currentStep?.approvers || []).filter((a) => a.status === "PENDING" || a.status === "WAITING");

  const policyDepartment = policy ? departmentsById.get(policy.department_id) : null;
  const policyCategory = policy ? categoriesById.get(policy.purchase_category_id) : null;

  const handleSend = () => {
    sendForApproval.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(`${invoice.invoiceNumber} sent for approval.`);
        setSendConfirmOpen(false);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err, "Could not send this invoice for approval."));
        setSendConfirmOpen(false);
      },
    });
  };

  const handleApprove = () => {
    approveInvoice.mutate(
      { invoiceId: invoice.id, comments: approveComments },
      {
        onSuccess: () => {
          toast.success(`Invoice ${invoice.invoiceNumber} approved.`);
          setConfirmOpen(false);
          setApproveComments("");
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Could not approve this invoice.")),
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
        onError: (err) => toast.error(getApiErrorMessage(err, "Could not reject this invoice.")),
      },
    );
  };

  return (
    <PageCard>
      <PageCardContent>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Approval</h3>
          {approval && <StatusBadge label={approval.status} size="sm" />}
        </div>

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
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Invoice Status</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{invoice.status}</dd>
          </div>
        </dl>

        {isLoading ? (
          <LoadingSpinner text="Loading approval status..." />
        ) : isLoadFailure ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {getApiErrorMessage(error, "Could not load approval status for this invoice.")}
          </div>
        ) : !approval ? (
          <div className="mb-4 flex flex-col items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span>This invoice has not been sent for approval yet.</span>
            {canOfferSend && (
              <Button variant="primary" size="small" onClick={() => setSendConfirmOpen(true)}>
                <Send size={14} /> Send for Approval
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Applied Policy</p>
              {policy ? (
                <>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                    {policy.name}
                    {policy.is_default && (
                      <span className="rounded-full border border-indigo-300 bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {policy.is_default
                      ? "Catch-all fallback — no department/category-specific policy matched this invoice."
                      : `${policyDepartment?.name || `Department #${policy.department_id}`} · ${policyCategory?.name || `Category #${policy.purchase_category_id}`}`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-500">Loading policy details…</p>
              )}
            </div>

            {isInFlight && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Waiting On</p>
                {!currentStep ? (
                  <p className="mt-1 text-sm text-amber-800">Resolving the next approval step…</p>
                ) : currentApprovers.length === 0 ? (
                  <p className="mt-1 text-sm text-amber-800">
                    Currently at level {currentStep.level_number} (
                    {APPROVER_TYPE_LABEL[currentStep.approver_type] || currentStep.approver_type}
                    {currentStep.role_code ? ` — ${currentStep.role_code}` : ""}) — no eligible approver has been
                    assigned yet.
                  </p>
                ) : (
                  <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-amber-800">
                    Currently at level {currentStep.level_number}
                    <span className="text-xs text-amber-600">
                      ({APPROVAL_RULE_LABEL[currentStep.approval_rule] || currentStep.approval_rule}):
                    </span>
                    {currentApprovers.map((a, i) => (
                      <span key={a.id} className="flex items-center gap-1 font-medium">
                        <ApproverLabel userUuid={a.user_uuid} />
                        {i < currentApprovers.length - 1 && <span className="text-amber-400">,</span>}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            )}

            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Approval Timeline</h4>
            <ol className="mb-4 space-y-3 border-l border-gray-200 pl-4">
              {steps.map((step) => (
                <li key={step.id} className="relative">
                  <span className="absolute -left-[21px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                    <StepStatusIcon status={step.status} />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Level {step.level_number}</span>
                    <span className="text-xs text-gray-500">
                      {APPROVER_TYPE_LABEL[step.approver_type] || step.approver_type}
                      {step.role_code ? ` — ${step.role_code}` : ""}
                    </span>
                    <span className="text-xs text-gray-400">· {APPROVAL_RULE_LABEL[step.approval_rule] || step.approval_rule}</span>
                    <StatusBadge label={step.status} size="sm" />
                  </div>
                  {step.approvers?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {step.approvers.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <ApproverLabel userUuid={a.user_uuid} />
                          <StatusBadge label={a.status} size="sm" />
                          {a.decided_at && <span className="text-gray-400">{formatDate(a.decided_at)}</span>}
                          {a.comments && <span className="italic text-gray-500">"{a.comments}"</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>

            {isInFlight && (canApproveInvoice || canRejectInvoice) && (
              <div className="mb-4 flex flex-wrap justify-end gap-2">
                {canRejectInvoice && (
                  <Button variant="outline" onClick={() => setRejectOpen(true)}>
                    Reject
                  </Button>
                )}
                {canApproveInvoice && (
                  <Button variant="primary" onClick={() => setConfirmOpen(true)}>
                    Approve
                  </Button>
                )}
              </div>
            )}

            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Approval History</h4>
            {decidedApprovers.length === 0 ? (
              <p className="text-sm italic text-gray-500">No approval decisions recorded yet.</p>
            ) : (
              <ol className="space-y-2 border-l border-gray-200 pl-4">
                {decidedApprovers.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#0A0082]" />
                    <p className="text-sm font-medium text-gray-900">
                      Level {entry.level_number} — {entry.status} by <ApproverLabel userUuid={entry.user_uuid} />
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(entry.decided_at)}</p>
                    {entry.comments && <p className="mt-0.5 text-xs text-gray-600">{entry.comments}</p>}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </PageCardContent>

      <Modal
        isOpen={sendConfirmOpen}
        onClose={() => setSendConfirmOpen(false)}
        title="Send for Approval"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSendConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSend} loading={sendForApproval.isPending}>
              Send for Approval
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700">
          Send invoice <span className="font-semibold">{invoice.invoiceNumber}</span> for approval? The applicable
          approval policy and its approvers will be resolved automatically.
        </p>
      </Modal>

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

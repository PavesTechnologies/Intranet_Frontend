import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Keyboard, Pencil, Plus, Sparkles, Trash2, XCircle, MessageSquareWarning } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import Button from "@/components/Button/Button";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import Modal from "@/components/Modal/modal";
import ApprovalStatusPill from "@/pages/expense-management/approval-engine/components/ApprovalStatusPill";
import FormSelect from "@/components/forms/FormSelect";
import { fileInputClass } from "@/pages/expense-management/components/common/fileInputClass";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import {
  PAYMENT_METHOD_OPTIONS,
  SUPP_STATUS,
  SUPP_STATUS_LABEL,
  errorMessage,
  financeClaimService,
  managerClaimService,
  supplementaryClaimService,
  supplementaryReceiptService,
  unwrap,
} from "@/pages/expense-management/api/supplementaryClaimApi";
import { MIN_COMMENT_LENGTH, claimActions } from "@/pages/expense-management/pages/supplementary/supplementaryClaimActions";
import ReceiptFirstExpense from "@/pages/expense-management/pages/supplementary/ReceiptFirstExpense";
import ClaimExpenseDrawer from "@/pages/expense-management/pages/supplementary/ClaimExpenseDrawer";

// Maps a claim status to the status pill the rest of Expense Management uses (the label is the claim's own wording).
const PILL_STATUS = {
  DRAFT: "DRAFT",
  PENDING_MANAGER: "PENDING_APPROVAL",
  PENDING_FINANCE: "PENDING_FINANCE_VERIFICATION",
  CLARIFICATION_REQUIRED: "AWAITING_CORRECTION",
  MANAGER_REJECTED: "REJECTED",
  FINANCE_REJECTED: "REJECTED",
  APPROVED: "APPROVED",
  PAYMENT_PENDING: "APPROVED",
  SETTLED: "APPROVED",
  CANCELLED: "CANCELLED",
};

const REASON_LABEL = {
  RECEIPT_RECEIVED_LATE: "Receipt received late",
  FORGOT_TO_SUBMIT: "Forgot to submit it in the report",
  NOT_AVAILABLE_IN_REPORT: "Expense was not in the report",
  OTHER: "Other",
};

const EMPTY_ITEM = { expenseDate: "", categoryId: "", merchantName: "", description: "", amount: "", employeePaymentMethod: "", notes: "" };

const formatMoney = (amount, currency) => {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "INR" }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`.trim();
  }
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "—");

/**
 * One supplementary claim. The layout is two columns on wide screens: the expenses and how to add one on the left, and
 * the actions, review and history on the right. The mode decides which actions show; the backend checks each one.
 */
export default function SupplementaryClaimDetailPage({ mode = "employee" }) {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState([]);
  const [releasable, setReleasable] = useState([]);
  const [addMode, setAddMode] = useState(null); // null | "manual" | "auto"
  const [addOpen, setAddOpen] = useState(false);
  const openAdd = () => {
    setAddMode(null);
    setAddOpen(true);
  };
  const closeAdd = () => {
    setAddMode(null);
    setAddOpen(false);
  };
  const [item, setItem] = useState(EMPTY_ITEM);
  const [itemError, setItemError] = useState("");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  // The edited expense is tracked by id and read from the claim, so the drawer always shows the latest receipts.
  const [editingId, setEditingId] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  const listPath = {
    employee: "/expense-management/expenses/supplementary",
    manager: "/expense-management/manager/supplementary-claims",
    finance: "/expense-management/finance/supplementary-claims",
  }[mode];

  const actions = useMemo(() => claimActions(claim, mode), [claim, mode]);

  const loadClaim = useCallback(async () => {
    try {
      const res = await supplementaryClaimService.get(claimId);
      setClaim(unwrap(res));
      setLoadError("");
    } catch (err) {
      setLoadError(errorMessage(err, "Could not load this supplementary claim."));
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadClaim();
  }, [loadClaim]);

  useEffect(() => {
    if (!actions.canEditItems) return;
    lookupService
      .getActiveCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
    supplementaryReceiptService
      .releasable()
      .then((res) => setReleasable(unwrap(res) || []))
      .catch(() => setReleasable([]));
  }, [actions.canEditItems]);

  const categoryName = (id) => categories.find((c) => c.categoryId === id)?.categoryName || "Category";

  const runAction = async (fn, successMessage) => {
    setBusy(true);
    try {
      const res = await fn();
      setClaim(unwrap(res));
      showStatusToast(successMessage, "success");
      return true;
    } catch (err) {
      showStatusToast(errorMessage(err), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    setItemError("");
    if (!item.expenseDate) return setItemError("Enter the date of the expense.");
    if (!item.categoryId) return setItemError("Choose a category.");
    const amount = Number(item.amount);
    if (!(amount > 0)) return setItemError("Enter an amount greater than zero.");
    const payload = {
      expenseDate: item.expenseDate,
      categoryId: item.categoryId,
      merchantName: item.merchantName || null,
      description: item.description || null,
      amount,
      employeePaymentMethod: item.employeePaymentMethod || null,
      notes: item.notes || null,
    };
    const ok = await runAction(() => supplementaryClaimService.addItem(claimId, payload), "Expense added.");
    if (ok) {
      setItem(EMPTY_ITEM);
      closeAdd();
    }
  };

  // Same confirmation as a report line item. The backend allows changes only while the claim is Draft or needs clarification.
  const confirmDelete = async () => {
    if (!deletingItem) return;
    const ok = await runAction(() => supplementaryClaimService.removeItem(claimId, deletingItem.claimItemId), "Expense deleted.");
    if (ok) setDeletingItem(null);
  };

  const review = async (decision, fn, successMessage) => {
    setCommentError("");
    if (decision !== "approve" && comment.trim().length < MIN_COMMENT_LENGTH) {
      return setCommentError(`Give a reason (at least ${MIN_COMMENT_LENGTH} characters).`);
    }
    const ok = await runAction(fn, successMessage);
    if (ok) setComment("");
  };

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Loading supplementary claim…</p>;
  }
  if (loadError || !claim) {
    return (
      <div className="w-full space-y-4">
        <BackButton onClick={() => navigate(listPath)} />
        <p className="text-sm text-red-600" role="alert">{loadError || "Claim not found."}</p>
      </div>
    );
  }

  const isReviewer = actions.canManagerReview || actions.canFinanceReview;
  const hasSideActions = actions.canAcknowledge || actions.canSubmit || actions.canResubmit || actions.canCancel;
  const editingItem = editingId ? claim.items.find((i) => i.claimItemId === editingId) || null : null;
  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Supplementary Claims", to: listPath },
    { label: claim.claimNumber },
  ];

  const withReceipt = claim.items.filter((i) => (i.receipts || []).length > 0).length;
  const addTitle = addMode === "manual" ? "Enter the expense" : addMode === "auto" ? "Add from a receipt" : "Add an expense";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton onClick={() => navigate(listPath)} />
        <Breadcrumb items={breadcrumbs} />
      </div>

      {editingItem && (
        <ClaimExpenseDrawer
          claimId={claimId}
          claimNumber={claim.claimNumber}
          item={editingItem}
          editable={actions.canEditItems}
          categories={categories}
          periodStart={claim.reportTripStart}
          periodEnd={claim.reportTripEnd}
          onChanged={(res) => setClaim(unwrap(res))}
          onClose={() => setEditingId(null)}
        />
      )}

      <ConfirmationModal
        isOpen={!!deletingItem}
        title="Delete Expense"
        message={`Are you sure you want to delete the expense "${deletingItem?.merchantName || "Expense"}"? This action cannot be undone.`}
        confirmText="Delete Expense"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingItem(null)}
        isLoading={busy}
        variant="danger"
      />

      {/* Header: the claim, its status and total, then the details that matter. */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[#0a174e]">Supplementary claim</h1>
              <ApprovalStatusPill status={PILL_STATUS[claim.status] || "DRAFT"} label={SUPP_STATUS_LABEL[claim.status] || claim.status} />
            </div>
            <p className="mt-1 font-mono text-xs text-gray-400">{claim.claimNumber}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Claim total</p>
            <p className="text-2xl font-bold text-[#0a174e]">{formatMoney(claim.totalAmount, claim.currencyCode)}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-4 text-sm md:grid-cols-4">
          <Detail label="Report" value={claim.reportNumber} mono />
          <Detail label="Employee" value={claim.employeeId} />
          <Detail label="Reason" value={claim.lateReasonText || REASON_LABEL[claim.lateReasonCode] || "—"} />
          <Detail
            label="Trip / event period"
            value={`${claim.reportTripStart ? formatDate(claim.reportTripStart) : "—"} to ${claim.reportTripEnd ? formatDate(claim.reportTripEnd) : "—"}`}
          />
          {claim.createdOnBehalf && (
            <Detail
              label="Created by Finance"
              value={claim.employeeConfirmedAt ? `Acknowledged ${formatDateTime(claim.employeeConfirmedAt)}` : "Waiting for acknowledgment"}
            />
          )}
          <Detail label="Submitted" value={formatDateTime(claim.submittedAt)} />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* Left: the expenses. Adding one opens a dialog, as on the expense report. */}
        <div className="lg:col-span-2">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Expenses</h2>
                <p className="text-xs text-gray-500">{claim.items.length} item{claim.items.length === 1 ? "" : "s"}</p>
              </div>
              {actions.canEditItems && (
                <Button variant="primary" size="small" onClick={openAdd} disabled={busy}>
                  <Plus size={14} aria-hidden="true" /> Add expense
                </Button>
              )}
            </header>
            {claim.items.length === 0 ? (
              <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center">
                <p className="text-sm font-medium text-gray-700">No expenses yet</p>
                <p className="text-xs text-gray-500">
                  {actions.canEditItems ? "Add each missed expense with its receipt." : "This claim has no expenses."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-sm">
                <table className="w-full table-auto border-collapse text-sm">
                  <thead className="bg-gradient-to-r from-blue-900 to-indigo-900 text-left text-xs text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Merchant</th>
                      <th className="px-4 py-3 font-semibold">Receipt</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="w-24 px-2 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {claim.items.map((it) => (
                      <ExpenseRow
                        key={it.claimItemId}
                        claimId={claimId}
                        item={it}
                        categoryName={categoryName(it.categoryId)}
                        editable={actions.canEditItems}
                        busy={busy}
                        releasable={releasable}
                        setBusy={setBusy}
                        onClaimChanged={(res) => setClaim(unwrap(res))}
                        onEdit={() => setEditingId(it.claimItemId)}
                        onDelete={() => setDeletingItem(it)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right: the totals, what can be done now, the review for the approver, and the history. */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Summary</h2>
            <dl className="space-y-2 text-sm">
              <SummaryRow label="Expenses" value={claim.items.length} />
              <SummaryRow label="With a receipt" value={`${withReceipt} of ${claim.items.length}`} />
              <SummaryRow label="Claim total" value={formatMoney(claim.totalAmount, claim.currencyCode)} strong />
            </dl>
          </section>

          {hasSideActions && (
            <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-gray-900">Next step</h2>
              {actions.canAcknowledge && (
                <Button variant="primary" size="small" className="w-full" disabled={busy}
                  onClick={() => runAction(() => supplementaryClaimService.acknowledge(claimId), "Acknowledged. This does not approve the claim.")}>
                  Acknowledge
                </Button>
              )}
              {actions.canSubmit && (
                <Button variant="primary" size="small" className="w-full" disabled={busy}
                  onClick={() => runAction(() => supplementaryClaimService.submit(claimId), "Submitted to your manager.")}>
                  Submit claim
                </Button>
              )}
              {actions.canResubmit && (
                <Button variant="primary" size="small" className="w-full" disabled={busy}
                  onClick={() => runAction(() => supplementaryClaimService.resubmit(claimId), "Resubmitted.")}>
                  Resubmit
                </Button>
              )}
              {actions.canCancel && (
                <Button variant="outline" size="small" className="w-full" disabled={busy}
                  onClick={() => runAction(() => supplementaryClaimService.cancel(claimId), "Claim cancelled.")}>
                  Cancel claim
                </Button>
              )}
              {actions.canEditItems && claim.items.length === 0 && (
                <p className="text-xs text-gray-500">Add at least one expense, with a receipt, before submitting.</p>
              )}
            </section>
          )}

          {isReviewer && (
            <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-gray-900">{mode === "manager" ? "Manager review" : "Finance review"}</h2>
              <p className="text-xs text-gray-500">Approve to pass the claim on. A reason is required to reject or ask for clarification.</p>
              <textarea
                rows={3}
                maxLength={2000}
                aria-label="Reason"
                placeholder="Reason (for reject or clarify)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              {commentError && <p className="text-xs text-red-600" role="alert">{commentError}</p>}
              <div className="grid grid-cols-1 gap-2">
                <Button variant="success" size="small" disabled={busy}
                  onClick={() => review("approve", () => (mode === "manager" ? managerClaimService.approve(claimId) : financeClaimService.approve(claimId)), "Approved.")}>
                  <CheckCircle2 size={14} aria-hidden="true" /> Approve
                </Button>
                <Button variant="outline" size="small" disabled={busy}
                  onClick={() => review("clarify", () => (mode === "manager" ? managerClaimService.clarify(claimId, comment.trim()) : financeClaimService.clarify(claimId, comment.trim())), "Clarification requested.")}>
                  <MessageSquareWarning size={14} aria-hidden="true" /> Ask for clarification
                </Button>
                <Button variant="danger" size="small" disabled={busy}
                  onClick={() => review("reject", () => (mode === "manager" ? managerClaimService.reject(claimId, comment.trim()) : financeClaimService.reject(claimId, comment.trim())), "Rejected.")}>
                  <XCircle size={14} aria-hidden="true" /> Reject
                </Button>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">History</h2>
            {claim.history.length === 0 ? (
              <p className="text-xs text-gray-500">No activity yet.</p>
            ) : (
              <ol className="max-h-72 space-y-3 overflow-y-auto pr-1 text-xs">
                {claim.history.map((h, idx) => (
                  <li key={`${h.createdAt}-${idx}`} className="border-l-2 border-gray-200 pl-3">
                    <p className="font-medium capitalize text-gray-800">{h.action.replaceAll("_", " ").toLowerCase()}</p>
                    <p className="text-gray-500">{h.actorRole || "user"} · {formatDateTime(h.createdAt)}</p>
                    {h.comment && <p className="mt-0.5 text-gray-700">{h.comment}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Add an expense: choose a way, then fill it in, in one dialog. */}
      <Modal
        isOpen={addOpen}
        onClose={closeAdd}
        title={addTitle}
        subtitle={claim.claimNumber}
        size={addMode === "auto" ? "2xl" : "lg"}
      >
        {addMode === null && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AddModeCard
              title="Manual Entry"
              icon={Keyboard}
              text="Type the merchant, amount, category and date yourself."
              action="Start typing"
              onClick={() => setAddMode("manual")}
            />
            <AddModeCard
              title="Automatic (AI Scan)"
              icon={Sparkles}
              badge="AUTOMATIC"
              text="Upload a receipt. Its date, amount and merchant are read for you."
              action="Scan receipt"
              onClick={() => setAddMode("auto")}
            />
          </div>
        )}

        {addMode === "auto" && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <BackButton onClick={() => setAddMode(null)} />
            </div>
            <ReceiptFirstExpense
              claimId={claimId}
              periodStart={claim.reportTripStart}
              periodEnd={claim.reportTripEnd}
              categories={categories}
              onClaimChanged={(res) => {
                setClaim(unwrap(res));
                closeAdd();
              }}
            />
          </div>
        )}

        {addMode === "manual" && (
          <form onSubmit={addItem} className="space-y-4" noValidate>
            <div className="flex items-center justify-end">
              <BackButton onClick={() => setAddMode(null)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Date of expense</span>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={item.expenseDate}
                  min={claim.reportTripStart || undefined}
                  max={claim.reportTripEnd || undefined}
                  onChange={(e) => setItem({ ...item, expenseDate: e.target.value })}
                />
              </label>
              <FormSelect
                label="Category"
                name="categoryId"
                value={item.categoryId}
                onChange={(e) => setItem({ ...item, categoryId: e.target.value })}
                options={categories.map((c) => ({ value: c.categoryId, label: c.categoryName }))}
                placeholder="Select category"
              />
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Amount</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={item.amount}
                  onChange={(e) => setItem({ ...item, amount: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Merchant</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={item.merchantName}
                  maxLength={255}
                  onChange={(e) => setItem({ ...item, merchantName: e.target.value })}
                />
              </label>
              <FormSelect
                label="How was it paid?"
                name="employeePaymentMethod"
                value={item.employeePaymentMethod}
                onChange={(e) => setItem({ ...item, employeePaymentMethod: e.target.value })}
                options={PAYMENT_METHOD_OPTIONS}
                placeholder="Select"
              />
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Description</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={item.description}
                  maxLength={500}
                  onChange={(e) => setItem({ ...item, description: e.target.value })}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">
              The expense date must fall within the trip period. Every expense needs a receipt before the claim is submitted.
            </p>
            {itemError && <p className="text-sm text-red-600" role="alert">{itemError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="small" type="button" onClick={closeAdd} disabled={busy}>Cancel</Button>
              <Button variant="primary" size="small" type="submit" disabled={busy}>
                <Plus size={14} aria-hidden="true" /> Add expense
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

/** One expense row, with its receipts shown inline and the Fill-from-receipt action for rows that have one. */
function ExpenseRow({ claimId, item, categoryName, editable, busy, releasable, setBusy, onClaimChanged, onEdit, onDelete }) {
  const [file, setFile] = useState(null);
  const [pick, setPick] = useState("");
  const receipts = Array.isArray(item.receipts) ? item.receipts : [];

  const run = async (fn, successMessage) => {
    setBusy(true);
    try {
      const res = await fn();
      onClaimChanged(res);
      showStatusToast(successMessage, "success");
      return true;
    } catch (err) {
      showStatusToast(errorMessage(err), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    if (!file) return;
    const ok = await run(() => supplementaryReceiptService.upload(claimId, item.claimItemId, file), "Receipt uploaded.");
    if (ok) setFile(null);
  };

  const attach = async () => {
    if (!pick) return;
    const ok = await run(() => supplementaryReceiptService.attach(claimId, item.claimItemId, pick), "Receipt attached.");
    if (ok) setPick("");
  };

  return (
    <>
      <tr className="align-top">
        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(item.expenseDate)}</td>
        <td className="px-4 py-3 text-gray-700">{categoryName}</td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900">{item.merchantName || "—"}</div>
          {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
        </td>
        <td className="px-4 py-3">
          {receipts.length === 0 ? (
            <span className="text-xs font-medium text-red-600">Missing</span>
          ) : (
            <span className="text-xs text-gray-700">{receipts.length} attached</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(item.amount, item.currencyCode)}</td>
        <td className="px-2 py-3 text-center">
          {editable && (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={onEdit}
                disabled={busy}
                aria-label="Edit expense"
                title="Edit expense"
                className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                aria-label="Delete expense"
                title="Delete expense"
                className="flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </td>
      </tr>
      {(receipts.length > 0 || editable) && (
        <tr>
          <td colSpan={6} className="bg-gray-50/60 px-4 py-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {receipts.map((r) => (
                <span key={r.receiptId} className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-gray-700 shadow-sm">
                  <span className="max-w-[14rem] truncate">{r.originalFileName}</span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => run(() => supplementaryReceiptService.detach(claimId, item.claimItemId, r.receiptId), "Receipt removed.")}
                      disabled={busy}
                      aria-label={`Remove receipt ${r.originalFileName}`}
                      title="Remove receipt"
                      className="rounded p-0.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={11} aria-hidden="true" />
                    </button>
                  )}
                </span>
              ))}
              {editable && (
                <>
                  <input type="file" className={`${fileInputClass} max-w-[16rem]`} aria-label="Choose receipt file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <Button variant="outline" size="small" type="button" disabled={!file || busy} onClick={upload}>Upload</Button>
                  {releasable.length > 0 && (
                    <>
                      <select className="rounded-md border border-gray-300 px-2 py-1" aria-label="Released receipt to attach" value={pick} onChange={(e) => setPick(e.target.value)}>
                        <option value="">Attach a released receipt…</option>
                        {releasable.map((r) => (
                          <option key={r.receiptId} value={r.receiptId}>{r.originalFileName}</option>
                        ))}
                      </select>
                      <Button variant="outline" size="small" type="button" disabled={!pick || busy} onClick={attach}>Attach</Button>
                    </>
                  )}
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className={strong ? "text-base font-bold text-[#0a174e]" : "font-medium text-gray-900"}>{value}</dd>
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className={`truncate text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

/** One of the two ways to add an expense, styled like the Add Line Item choice on the expense screen. */
function AddModeCard({ title, icon: Icon, text, action, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-center transition-all duration-300 hover:border-indigo-600 hover:shadow-lg"
    >
      {badge && <span className="absolute right-0 top-0 rounded-bl-lg bg-indigo-600 px-2 py-0.5 text-[9px] font-bold text-white">{badge}</span>}
      <span className="mb-3 rounded-full bg-indigo-50 p-4 text-indigo-700 transition-colors group-hover:bg-indigo-100">
        <Icon size={26} />
      </span>
      <span className="text-base font-bold text-gray-900 group-hover:text-indigo-700">{title}</span>
      <span className="mt-2 text-xs leading-relaxed text-gray-400">{text}</span>
      <span className="mt-4 text-xs font-semibold text-indigo-700">{action} &rarr;</span>
    </button>
  );
}

/** The same Back control the expense report screen uses. */
function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
    >
      &larr; Back
    </button>
  );
}

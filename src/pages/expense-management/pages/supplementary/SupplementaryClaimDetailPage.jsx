import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronUp, History, Keyboard, Paperclip, Pencil, Plus, Receipt, Search, Sparkles, Trash2, XCircle, MessageSquareWarning } from "lucide-react";
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
import ClaimHeroCard, { ClaimMoneySummary } from "@/pages/expense-management/pages/supplementary/ClaimHeroCard";
import { employeeActionStates } from "@/pages/expense-management/pages/supplementary/supplementaryClaimList";

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
  const [receiptRead, setReceiptRead] = useState(false); // a receipt is being read or shown beside the form
  const openAdd = () => {
    setAddMode(null);
    setAddOpen(true);
  };
  const closeAdd = () => {
    setAddMode(null);
    setReceiptRead(false);
    setAddOpen(false);
  };
  const [item, setItem] = useState(EMPTY_ITEM);
  const [itemError, setItemError] = useState("");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  // The edited expense is tracked by id and read from the claim, so the drawer always shows the latest receipts.
  const [editingId, setEditingId] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  // Search and sort over the claim's expenses, as on the expense report.
  const [itemSearch, setItemSearch] = useState("");
  const [itemSort, setItemSort] = useState("date-desc");
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const editingItem = editingId ? claim.items.find((i) => i.claimItemId === editingId) || null : null;
  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Supplementary Claims", to: listPath },
    { label: claim.claimNumber },
  ];

  const workflow = employeeActionStates(claim);
  const query = itemSearch.trim().toLowerCase();
  const visibleItems = claim.items
    .filter((it) => !query || `${it.merchantName || ""} ${categoryName(it.categoryId)} ${it.description || ""}`.toLowerCase().includes(query))
    .sort((a, b) => {
      switch (itemSort) {
        case "date-asc": return String(a.expenseDate).localeCompare(String(b.expenseDate));
        case "amount-desc": return Number(b.amount) - Number(a.amount);
        case "amount-asc": return Number(a.amount) - Number(b.amount);
        case "merchant": return String(a.merchantName || "").localeCompare(String(b.merchantName || ""));
        default: return String(b.expenseDate).localeCompare(String(a.expenseDate));
      }
    });
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

      {/* The claim at the top, laid out like an expense report: status, total, actions, facts and the five steps. */}
      <ClaimHeroCard
        claim={claim}
        statusPill={<ApprovalStatusPill status={PILL_STATUS[claim.status] || "DRAFT"} label={SUPP_STATUS_LABEL[claim.status] || claim.status} />}
        actions={mode === "employee" ? (
          <ClaimActions
            claim={claim}
            workflow={workflow}
            busy={busy}
            onAcknowledge={() => runAction(() => supplementaryClaimService.acknowledge(claimId), "Acknowledged. This does not approve the claim.")}
            onSubmit={() => runAction(() => supplementaryClaimService.submit(claimId), "Submitted to your manager.")}
            onResubmit={() => runAction(() => supplementaryClaimService.resubmit(claimId), "Resubmitted.")}
            onCancel={() => runAction(() => supplementaryClaimService.cancel(claimId), "Claim cancelled.")}
          />
        ) : null}
        notice={claim.createdOnBehalf ? (
          <p className="mt-2 text-xs text-slate-500">
            Created by Finance on your behalf ·{" "}
            {claim.employeeConfirmedAt ? `acknowledged ${formatDateTime(claim.employeeConfirmedAt)}` : "waiting for your acknowledgment"}
          </p>
        ) : null}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* Left: the expenses. Adding one opens a dialog, as on the expense report. */}
        <div className="lg:col-span-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)] sm:p-5" data-claim-expenses>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A0082]/10 text-[#0A0082]">
                  <Receipt size={18} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0a174e]">
                    Expenses <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{claim.items.length}</span>
                  </h2>
                  <p className="text-xs text-slate-500">Each missed expense on this claim, with its receipt and amount in {claim.currencyCode || "INR"}.</p>
                </div>
              </div>
              {actions.canEditItems && (
                <Button variant="primary" size="small" onClick={openAdd} disabled={busy}>
                  <Plus size={14} aria-hidden="true" /> Add Line Item
                </Button>
              )}
            </div>
            {claim.items.length > 0 && (
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="relative sm:col-span-2">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search by merchant, category, description..."
                    aria-label="Search expenses"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15"
                  />
                </label>
                <FormSelect
                  name="itemSort"
                  value={itemSort}
                  onChange={(e) => setItemSort(e.target.value)}
                  options={[
                    { value: "date-desc", label: "Date (Newest first)" },
                    { value: "date-asc", label: "Date (Oldest first)" },
                    { value: "amount-desc", label: "Amount (High to Low)" },
                    { value: "amount-asc", label: "Amount (Low to High)" },
                    { value: "merchant", label: "Merchant (A-Z)" },
                  ]}
                />
              </div>
            )}
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
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-sm text-white">
                      <th className="px-3 py-3 text-left font-semibold">Expense</th>
                      <th className="px-2 py-3 text-center font-semibold">Date</th>
                      <th className="px-2 py-3 text-center font-semibold">Receipt</th>
                      <th className="px-2 py-3 text-center font-semibold">Amount ({claim.currencyCode || "INR"})</th>
                      <th className="px-2 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleItems.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No expenses match "{itemSearch}".</td></tr>
                    )}
                    {visibleItems.map((it) => (
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
          <ClaimMoneySummary claim={claim} withReceipt={withReceipt} statusLabel={SUPP_STATUS_LABEL[claim.status] || claim.status} />

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

          <div className="rounded-xl border border-gray-200 bg-white" data-claim-history>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-expanded={historyOpen}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-800"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" aria-hidden="true" /> Claim history
              </span>
              {historyOpen ? <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />}
            </button>
            {historyOpen && (
              <div className="border-t border-gray-100 px-4 py-3">
                {claim.history.length === 0 ? (
                  <p className="text-xs text-gray-400">Nothing has happened to this claim yet.</p>
                ) : (
                  <ol className="space-y-2.5">
                    {claim.history.map((h, idx) => (
                      <li key={`${h.createdAt}-${idx}`} className="flex gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                        <div className="min-w-0 text-xs">
                          <p className="font-medium capitalize text-gray-800">{h.action.replaceAll("_", " ").toLowerCase()}</p>
                          <p className="text-gray-500">{formatDateTime(h.createdAt)} · {h.actorRole || "user"}</p>
                          {h.comment && <p className="mt-0.5 text-gray-700">{h.comment}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add an expense: choose a way, then fill it in, in one dialog. */}
      <Modal
        isOpen={addOpen}
        onClose={closeAdd}
        title={addTitle}
        subtitle={claim.claimNumber}
        // The receipt scan starts as a compact upload box, then takes the whole screen so the full receipt sits beside
        // every field.
        size={addMode === "auto" ? (receiptRead ? "full" : "2xl") : addMode === null ? "4xl" : "lg"}
        className={addMode === "auto" && receiptRead ? "!fixed !inset-0 !max-w-none !rounded-none !border-0" : ""}
        maxHeight={addMode === "auto" ? (receiptRead ? "max-h-screen" : "max-h-[90vh]") : undefined}
      >
        {addMode === null && (
          <div className="grid grid-cols-1 gap-6 p-2 md:grid-cols-2">
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
              <BackButton onClick={() => { setAddMode(null); setReceiptRead(false); }} />
            </div>
            <ReceiptFirstExpense
              claimId={claimId}
              periodStart={claim.reportTripStart}
              periodEnd={claim.reportTripEnd}
              categories={categories}
              currencyCode={claim.currencyCode}
              onPhaseChange={(p) => setReceiptRead(p !== "idle")}
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
      <tr className="align-middle transition hover:bg-slate-50/60" data-claim-item={item.claimItemId}>
        <td className="px-3 py-3">
          <div className="text-base font-semibold uppercase tracking-tight text-gray-900">{item.merchantName || "Merchant not given"}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">{categoryName}</span>
            {item.employeePaymentMethod && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {PAYMENT_METHOD_OPTIONS.find((o) => o.value === item.employeePaymentMethod)?.label || item.employeePaymentMethod}
              </span>
            )}
          </div>
          {item.description && <div className="mt-1 text-xs text-gray-500">{item.description}</div>}
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-center text-gray-700">{formatDate(item.expenseDate)}</td>
        <td className="px-2 py-3 text-center">
          {receipts.length === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">Receipt missing</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <Paperclip size={11} aria-hidden="true" /> {receipts.length} attached
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-center">
          <span className="text-base font-bold tabular-nums text-[#0a174e]">{formatMoney(item.amount, item.currencyCode)}</span>
        </td>
        <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={onEdit}
                disabled={busy || !editable}
                aria-label="Edit expense"
                title="Edit expense"
                className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy || !editable}
                aria-label="Delete expense"
                title="Delete expense"
                className="flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
        </td>
      </tr>
      {(receipts.length > 0 || editable) && (
        <tr>
          <td colSpan={5} className="bg-gray-50/60 px-4 py-2">
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

/** One of the two ways to add an expense, styled like the Add Line Item choice on the expense screen. */
function AddModeCard({ title, icon: Icon, text, action, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[16rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center transition-all duration-300 hover:border-indigo-600 hover:shadow-lg"
    >
      {badge && <span className="absolute right-0 top-0 rounded-bl-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white">{badge}</span>}
      <span className="mb-4 rounded-full bg-indigo-50 p-5 text-indigo-700 transition-colors group-hover:bg-indigo-100">
        <Icon size={34} />
      </span>
      <span className="text-xl font-bold text-gray-900 group-hover:text-indigo-700">{title}</span>
      <span className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">{text}</span>
      <span className="mt-5 text-sm font-semibold text-indigo-700">{action} &rarr;</span>
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

/** One workflow action. It is always shown; when it is not allowed it is disabled and the reason is written under it. */
/** The employee's actions in the claim header, like Submit for Approval / Edit / Delete on an expense report. */
function ClaimActions({ claim, workflow, busy, onAcknowledge, onSubmit, onResubmit, onCancel }) {
  const isDraft = claim.status === SUPP_STATUS.DRAFT;
  const needsChanges = claim.status === SUPP_STATUS.CLARIFICATION_REQUIRED;
  const primary = needsChanges ? { label: "Resubmit", state: workflow.resubmit, run: onResubmit }
    : isDraft ? { label: "Submit for Approval", state: workflow.submit, run: onSubmit } : null;
  if (!primary && !workflow.acknowledge.allowed && !workflow.cancel.allowed) return null;
  return (
    <div className="flex flex-col items-start gap-1.5 lg:items-end" data-claim-actions>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {workflow.acknowledge.allowed && (
          <Button variant="primary" size="small" disabled={busy} onClick={onAcknowledge}>Acknowledge</Button>
        )}
        {primary && (
          <Button
            variant="primary"
            size="small"
            disabled={busy || !primary.state.allowed}
            onClick={primary.state.allowed ? primary.run : undefined}
            title={primary.state.allowed ? "" : primary.state.reason}
          >
            {primary.label}
          </Button>
        )}
        {workflow.cancel.allowed && (
          <Button variant="outline" size="small" disabled={busy} onClick={onCancel}>Cancel claim</Button>
        )}
      </div>
      {primary && !primary.state.allowed && (
        <p className="max-w-xs text-[11px] leading-snug text-slate-500 lg:text-right">{primary.state.reason}</p>
      )}
    </div>
  );
}


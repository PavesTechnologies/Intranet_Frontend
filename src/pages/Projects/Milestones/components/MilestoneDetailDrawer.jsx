import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, History, Info, Lock, Pencil, Trash2, X } from "lucide-react";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { ReadinessBadge, StatusBadge } from "./MilestoneBadges";
import { useMilestoneHistory, useMilestoneMutations } from "../hooks/useMilestones";
import {
  STATUS_ACTION_LABEL,
  firstApiError,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercent,
  isEditable,
  todayIso,
} from "../utils/milestoneUtils";

const Detail = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-0.5 text-sm text-slate-800 [overflow-wrap:anywhere]">{children}</dd>
  </div>
);

const actionBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const HISTORY_FIELD_LABEL = {
  execution_status: "Status",
  allocation_percentage: "Allocation",
  billing_readiness: "Billing readiness",
  planned_due_date: "Planned due",
  planned_start_date: "Planned start",
  actual_completion_date: "Completed on",
  billable: "Billable",
  name: "Name",
  epic_id: "Epic",
};

const HistoryList = ({ milestoneId }) => {
  const { data = [], isLoading, isError, refetch } = useMilestoneHistory(milestoneId, true);
  if (isLoading) return <p className="text-sm text-slate-500">Loading history…</p>;
  if (isError)
    return (
      <p className="text-sm text-slate-600">
        Couldn't load history.{" "}
        <button type="button" onClick={() => refetch()} className="font-medium text-indigo-600 hover:underline">
          Retry
        </button>
      </p>
    );
  const entries = data.filter((h) => !["version", "updated_at", "updated_by"].includes(h.field));
  if (entries.length === 0) return <p className="text-sm text-slate-500">No changes recorded yet.</p>;
  return (
    <ol className="space-y-3">
      {entries.map((h, i) => (
        <li key={`${h.timestamp}-${h.field}-${i}`} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-slate-800">
              {h.operation === "CREATE" ? (
                "Milestone created"
              ) : (
                <>
                  <span className="font-medium">{HISTORY_FIELD_LABEL[h.field] ?? h.field ?? h.action}</span>
                  {h.field && (
                    <>
                      {": "}
                      <span className="text-slate-500 line-through">{h.oldValue ?? "—"}</span>
                      {" → "}
                      <span>{h.newValue ?? "—"}</span>
                    </>
                  )}
                </>
              )}
            </p>
            <p className="text-xs text-slate-500">{formatDateTime(h.timestamp)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
};

const MilestoneDetailDrawer = ({ milestone, projectId, onClose, onEdit }) => {
  const { changeStatus, complete, remove } = useMilestoneMutations(projectId);
  const [confirm, setConfirm] = useState(null); // { kind: 'status'|'complete'|'delete', status? }
  const [completionDate, setCompletionDate] = useState(todayIso());
  const closeRef = useRef(null);
  const openerRef = useRef(null);

  // Move focus into the drawer on open; hand it back to the opener on close.
  useEffect(() => {
    if (milestone) {
      if (!openerRef.current) openerRef.current = document.activeElement;
      closeRef.current?.focus();
    } else if (openerRef.current) {
      const opener = openerRef.current;
      openerRef.current = null;
      if (document.contains(opener)) opener.focus?.();
    }
  }, [milestone?.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !confirm) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm, onClose]);

  if (!milestone) return null;
  const m = milestone;
  const busy = changeStatus.isPending || complete.isPending || remove.isPending;

  const run = async (fn, successMessage) => {
    try {
      await fn();
      showStatusToast(successMessage, "success");
      setConfirm(null);
      return true;
    } catch (err) {
      showStatusToast(firstApiError(err), "error");
      return false;
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.kind === "status") {
      await run(
        () => changeStatus.mutateAsync({ milestoneId: m.id, status: confirm.status, version: m.version }),
        "Milestone status updated"
      );
    } else if (confirm.kind === "complete") {
      await run(
        () => complete.mutateAsync({ milestoneId: m.id, actualCompletionDate: completionDate, version: m.version }),
        "Milestone completed"
      );
    } else if (confirm.kind === "delete") {
      const ok = await run(() => remove.mutateAsync({ milestoneId: m.id }), "Milestone deleted");
      if (ok) onClose();
    }
  };

  const confirmCopy = (() => {
    if (!confirm) return {};
    if (confirm.kind === "complete")
      return {
        title: "Complete milestone",
        message: "Record the date delivery was completed. Completed milestones can't be reopened and their billing settings are locked.",
        confirmText: "Mark completed",
        variant: "success",
      };
    if (confirm.kind === "delete")
      return {
        title: "Delete milestone",
        message: `Delete ${m.milestoneCode} “${m.name}”? This can't be undone.`,
        confirmText: "Delete",
        variant: "danger",
      };
    if (confirm.status === "CANCELLED")
      return {
        title: "Cancel milestone",
        message:
          "A cancelled milestone can't be billed or reopened. Its allocation stops counting toward the project total, which frees that share for other milestones.",
        confirmText: "Cancel milestone",
        variant: "danger",
      };
    return {
      title: STATUS_ACTION_LABEL[confirm.status] ?? "Change status",
      message: `Change status of ${m.milestoneCode} to ${confirm.status.replace("_", " ").toLowerCase()}?`,
      confirmText: "Confirm",
      variant: "primary",
    };
  })();

  const statusActions = (m.allowedStatusChanges ?? []).filter((s) => s !== "CANCELLED");
  const canCancel = (m.allowedStatusChanges ?? []).includes("CANCELLED");
  const editable = isEditable(m);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-drawer-title"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{m.milestoneCode}</p>
            <h2 id="milestone-drawer-title" className="text-base font-semibold text-slate-800 [overflow-wrap:anywhere]">
              {m.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge status={m.executionStatus} />
              <ReadinessBadge readiness={m.billingReadiness} />
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close milestone details"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {/* Billing readiness */}
          <section className="px-5 py-4" aria-labelledby="ms-readiness-heading">
            <h3 id="ms-readiness-heading" className="mb-2 text-sm font-semibold text-slate-700">
              Billing readiness
            </h3>
            {m.billingReadiness === "READY_FOR_BILLING" ? (
              <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Eligible for billing. Accounts Receivable picks it up from the synchronised milestone data.
              </p>
            ) : (
              <ul className="space-y-1.5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                {(m.readinessReasons?.length ? m.readinessReasons : ["Not eligible for billing"]).map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Details */}
          <section className="px-5 py-4" aria-label="Milestone details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Detail label="Linked epic">{m.epicName || "—"}</Detail>
              <Detail label="Planned start">{formatDate(m.plannedStartDate)}</Detail>
              <Detail label="Planned due">{formatDate(m.plannedDueDate)}</Detail>
              <Detail label="Completed on">{formatDate(m.actualCompletionDate)}</Detail>
              <Detail label="Billable">{m.billable ? "Yes" : "No"}</Detail>
              <Detail label="Allocation">{m.billable ? formatPercent(m.allocationPercentage) : "—"}</Detail>
              <Detail label="Estimated amount">
                {m.billable ? formatMoney(m.estimatedAmount, m.currency) : "—"}
              </Detail>
            </dl>
            {m.billable && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                The estimate uses the project budget. Accounts Receivable calculates the billed amount from the
                contract value.
              </p>
            )}
            {m.description && (
              <div className="mt-4">
                <Detail label="Description">
                  <span className="whitespace-pre-line">{m.description}</span>
                </Detail>
              </div>
            )}
          </section>

          {/* History */}
          <section className="px-5 py-4" aria-labelledby="ms-history-heading">
            <h3 id="ms-history-heading" className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Recent changes
            </h3>
            <HistoryList milestoneId={m.id} />
          </section>
        </div>

        {/* Actions */}
        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {m.canComplete && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setCompletionDate(todayIso());
                  setConfirm({ kind: "complete" });
                }}
                className={`${actionBtn} bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Mark completed
              </button>
            )}
            {statusActions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => setConfirm({ kind: "status", status: s })}
                className={`${actionBtn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-500`}
              >
                {s === "IN_PROGRESS" && m.executionStatus === "ON_HOLD" ? "Resume" : STATUS_ACTION_LABEL[s] ?? s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onEdit(m)}
              disabled={!editable}
              aria-describedby={!editable ? "ms-readonly-note" : undefined}
              title={!editable ? "Completed milestones can't be changed" : undefined}
              className={`${actionBtn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-500 disabled:hover:bg-white`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>
          </div>
          {!editable && (
            <p id="ms-readonly-note" className="flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              This milestone is completed and can no longer be changed.
            </p>
          )}
          {(canCancel || m.canDelete) && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm({ kind: "status", status: "CANCELLED" })}
                  className={`${actionBtn} text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-500`}
                >
                  Cancel milestone
                </button>
              )}
              {m.canDelete && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm({ kind: "delete" })}
                  className={`${actionBtn} text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-500`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      <ConfirmationModal
        isOpen={!!confirm}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmText={confirmCopy.confirmText}
        cancelText="Go back"
        variant={confirmCopy.variant}
        isLoading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      >
        {confirm?.kind === "complete" && (
          <div>
            <label htmlFor="ms-completion-date" className="mb-1 block text-sm font-medium text-slate-700">
              Completion date
            </label>
            <input
              id="ms-completion-date"
              type="date"
              value={completionDate}
              max={todayIso()}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        )}
      </ConfirmationModal>
    </>
  );
};

export default MilestoneDetailDrawer;

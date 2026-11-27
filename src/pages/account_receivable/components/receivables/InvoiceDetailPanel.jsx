import { useEffect, useRef, useState } from "react";
import { X, Mail, BellRing, ChevronDown, Clock3 } from "lucide-react";

import ReceivableStatusBadge from "../common/ReceivableStatusBadge";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../../utils/format";
import { describeDue } from "../../services/receivableService";
import { getInvoiceDeliveries } from "../../services/invoiceService";
import { getPayments, PAYMENT_METHOD_LABELS } from "../../services/paymentService";
import { getReminders, REMINDER_TYPE_LABELS, REMINDER_CHANNEL_LABELS } from "../../services/collectionsService";
import { isEndpointUnavailable } from "../../utils/apiAvailability";

/**
 * Side panel for one open invoice (Outstanding Receivables). Overview and
 * delivery history are live; Payments and Follow-ups read the post-invoice
 * contract APIs and say so plainly until those are released.
 */

// Loads a list for this receivable; marks "unavailable" when the API is not released.
function useReceivableList(load, deps) {
  const [state, setState] = useState({ rows: [], loading: true, unavailable: false });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    load()
      .then((rows) => !cancelled && setState({ rows: rows || [], loading: false, unavailable: false }))
      .catch((err) => {
        if (cancelled) return;
        if (!isEndpointUnavailable(err)) console.error("[InvoiceDetailPanel] Load failed:", err);
        setState({ rows: [], loading: false, unavailable: isEndpointUnavailable(err) });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function Pending({ what }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-xs text-slate-500">
      <Clock3 className="h-4 w-4 shrink-0 text-slate-400" />
      {what} will appear here once the backend releases this API.
    </div>
  );
}

function Field({ label, children, valueClass = "text-slate-900" }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`min-w-0 truncate font-medium ${valueClass}`}>{children}</dd>
    </div>
  );
}

function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        More <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {items.filter((i) => !i.hidden).map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="block w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvoiceDetailPanel({ receivable: r, onClose, actions }) {
  const [tab, setTab] = useState("overview");
  useEffect(() => setTab("overview"), [r.receivableId]);

  const history = useReceivableList(() => getInvoiceDeliveries(r.invoiceId), [r.invoiceId]);
  const payments = useReceivableList(
    () => getPayments({ clientId: r.clientId }).then((rows) => rows.filter((p) => p.allocations.some((a) => a.receivableId === r.receivableId))),
    [r.clientId, r.receivableId]
  );
  const followUps = useReceivableList(() => getReminders({ receivableId: r.receivableId }), [r.receivableId]);

  const money = (v) => formatCurrency(v, r.currencyCode);
  const overdue = r.daysOverdue > 0;
  const count = (list) => (list.loading || list.unavailable ? "" : ` (${list.rows.length})`);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "payments", label: `Payments${count(payments)}` },
    { key: "followups", label: `Follow-ups${count(followUps)}` },
    { key: "history", label: `History${count(history)}` },
  ];

  return (
    <aside className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm" aria-label={`Invoice ${r.invoiceNumber}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-bold text-slate-900">{r.invoiceNumber}</h3>
          <ReceivableStatusBadge receivable={r} />
        </div>
        <button type="button" onClick={onClose} aria-label="Close invoice panel" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-200 px-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors focus:outline-none ${
              tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <dl>
                <Field label="Client">{r.clientName}</Field>
                <Field label="Project">{r.projectName}</Field>
                <Field label="Invoice Date">{r.invoiceDate ? formatDisplayDate(r.invoiceDate) : "—"}</Field>
                <Field label="Due Date">{r.dueDate ? formatDisplayDate(r.dueDate) : "—"}</Field>
                <Field label="Currency">{r.currencyCode}</Field>
              </dl>
              <dl>
                <Field label="Invoice Amount"><span className="tabular-nums">{money(r.invoiceAmount)}</span></Field>
                <Field label="Total Received"><span className="tabular-nums">{money(r.amountReceived)}</span></Field>
                <Field label="Outstanding" valueClass="text-rose-600 font-bold">
                  <span className="tabular-nums">{money(r.outstandingBalance)}</span>
                </Field>
                <Field label="Aging" valueClass={overdue ? "text-rose-600 font-bold" : "text-slate-900"}>
                  {describeDue(r) || (r.daysOutstanding !== null ? `${r.daysOutstanding} days` : "—")}
                </Field>
              </dl>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <button type="button" onClick={actions.recordPayment} className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                Record Payment
              </button>
              <button type="button" onClick={actions.addFollowUp} className="h-9 rounded-lg border border-blue-600 bg-white px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                Add Follow-up
              </button>
              <button type="button" onClick={actions.creditNote} className="h-9 rounded-lg border border-blue-600 bg-white px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                Create Credit Note
              </button>
              <MoreMenu
                items={[
                  { label: "Open Invoice", onClick: actions.openInvoice },
                  { label: "Raise Debit Note", onClick: actions.debitNote },
                  { label: "Open Collection Case", onClick: actions.openCase, hidden: !overdue },
                  { label: "View Customer Ledger", onClick: actions.viewLedger },
                ]}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Recent Follow-ups</h4>
                <button type="button" onClick={actions.viewFollowUps} className="text-xs font-semibold text-blue-600 hover:underline">
                  View All
                </button>
              </div>
              {followUps.loading ? (
                <LoadingSpinner size="sm" text="Loading follow-ups..." />
              ) : followUps.unavailable ? (
                <Pending what="Reminders and follow-ups" />
              ) : followUps.rows.length === 0 ? (
                <p className="text-sm text-slate-500">No follow-ups yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {followUps.rows.slice(0, 3).map((f) => (
                    <li key={f.reminderId} className="flex items-start gap-3 px-3 py-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <BellRing className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {REMINDER_TYPE_LABELS[f.reminderType] || "Reminder"} · {REMINDER_CHANNEL_LABELS[f.channel] || f.channel}
                        </p>
                        <p className="text-xs text-slate-500">
                          {f.triggeredBy === "AUTO" ? "Automatic" : "Manual"} · {formatDisplayDateTime(f.sentAt || f.scheduledAt) || "—"}
                        </p>
                      </div>
                      <StatusBadge label={f.status} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {tab === "payments" &&
          (payments.loading ? (
            <LoadingSpinner size="sm" text="Loading payments..." />
          ) : payments.unavailable ? (
            <Pending what="Payments applied to this invoice" />
          ) : payments.rows.length === 0 ? (
            <p className="text-sm text-slate-500">No payments recorded against this invoice yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {payments.rows.map((p) => {
                const applied = p.allocations.find((a) => a.receivableId === r.receivableId);
                return (
                  <li key={p.paymentId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-indigo-700">{p.paymentNumber}</p>
                      <p className="text-xs text-slate-500">
                        {p.paymentDate ? formatDisplayDate(p.paymentDate) : "—"} · {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-emerald-700">{money(applied?.amount || 0)}</span>
                  </li>
                );
              })}
            </ul>
          ))}

        {tab === "followups" &&
          (followUps.loading ? (
            <LoadingSpinner size="sm" text="Loading follow-ups..." />
          ) : followUps.unavailable ? (
            <Pending what="Reminders and follow-ups" />
          ) : followUps.rows.length === 0 ? (
            <p className="text-sm text-slate-500">No follow-ups yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {followUps.rows.map((f) => (
                <li key={f.reminderId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {REMINDER_TYPE_LABELS[f.reminderType] || "Reminder"} · {REMINDER_CHANNEL_LABELS[f.channel] || f.channel}
                    </p>
                    <p className="text-xs text-slate-500">{formatDisplayDateTime(f.sentAt || f.scheduledAt) || "—"}{f.recipient ? ` · ${f.recipient}` : ""}</p>
                  </div>
                  <StatusBadge label={f.status} size="sm" />
                </li>
              ))}
            </ul>
          ))}

        {tab === "history" &&
          (history.loading ? (
            <LoadingSpinner size="sm" text="Loading delivery history..." />
          ) : history.rows.length === 0 ? (
            <p className="text-sm text-slate-500">No delivery records found.</p>
          ) : (
            <ul className="space-y-2">
              {history.rows.map((d) => {
                const failed = String(d.deliveryStatus).toUpperCase() === "FAILED";
                return (
                  <li key={d.deliveryId} className="flex items-start gap-2.5 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                    <Mail className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${failed ? "text-rose-500" : "text-teal-600"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{d.recipientEmail || "—"}</span>
                        <StatusBadge label={d.deliveryStatus} size="sm" />
                      </div>
                      <p className="mt-0.5 text-slate-500">{formatDisplayDateTime(d.sentAt || d.failedAt || d.createdAt) || "—"}</p>
                      {failed && d.failureReason && <p className="mt-0.5 text-rose-700">{d.failureReason}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ))}
      </div>
    </aside>
  );
}

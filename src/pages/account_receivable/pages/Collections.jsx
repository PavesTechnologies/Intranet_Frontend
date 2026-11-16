import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  BellRing,
  FolderOpen,
  Handshake,
  Siren,
  Coins,
  Eye,
  UserPlus,
  PhoneCall,
  CalendarCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
} from "lucide-react";

import Button from "../../../components/Button/Button";
import SearchInput from "../../../components/filter/Searchbar";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../components/toastfy/toast";
import { useAuth } from "../../../contexts/AuthContext";
import { ConsoleHeader, StatTile, StatTileGrid, RegisterCard, Segmented } from "../components/receivables/ConsoleUI";
import ARTabs from "../components/common/ARTabs";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import DetailsDrawer from "../components/common/DetailsDrawer";
import ARFeaturePending from "../components/common/ARFeaturePending";
import SendReminderModal from "../components/collections/SendReminderModal";
import OpenCaseModal from "../components/collections/OpenCaseModal";
import CaseActionModal from "../components/collections/CaseActionModal";
import useContractList from "../hooks/useContractList";
import useOutstandingReceivables from "../hooks/useOutstandingReceivables";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../utils/format";
import { getArApiErrorMessage } from "../utils/apiAvailability";
import {
  getCollectionCases,
  getCollectionCase,
  getReminders,
  cancelReminder,
  COLLECTION_CASES_ENDPOINT,
  REMINDERS_ENDPOINT,
  CASE_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  ACTIVITY_TYPE_LABELS,
  REMINDER_TYPE_LABELS,
  REMINDER_CHANNEL_LABELS,
} from "../services/collectionsService";

const PAGE_SIZE = 10;
const ALL = "ALL";
const TABS = [
  { key: "cases", label: "Collection Cases", icon: Briefcase },
  { key: "reminders", label: "Reminders", icon: BellRing },
];
const CASE_STATUSES = ["OPEN", "IN_PROGRESS", "PROMISE_TO_PAY", "ESCALATED", "RESOLVED"];

const PRIORITY_TONE = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
  MEDIUM: "bg-sky-50 text-sky-700 ring-sky-200",
  HIGH: "bg-amber-50 text-amber-700 ring-amber-200",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-200",
};

const CASE_HEADERS = ["Case No.", "Client", "Invoices", "Total Overdue", "Priority", "Collector", "Next Follow-up", "Status", "Actions"];
const CASE_COLUMNS = ["caseNumber", "client", "invoices", "overdue", "priority", "collector", "followUp", "status", "actions"];
const REMINDER_HEADERS = ["Invoice No.", "Client", "Reminder", "Channel", "Recipient", "Date", "Triggered By", "Status", "Actions"];
const REMINDER_COLUMNS = ["invoiceNumber", "client", "type", "channel", "recipient", "date", "triggeredBy", "status", "actions"];

const formatTotals = (rows) => {
  const totals = rows.reduce((acc, c) => ({ ...acc, [c.currencyCode]: (acc[c.currencyCode] || 0) + c.totalOverdue }), {});
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  return entries.length ? entries.map(([code, v]) => formatCurrency(v, code)).join(" · ") : "—";
};

function PaginationBar({ page, setPage, total }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total === 0) return null;
  return (
    <Pagination
      currentPage={page}
      totalPages={totalPages}
      onPrevious={() => setPage((p) => Math.max(p - 1, 1))}
      onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
    />
  );
}

export default function Collections() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { receivables } = useOutstandingReceivables();

  const [tab, setTab] = useState(location.state?.tab === "reminders" ? "reminders" : "cases");

  const fetchCases = useCallback(() => getCollectionCases(), []);
  const fetchReminders = useCallback(() => getReminders(), []);
  const cases = useContractList(fetchCases);
  const reminders = useContractList(fetchReminders);

  const [caseStatus, setCaseStatus] = useState(ALL);
  const [caseSearch, setCaseSearch] = useState("");
  const [casePage, setCasePage] = useState(1);
  const [reminderSearch, setReminderSearch] = useState("");
  const [reminderPage, setReminderPage] = useState(1);

  const [openCaseState, setOpenCaseState] = useState(null);
  const [reminderState, setReminderState] = useState(null);
  const [caseAction, setCaseAction] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const [viewCase, setViewCase] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);

  // Hand-offs from the Outstanding Receivables page.
  useEffect(() => {
    const state = location.state;
    if (state?.sendReminderFor) setReminderState({ receivableId: state.sendReminderFor });
    if (state?.openCaseFor) setOpenCaseState(state.openCaseFor);
    if (state?.sendReminderFor || state?.openCaseFor) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setCasePage(1), [caseStatus, caseSearch]);
  useEffect(() => setReminderPage(1), [reminderSearch]);

  // Full case (with activity timeline) for the details drawer.
  useEffect(() => {
    if (!viewCase) return setCaseDetail(null);
    let cancelled = false;
    setCaseDetailLoading(true);
    getCollectionCase(viewCase.caseId)
      .then((c) => !cancelled && setCaseDetail(c))
      .catch((err) => {
        console.error("[Collections] Error loading case:", err);
        if (!cancelled) setCaseDetail(viewCase);
      })
      .finally(() => !cancelled && setCaseDetailLoading(false));
    return () => {
      cancelled = true;
    };
  }, [viewCase]);

  /* ------------------------------- Cases ------------------------------- */

  const caseBase = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    if (!q) return cases.data;
    return cases.data.filter((c) =>
      [c.caseNumber, c.clientName, c.assigneeName, ...c.invoiceNumbers].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [cases.data, caseSearch]);
  const caseCounts = Object.fromEntries([[ALL, caseBase.length], ...CASE_STATUSES.map((s) => [s, caseBase.filter((c) => c.status === s).length])]);
  const caseFiltered = caseStatus === ALL ? caseBase : caseBase.filter((c) => c.status === caseStatus);
  const casePageRows = caseFiltered.slice((casePage - 1) * PAGE_SIZE, casePage * PAGE_SIZE);
  const activeCases = cases.data.filter((c) => c.status !== "RESOLVED");

  const caseKpis = [
    {
      label: "Active Cases",
      value: activeCases.length,
      icon: FolderOpen,
      iconClass: "bg-blue-50 text-blue-700",
      hint: `${activeCases.filter((c) => !c.assigneeName).length} without a collector`,
      onClick: () => setCaseStatus(ALL),
      active: caseStatus === ALL,
    },
    {
      label: "Promise to Pay",
      value: cases.data.filter((c) => c.status === "PROMISE_TO_PAY").length,
      icon: Handshake,
      iconClass: "bg-emerald-50 text-emerald-700",
      hint: "Clients committed to a payment date",
      hintClass: "text-emerald-600",
      onClick: () => setCaseStatus(caseStatus === "PROMISE_TO_PAY" ? ALL : "PROMISE_TO_PAY"),
      active: caseStatus === "PROMISE_TO_PAY",
    },
    {
      label: "Escalated",
      variant: cases.data.some((c) => c.status === "ESCALATED") ? "danger" : "default",
      value: cases.data.filter((c) => c.status === "ESCALATED").length,
      icon: Siren,
      iconClass: "bg-rose-100 text-rose-700",
      hint: "Escalated for further action",
      hintClass: "text-rose-600",
      onClick: () => setCaseStatus(caseStatus === "ESCALATED" ? ALL : "ESCALATED"),
      active: caseStatus === "ESCALATED",
    },
    {
      label: "Under Collection",
      value: formatTotals(activeCases),
      icon: Coins,
      iconClass: "bg-amber-50 text-amber-700",
      hint: "Overdue money in active cases",
      hintClass: "text-amber-700",
    },
  ];

  const caseRows = casePageRows.map((c) => {
    const resolved = c.status === "RESOLVED";
    return {
      onRowClick: () => setViewCase(c),
      caseNumber: <span className="font-mono font-bold text-indigo-700">{c.caseNumber}</span>,
      client: <span className="font-semibold text-slate-800">{c.clientName}</span>,
      invoices: <span className="text-xs text-slate-600">{c.invoiceNumbers.join(", ") || `${c.receivableIds.length} invoice(s)`}</span>,
      overdue: <span className="whitespace-nowrap font-bold tabular-nums">{formatCurrency(c.totalOverdue, c.currencyCode)}</span>,
      priority: (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${PRIORITY_TONE[c.priority] || PRIORITY_TONE.MEDIUM}`}>
          {CASE_PRIORITY_LABELS[c.priority] || c.priority}
        </span>
      ),
      collector: c.assigneeName || <span className="text-slate-400">Unassigned</span>,
      followUp: (
        <span className="whitespace-nowrap">
          {c.status === "PROMISE_TO_PAY" && c.promiseToPay?.promisedDate
            ? `Promised ${formatDisplayDate(c.promiseToPay.promisedDate)}`
            : c.nextFollowUpDate
              ? formatDisplayDate(c.nextFollowUpDate)
              : "—"}
        </span>
      ),
      status: <StatusBadge label={CASE_STATUS_LABELS[c.status] || c.status} size="sm" />,
      actions: (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            items={[
              { label: "View Timeline", icon: <Eye className="h-4 w-4 text-slate-600" />, onClick: () => setViewCase(c) },
              { label: "Log Follow-up", icon: <PhoneCall className="h-4 w-4 text-indigo-600" />, onClick: () => setCaseAction({ action: "activity", c }), hidden: resolved },
              { label: "Promise to Pay", icon: <CalendarCheck className="h-4 w-4 text-emerald-600" />, onClick: () => setCaseAction({ action: "promise", c }), hidden: resolved },
              { label: "Assign Collector", icon: <UserPlus className="h-4 w-4 text-slate-600" />, onClick: () => setCaseAction({ action: "assign", c }), hidden: resolved },
              { label: "Escalate", icon: <AlertOctagon className="h-4 w-4 text-rose-600" />, onClick: () => setCaseAction({ action: "escalate", c }), hidden: resolved || c.status === "ESCALATED", danger: true },
              { label: "Resolve", icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, onClick: () => setCaseAction({ action: "resolve", c }), hidden: resolved },
            ]}
          />
        </div>
      ),
    };
  });

  /* ----------------------------- Reminders ----------------------------- */

  const reminderFiltered = useMemo(() => {
    const q = reminderSearch.trim().toLowerCase();
    if (!q) return reminders.data;
    return reminders.data.filter((r) => [r.invoiceNumber, r.clientName, r.recipient].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [reminders.data, reminderSearch]);
  const reminderPageRows = reminderFiltered.slice((reminderPage - 1) * PAGE_SIZE, reminderPage * PAGE_SIZE);

  const handleCancelReminder = async () => {
    setCancelling(true);
    try {
      await cancelReminder(cancelTarget.reminderId);
      showStatusToast("Scheduled reminder cancelled.", "success");
      setCancelTarget(null);
      reminders.reload();
    } catch (err) {
      showStatusToast(getArApiErrorMessage(err, "Reminder could not be cancelled."), "error");
    } finally {
      setCancelling(false);
    }
  };

  const reminderRows = reminderPageRows.map((r) => ({
    invoiceNumber: <span className="font-mono font-bold text-indigo-700">{r.invoiceNumber}</span>,
    client: <span className="font-semibold text-slate-800">{r.clientName}</span>,
    type: REMINDER_TYPE_LABELS[r.reminderType] || r.reminderType,
    channel: REMINDER_CHANNEL_LABELS[r.channel] || r.channel,
    recipient: <span className="text-xs text-slate-600">{r.recipient || "—"}</span>,
    date: <span className="whitespace-nowrap">{formatDisplayDateTime(r.sentAt || r.scheduledAt) || "—"}</span>,
    triggeredBy: r.triggeredBy === "AUTO" ? "Automatic" : "Manual",
    status: (
      <span title={r.failureReason || undefined}>
        <StatusBadge label={r.status} size="sm" />
      </span>
    ),
    actions: (
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          items={[
            { label: "Send Again", icon: <Send className="h-4 w-4 text-indigo-600" />, onClick: () => setReminderState({ receivableId: r.receivableId }) },
            { label: "Cancel Reminder", icon: <XCircle className="h-4 w-4 text-rose-600" />, onClick: () => setCancelTarget(r), hidden: r.status !== "SCHEDULED", danger: true },
          ]}
        />
      </div>
    ),
  }));

  const detail = caseDetail || viewCase;

  return (
    <div className="space-y-6 pb-12">
      <ConsoleHeader
        title="Reminders & Collections"
        subtitle="Follow up on unpaid invoices — send payment reminders and work overdue accounts through to collection."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setReminderState({ receivableId: null })}>
              <Send className="h-4 w-4" /> Send Reminder
            </Button>
            <Button variant="primary" onClick={() => setOpenCaseState({})}>
              <Plus className="h-4 w-4" /> Open Case
            </Button>
          </div>
        }
      />

      <ARTabs tabs={TABS} activeKey={tab} onChange={setTab} label="Collections sections" />

      {tab === "cases" && (
        <>
          {!cases.unavailable && (
            <StatTileGrid columns={4}>
              {caseKpis.map((kpi) => (
                <StatTile key={kpi.label} {...kpi} value={cases.loading ? "…" : kpi.value} />
              ))}
            </StatTileGrid>
          )}
          <RegisterCard
            title="Collection Cases"
            subtitle="Overdue accounts under active follow-up, with the assigned collector, the next follow-up date and any promise to pay."
            toolbar={
              !cases.unavailable && (
                <div className="min-w-0 flex-1">
                  <SearchInput value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} onSearch={setCaseSearch} placeholder="Search case, client, collector or invoice..." />
                </div>
              )
            }
            tabs={
              !cases.unavailable && {
                label: "Case status",
                loading: cases.loading,
                items: [ALL, ...CASE_STATUSES].map((s) => ({
                  key: s,
                  label: s === ALL ? "All" : CASE_STATUS_LABELS[s],
                  value: caseCounts[s],
                  active: caseStatus === s,
                  onClick: () => setCaseStatus(s === ALL || caseStatus === s ? ALL : s),
                })),
              }
            }
            footer={!cases.unavailable && !cases.loading && !cases.error && <PaginationBar page={casePage} setPage={setCasePage} total={caseFiltered.length} noun="cases" />}
          >
            {cases.unavailable ? (
              <ARFeaturePending endpoint={COLLECTION_CASES_ENDPOINT} />
            ) : cases.error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{cases.error}</p>
            ) : (
              <div className="overflow-x-auto">
                <ARTable headers={CASE_HEADERS} columns={CASE_COLUMNS} rows={caseRows} loading={cases.loading} emptyMessage="No collection cases." />
              </div>
            )}
          </RegisterCard>
        </>
      )}

      {tab === "reminders" && (
        <RegisterCard
          title="Reminder History"
          subtitle="Payment reminders sent to clients, manual and automatic, newest first — with the channel used and whether it was delivered."
          toolbar={
            !reminders.unavailable && (
              <div className="min-w-0 flex-1">
                <SearchInput value={reminderSearch} onChange={(e) => setReminderSearch(e.target.value)} onSearch={setReminderSearch} placeholder="Search invoice, client or recipient..." />
              </div>
            )
          }
          footer={
            !reminders.unavailable && !reminders.loading && !reminders.error && (
              <PaginationBar page={reminderPage} setPage={setReminderPage} total={reminderFiltered.length} noun="reminders" />
            )
          }
        >
          {reminders.unavailable ? (
            <ARFeaturePending endpoint={REMINDERS_ENDPOINT} />
          ) : reminders.error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{reminders.error}</p>
          ) : (
            <div className="overflow-x-auto">
              <ARTable headers={REMINDER_HEADERS} columns={REMINDER_COLUMNS} rows={reminderRows} loading={reminders.loading} emptyMessage="No reminders sent yet." />
            </div>
          )}
        </RegisterCard>
      )}

      <SendReminderModal
        isOpen={Boolean(reminderState)}
        onClose={() => setReminderState(null)}
        onSent={reminders.reload}
        receivables={receivables}
        prefillReceivableId={reminderState?.receivableId}
      />
      <OpenCaseModal
        isOpen={Boolean(openCaseState)}
        onClose={() => setOpenCaseState(null)}
        onOpened={cases.reload}
        receivables={receivables}
        defaultAssignee={user?.name || ""}
        prefill={openCaseState}
      />
      <CaseActionModal
        action={caseAction?.action}
        collectionCase={caseAction?.c}
        onClose={() => setCaseAction(null)}
        onDone={() => {
          cases.reload();
          if (viewCase && caseAction?.c?.caseId === viewCase.caseId) setViewCase({ ...viewCase });
        }}
      />
      <ConfirmationModal
        isOpen={Boolean(cancelTarget)}
        title="Cancel Reminder"
        message={cancelTarget ? `Cancel the scheduled ${REMINDER_TYPE_LABELS[cancelTarget.reminderType] || ""} reminder for ${cancelTarget.invoiceNumber}?` : ""}
        confirmText="Cancel Reminder"
        cancelText="Keep"
        variant="danger"
        isLoading={cancelling}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancelReminder}
      />

      {/* Case timeline */}
      <DetailsDrawer
        isOpen={Boolean(viewCase)}
        onClose={() => setViewCase(null)}
        title={detail?.caseNumber}
        subtitle={detail ? `${detail.clientName} · ${formatCurrency(detail.totalOverdue, detail.currencyCode)} overdue` : ""}
        badge={detail && <StatusBadge label={CASE_STATUS_LABELS[detail.status] || detail.status} size="sm" />}
      >
        {detail && (
          <div className="space-y-4 pb-3">
            <dl className="grid grid-cols-2 gap-3 pt-2 text-sm">
              <div><dt className="text-xs text-slate-500">Collector</dt><dd className="font-medium">{detail.assigneeName || "Unassigned"}</dd></div>
              <div><dt className="text-xs text-slate-500">Priority</dt><dd className="font-medium">{CASE_PRIORITY_LABELS[detail.priority] || detail.priority}</dd></div>
              <div><dt className="text-xs text-slate-500">Opened</dt><dd className="font-medium">{formatDisplayDateTime(detail.openedAt) || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Next follow-up</dt><dd className="font-medium">{detail.nextFollowUpDate ? formatDisplayDate(detail.nextFollowUpDate) : "—"}</dd></div>
              {detail.promiseToPay && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Promise to pay</dt>
                  <dd className="font-medium">
                    {formatCurrency(detail.promiseToPay.promisedAmount, detail.currencyCode)} by {formatDisplayDate(detail.promiseToPay.promisedDate)}
                  </dd>
                </div>
              )}
              <div className="col-span-2"><dt className="text-xs text-slate-500">Invoices</dt><dd className="font-mono text-xs">{detail.invoiceNumbers.join(", ") || "—"}</dd></div>
            </dl>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Activity timeline</p>
              {caseDetailLoading ? (
                <LoadingSpinner size="sm" text="Loading timeline..." />
              ) : detail.activities.length === 0 ? (
                <p className="text-sm text-slate-500">No follow-ups logged yet.</p>
              ) : (
                <ol className="space-y-2">
                  {detail.activities.map((a) => (
                    <li key={a.activityId || a.createdAt} className="rounded-lg border border-slate-100 px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{ACTIVITY_TYPE_LABELS[a.activityType] || a.activityType}</span>
                        <span className="text-slate-500">{formatDisplayDateTime(a.createdAt) || "—"}{a.createdBy ? ` · ${a.createdBy}` : ""}</span>
                      </div>
                      <p className="mt-0.5 text-slate-700">{a.outcome}</p>
                      {a.notes && <p className="mt-0.5 text-slate-500">{a.notes}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </DetailsDrawer>
    </div>
  );
}

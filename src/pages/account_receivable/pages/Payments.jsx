import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Banknote, Coins, Scale, Landmark, Eye, Split, BadgeCheck, Plus, Receipt } from "lucide-react";

import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import FormInput from "../../../components/forms/FormInput";
import FormTextArea from "../../../components/forms/FormTextArea";
import FormDatePicker from "../../../components/forms/FormDatePicker";
import SearchInput from "../../../components/filter/Searchbar";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import { showStatusToast } from "../../../components/toastfy/toast";
import { ConsoleHeader, StatTile, StatTileGrid, RegisterCard, Segmented } from "../components/receivables/ConsoleUI";
import ARFilterListbox from "../components/common/ARFilterListbox";
import ARClearFiltersButton from "../components/common/ARClearFiltersButton";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import DetailsDrawer from "../components/common/DetailsDrawer";
import ARFeaturePending from "../components/common/ARFeaturePending";
import RecordPaymentModal from "../components/payments/RecordPaymentModal";
import PaymentAllocationEditor, { toAllocationPayload, validateAllocations } from "../components/payments/PaymentAllocationEditor";
import useContractList from "../hooks/useContractList";
import useOutstandingReceivables from "../hooks/useOutstandingReceivables";
import { formatCurrency, formatDisplayDate, formatDisplayDateTime } from "../utils/format";
import { getArApiErrorMessage } from "../utils/apiAvailability";
import {
  getPayments,
  allocatePayment,
  reconcilePayment,
  PAYMENTS_ENDPOINT,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  ALLOCATION_STATUS_LABELS,
  RECONCILIATION_STATUS_LABELS,
} from "../services/paymentService";
import { toLocalIsoDate } from "../services/receivableService";

const PAGE_SIZE = 10;
const ALL = "ALL";
const TABS = [
  { key: ALL, label: "All" },
  { key: "UNALLOCATED", label: "Has unallocated" },
  { key: "UNRECONCILED", label: "Unreconciled" },
  { key: "RECONCILED", label: "Reconciled" },
];

const TABLE_HEADERS = ["Payment No.", "Client", "Payment Date", "Method", "Reference", "Amount", "Allocated", "Unallocated", "Reconciliation Status", "Actions"];
const TABLE_COLUMNS = ["paymentNumber", "client", "paymentDate", "method", "reference", "amount", "allocated", "unallocated", "status", "actions"];

const today = () => toLocalIsoDate();

const sumByCurrency = (rows, field) =>
  rows.reduce((acc, r) => ({ ...acc, [r.currencyCode]: (acc[r.currencyCode] || 0) + r[field] }), {});

// Never add across currencies — show each currency's total.
const formatTotals = (totals) => {
  const entries = Object.entries(totals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([code, v]) => formatCurrency(v, code)).join(" · ") : "—";
};

const matchesTab = (p, tab) => {
  if (tab === "UNALLOCATED") return p.unallocatedAmount > 0;
  if (tab === "UNRECONCILED") return p.reconciliationStatus === "UNRECONCILED";
  if (tab === "RECONCILED") return p.reconciliationStatus === "RECONCILED";
  return true;
};

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-5 gap-3 py-2 text-sm">
      <dt className="col-span-2 text-slate-500">{label}</dt>
      <dd className="col-span-3 font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default function Payments() {
  const navigate = useNavigate();
  const location = useLocation();

  const fetchPayments = useCallback(() => getPayments(), []);
  const { data: payments, loading, error, unavailable, reload } = useContractList(fetchPayments);
  const { receivables, clients } = useOutstandingReceivables();

  const [tab, setTab] = useState(ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordPrefill, setRecordPrefill] = useState(null);
  const [selected, setSelected] = useState(null);
  const [allocateTarget, setAllocateTarget] = useState(null);
  const [allocations, setAllocations] = useState({});
  const [reconcileTarget, setReconcileTarget] = useState(null);
  const [reconcileForm, setReconcileForm] = useState({ bankReference: "", reconciledDate: today(), remarks: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Arriving from a receivable's "Record Payment" action opens the form pre-filled.
  useEffect(() => {
    const state = location.state;
    if (state?.recordPaymentFor) {
      setRecordPrefill(state.recordPaymentFor);
      setRecordOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setCurrentPage(1), [tab, searchQuery, methodFilter]);

  const baseFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      if (methodFilter && p.paymentMethod !== methodFilter) return false;
      if (!q) return true;
      return [p.paymentNumber, p.clientName, p.referenceNumber, ...p.allocations.map((a) => a.invoiceNumber)]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [payments, searchQuery, methodFilter]);

  const tabCounts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, baseFiltered.filter((p) => matchesTab(p, t.key)).length])),
    [baseFiltered]
  );
  const filtered = baseFiltered.filter((p) => matchesTab(p, tab));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const kpis = [
    {
      label: "Payments Recorded",
      value: payments.length,
      icon: Banknote,
      iconClass: "bg-blue-50 text-blue-700",
      hint: `${new Set(payments.map((p) => p.clientId)).size} paying clients`,
      onClick: () => setTab(ALL),
      active: tab === ALL,
    },
    {
      label: "Total Received",
      value: formatTotals(sumByCurrency(payments, "amount")),
      icon: Coins,
      iconClass: "bg-emerald-50 text-emerald-700",
      hint: "Money received, by currency",
      hintClass: "text-emerald-600",
    },
    {
      label: "Unallocated Cash",
      variant: payments.some((p) => p.unallocatedAmount > 0) ? "warning" : "default",
      value: formatTotals(sumByCurrency(payments, "unallocatedAmount")),
      icon: Scale,
      iconClass: "bg-amber-50 text-amber-700",
      hint: `${payments.filter((p) => p.unallocatedAmount > 0).length} payments not fully applied`,
      hintClass: "text-amber-700",
      onClick: () => setTab(tab === "UNALLOCATED" ? ALL : "UNALLOCATED"),
      active: tab === "UNALLOCATED",
    },
    {
      label: "Awaiting Reconciliation",
      value: payments.filter((p) => p.reconciliationStatus === "UNRECONCILED").length,
      icon: Landmark,
      iconClass: "bg-rose-50 text-rose-700",
      hint: "Not yet matched to the bank",
      hintClass: "text-rose-600",
      onClick: () => setTab(tab === "UNRECONCILED" ? ALL : "UNRECONCILED"),
      active: tab === "UNRECONCILED",
    },
  ];

  const hasActiveFilters = Boolean(searchQuery || methodFilter || tab !== ALL);

  /* ------------------------------ Actions ------------------------------ */

  const openAllocate = (p) => {
    setAllocateTarget(p);
    setAllocations({});
    setActionError(null);
  };

  const allocateReceivables = allocateTarget
    ? receivables.filter((r) => r.clientId === allocateTarget.clientId && r.currencyCode === allocateTarget.currencyCode)
    : [];

  const handleAllocate = async () => {
    const validation = validateAllocations(allocations, allocateReceivables, allocateTarget.unallocatedAmount);
    const payload = toAllocationPayload(allocations);
    if (validation) return setActionError(validation);
    if (payload.length === 0) return setActionError("Enter an amount for at least one invoice.");
    setActionLoading(true);
    try {
      await allocatePayment(allocateTarget.paymentId, payload);
      showStatusToast("Payment allocated.", "success");
      setAllocateTarget(null);
      reload();
    } catch (err) {
      setActionError(getArApiErrorMessage(err, "Payment could not be allocated."));
    } finally {
      setActionLoading(false);
    }
  };

  const openReconcile = (p) => {
    setReconcileTarget(p);
    setReconcileForm({ bankReference: p.referenceNumber || "", reconciledDate: today(), remarks: "" });
    setActionError(null);
  };

  const handleReconcile = async () => {
    if (!reconcileForm.bankReference.trim()) return setActionError("Enter the bank statement reference.");
    setActionLoading(true);
    try {
      await reconcilePayment(reconcileTarget.paymentId, {
        bankReference: reconcileForm.bankReference.trim(),
        reconciledDate: reconcileForm.reconciledDate,
        remarks: reconcileForm.remarks.trim() || null,
      });
      showStatusToast("Payment reconciled.", "success");
      setReconcileTarget(null);
      reload();
    } catch (err) {
      setActionError(getArApiErrorMessage(err, "Payment could not be reconciled."));
    } finally {
      setActionLoading(false);
    }
  };

  const tableRows = pageRows.map((p) => ({
    onRowClick: () => setSelected(p),
    paymentNumber: <span className="font-mono font-bold text-indigo-700">{p.paymentNumber}</span>,
    client: <span className="font-semibold text-slate-800">{p.clientName}</span>,
    paymentDate: <span className="whitespace-nowrap">{p.paymentDate ? formatDisplayDate(p.paymentDate) : "—"}</span>,
    method: PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod || "—",
    reference: <span className="font-mono text-xs text-slate-600">{p.referenceNumber || "—"}</span>,
    amount: <span className="whitespace-nowrap font-bold tabular-nums">{formatCurrency(p.amount, p.currencyCode)}</span>,
    allocated: <span className="whitespace-nowrap tabular-nums">{formatCurrency(p.allocatedAmount, p.currencyCode)}</span>,
    unallocated: (
      <span className={`whitespace-nowrap tabular-nums ${p.unallocatedAmount > 0 ? "font-semibold text-amber-700" : ""}`}>
        {formatCurrency(p.unallocatedAmount, p.currencyCode)}
      </span>
    ),
    status: <StatusBadge label={RECONCILIATION_STATUS_LABELS[p.reconciliationStatus] || p.reconciliationStatus} size="sm" />,
    actions: (
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          items={[
            { label: "View Details", icon: <Eye className="h-4 w-4 text-slate-600" />, onClick: () => setSelected(p) },
            { label: "Allocate Remainder", icon: <Split className="h-4 w-4 text-indigo-600" />, onClick: () => openAllocate(p), hidden: p.unallocatedAmount <= 0 },
            { label: "Reconcile", icon: <BadgeCheck className="h-4 w-4 text-emerald-600" />, onClick: () => openReconcile(p), hidden: p.reconciliationStatus === "RECONCILED" },
          ]}
        />
      </div>
    ),
  }));

  return (
    <div className="space-y-6 pb-12">
      <ConsoleHeader
        title="Payments"
        subtitle="Record money received from clients, apply it to their open invoices, and match it to the bank statement."
        actions={
          <Button variant="primary" onClick={() => { setRecordPrefill(null); setRecordOpen(true); }}>
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        }
      />

      {!unavailable && (
        <StatTileGrid columns={4}>
          {kpis.map((kpi) => (
            <StatTile key={kpi.label} {...kpi} value={loading ? "…" : kpi.value} />
          ))}
        </StatTileGrid>
      )}

      <RegisterCard
        title="Payment Register"
        subtitle="Every payment received, newest first — how much is applied to invoices, what is left to apply, and whether the bank has confirmed it."
        wideToolbar
        toolbar={
          !unavailable && (
            <>
              <div className="min-w-0 flex-1 lg:w-80 lg:flex-none">
                <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onSearch={setSearchQuery} placeholder="Search payment, client, reference or invoice..." />
              </div>
              <div className="w-full sm:w-44">
                <ARFilterListbox options={[{ value: "", label: "All methods" }, ...PAYMENT_METHODS]} value={methodFilter} onChange={setMethodFilter} placeholder="All methods" />
              </div>
              {hasActiveFilters && (
                <ARClearFiltersButton onClick={() => { setSearchQuery(""); setMethodFilter(""); setTab(ALL); }} label="Clear filters" />
              )}
            </>
          )
        }
        tabs={
          !unavailable && {
            label: "Payment filters",
            loading,
            items: TABS.map((t) => ({
              key: t.key,
              label: t.label,
              value: tabCounts[t.key],
              active: tab === t.key,
              onClick: () => setTab(t.key === ALL || tab === t.key ? ALL : t.key),
            })),
          }
        }
        footer={
          !unavailable && !loading && !error && filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            />
          )
        }
      >
        {unavailable ? (
          <ARFeaturePending endpoint={PAYMENTS_ENDPOINT} />
        ) : error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <ARTable
              headers={TABLE_HEADERS}
              columns={TABLE_COLUMNS}
              rows={tableRows}
              loading={loading}
              emptyMessage={hasActiveFilters ? "No payments match the selected filters." : "No payments recorded yet."}
            />
          </div>
        )}
      </RegisterCard>

      <RecordPaymentModal
        isOpen={recordOpen}
        onClose={() => setRecordOpen(false)}
        onRecorded={reload}
        clients={clients}
        receivables={receivables}
        prefill={recordPrefill}
      />

      {/* Allocate remainder */}
      <Modal
        isOpen={Boolean(allocateTarget)}
        onClose={() => !actionLoading && setAllocateTarget(null)}
        title="Allocate Payment"
        subtitle={allocateTarget ? `${allocateTarget.paymentNumber} · ${formatCurrency(allocateTarget.unallocatedAmount, allocateTarget.currencyCode)} unallocated` : ""}
        size="3xl"
      >
        {allocateTarget && (
          <div className="space-y-4">
            <PaymentAllocationEditor
              receivables={allocateReceivables}
              allocations={allocations}
              onChange={setAllocations}
              available={allocateTarget.unallocatedAmount}
              currency={allocateTarget.currencyCode}
            />
            {actionError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setAllocateTarget(null)} disabled={actionLoading}>Cancel</Button>
              <Button variant="primary" onClick={handleAllocate} loading={actionLoading} loadingText="Allocating...">Allocate</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reconcile */}
      <Modal
        isOpen={Boolean(reconcileTarget)}
        onClose={() => !actionLoading && setReconcileTarget(null)}
        title="Reconcile Payment"
        subtitle={reconcileTarget ? `${reconcileTarget.paymentNumber} · ${formatCurrency(reconcileTarget.amount, reconcileTarget.currencyCode)}` : ""}
        size="md"
      >
        {reconcileTarget && (
          <div className="space-y-4">
            <FormInput
              label="Bank Statement Reference"
              name="bankReference"
              value={reconcileForm.bankReference}
              onChange={(e) => setReconcileForm((f) => ({ ...f, bankReference: e.target.value }))}
              requiredMark
            />
            <FormDatePicker
              label="Reconciled On"
              name="reconciledDate"
              value={reconcileForm.reconciledDate}
              onChange={(e) => setReconcileForm((f) => ({ ...f, reconciledDate: e.target.value }))}
              max={today()}
            />
            <FormTextArea
              label="Remarks"
              name="remarks"
              rows={2}
              value={reconcileForm.remarks}
              onChange={(e) => setReconcileForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="Optional"
            />
            {actionError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setReconcileTarget(null)} disabled={actionLoading}>Cancel</Button>
              <Button variant="primary" onClick={handleReconcile} loading={actionLoading} loadingText="Reconciling...">Mark Reconciled</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment details */}
      <DetailsDrawer
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.paymentNumber}
        subtitle={selected?.clientName}
        badge={selected && <StatusBadge label={ALLOCATION_STATUS_LABELS[selected.allocationStatus] || selected.allocationStatus} size="sm" />}
      >
        {selected && (
          <div className="space-y-4 pb-3">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Amount"><span className="tabular-nums">{formatCurrency(selected.amount, selected.currencyCode)}</span></DetailRow>
              <DetailRow label="Payment date">{selected.paymentDate ? formatDisplayDate(selected.paymentDate) : "—"}</DetailRow>
              <DetailRow label="Method">{PAYMENT_METHOD_LABELS[selected.paymentMethod] || "—"}</DetailRow>
              <DetailRow label="Reference">{selected.referenceNumber || "—"}</DetailRow>
              <DetailRow label="Reconciliation">
                {RECONCILIATION_STATUS_LABELS[selected.reconciliationStatus]}
                {selected.reconciledAt && <span className="block text-xs text-slate-500">{formatDisplayDateTime(selected.reconciledAt)} · {selected.bankReference}</span>}
              </DetailRow>
              {selected.remarks && <DetailRow label="Remarks">{selected.remarks}</DetailRow>}
              <DetailRow label="Recorded">{selected.createdAt ? formatDisplayDateTime(selected.createdAt) : "—"}{selected.createdBy ? ` · ${selected.createdBy}` : ""}</DetailRow>
            </dl>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Applied to invoices</p>
              {selected.allocations.length === 0 ? (
                <p className="text-sm text-slate-500">Not applied to any invoice yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {selected.allocations.map((a) => (
                    <li key={a.allocationId || a.receivableId} className="flex items-center justify-between px-3 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() => a.invoiceId && navigate(`/account-receivable/invoices/${a.invoiceId}`)}
                        className="font-mono font-semibold text-indigo-700 hover:underline"
                      >
                        {a.invoiceNumber}
                      </button>
                      <span className="font-semibold tabular-nums">{formatCurrency(a.amount, selected.currencyCode)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DetailsDrawer>
    </div>
  );
}

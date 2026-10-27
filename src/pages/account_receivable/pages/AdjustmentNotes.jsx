import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileMinus, FilePlus, FileText, Plus, Receipt, CalendarDays } from "lucide-react";

import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import FormTextArea from "../../../components/forms/FormTextArea";
import FormDatePicker from "../../../components/forms/FormDatePicker";
import SearchInput from "../../../components/filter/Searchbar";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import { showStatusToast } from "../../../components/toastfy/toast";
import { ConsoleHeader, StatTile, StatTileGrid, RegisterCard, Segmented } from "../components/receivables/ConsoleUI";
import ARClearFiltersButton from "../components/common/ARClearFiltersButton";
import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import ARFeaturePending from "../components/common/ARFeaturePending";
import SearchableSelect from "../components/common/SearchableSelect";
import useContractList from "../hooks/useContractList";
import useOutstandingReceivables, { receivableOptionLabel } from "../hooks/useOutstandingReceivables";
import { formatCurrency, formatDisplayDate } from "../utils/format";
import { getArApiErrorMessage } from "../utils/apiAvailability";
import {
  getAdjustmentNotes,
  createAdjustmentNote,
  ADJUSTMENT_NOTES_ENDPOINT,
  NOTE_TYPES,
  NOTE_REASONS,
  NOTE_REASON_LABELS,
} from "../services/adjustmentNoteService";
import { toLocalIsoDate } from "../services/receivableService";

const PAGE_SIZE = 10;
const ALL = "ALL";
const TYPE_LABELS = { CREDIT: "Credit Note", DEBIT: "Debit Note" };

const TABLE_HEADERS = ["Note No.", "Type", "Invoice No.", "Client", "Reason", "Note Date", "Amount", "Balance After", "Status", "Actions"];
const TABLE_COLUMNS = ["noteNumber", "type", "invoiceNumber", "client", "reason", "noteDate", "amount", "balanceAfter", "status", "actions"];

const today = () => toLocalIsoDate();
const emptyForm = (noteType) => ({ noteType, receivableId: "", reason: "", amount: "", noteDate: today(), remarks: "" });

export default function AdjustmentNotes() {
  const navigate = useNavigate();
  const location = useLocation();

  const fetchNotes = useCallback(() => getAdjustmentNotes(), []);
  const { data: notes, loading, error, unavailable, reload } = useContractList(fetchNotes);
  const { receivables } = useOutstandingReceivables();

  const [typeTab, setTypeTab] = useState(ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const openForm = (noteType, receivableId = "") => {
    setForm({ ...emptyForm(noteType), receivableId });
    setFormError(null);
  };

  // Arriving from a receivable's "Raise Credit/Debit Note" action.
  useEffect(() => {
    const state = location.state;
    if (state?.raiseNote) {
      openForm(state.raiseNote.noteType, state.raiseNote.receivableId);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setCurrentPage(1), [typeTab, searchQuery]);

  const baseFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      [n.noteNumber, n.invoiceNumber, n.clientName, NOTE_REASON_LABELS[n.reason]].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [notes, searchQuery]);

  const counts = {
    [ALL]: baseFiltered.length,
    CREDIT: baseFiltered.filter((n) => n.noteType === "CREDIT").length,
    DEBIT: baseFiltered.filter((n) => n.noteType === "DEBIT").length,
  };
  const filtered = typeTab === ALL ? baseFiltered : baseFiltered.filter((n) => n.noteType === typeTab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* ------------------------------- Form ------------------------------- */

  const selectedReceivable = form ? receivables.find((r) => r.receivableId === form.receivableId) : null;
  const amountNum = Number(form?.amount) || 0;
  const balanceAfter = selectedReceivable
    ? form.noteType === NOTE_TYPES.CREDIT
      ? selectedReceivable.outstandingBalance - amountNum
      : selectedReceivable.outstandingBalance + amountNum
    : null;

  const setField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.receivableId) return setFormError("Select the invoice to adjust.");
    if (!form.reason) return setFormError("Select a reason.");
    if (!(amountNum > 0)) return setFormError("Enter an amount greater than zero.");
    if (form.noteType === NOTE_TYPES.CREDIT && selectedReceivable && amountNum > selectedReceivable.outstandingBalance) {
      return setFormError("A credit note cannot exceed the invoice's outstanding balance.");
    }
    if (!form.remarks.trim()) return setFormError("Add remarks explaining the adjustment.");

    setSubmitting(true);
    setFormError(null);
    try {
      const note = await createAdjustmentNote({
        noteType: form.noteType,
        receivableId: form.receivableId,
        reason: form.reason,
        amount: amountNum,
        noteDate: form.noteDate,
        remarks: form.remarks.trim(),
      });
      showStatusToast(
        note.noteNumber !== "—" ? `${TYPE_LABELS[form.noteType]} ${note.noteNumber} issued.` : `${TYPE_LABELS[form.noteType]} issued.`,
        "success"
      );
      setForm(null);
      reload();
    } catch (err) {
      setFormError(getArApiErrorMessage(err, "The note could not be issued."));
    } finally {
      setSubmitting(false);
    }
  };

  const tableRows = pageRows.map((n) => ({
    noteNumber: <span className="font-mono font-bold text-indigo-700">{n.noteNumber}</span>,
    type: (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${n.noteType === "CREDIT" ? "text-emerald-700" : "text-rose-700"}`}>
        {n.noteType === "CREDIT" ? <FileMinus className="h-3.5 w-3.5" /> : <FilePlus className="h-3.5 w-3.5" />}
        {TYPE_LABELS[n.noteType] || n.noteType}
      </span>
    ),
    invoiceNumber: <span className="font-mono text-slate-700">{n.invoiceNumber}</span>,
    client: <span className="font-semibold text-slate-800">{n.clientName}</span>,
    reason: NOTE_REASON_LABELS[n.reason] || n.reason || "—",
    noteDate: <span className="whitespace-nowrap">{n.noteDate ? formatDisplayDate(n.noteDate) : "—"}</span>,
    amount: (
      <span className={`whitespace-nowrap font-bold tabular-nums ${n.noteType === "CREDIT" ? "text-emerald-700" : "text-rose-700"}`}>
        {n.noteType === "CREDIT" ? "−" : "+"}
        {formatCurrency(n.amount, n.currencyCode)}
      </span>
    ),
    balanceAfter: <span className="whitespace-nowrap tabular-nums">{n.balanceAfter === null ? "—" : formatCurrency(n.balanceAfter, n.currencyCode)}</span>,
    status: <StatusBadge label={n.status} size="sm" />,
    actions: (
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          items={[
            {
              label: "Open Invoice",
              icon: <FileText className="h-4 w-4 text-indigo-600" />,
              onClick: () => navigate(`/account-receivable/invoices/${n.invoiceId}`),
              disabled: !n.invoiceId,
            },
          ]}
        />
      </div>
    ),
  }));

  // Totals stay per currency — a note never mixes currencies.
  const totalsByCurrency = (rows) => {
    const totals = rows.reduce((acc, n) => ({ ...acc, [n.currencyCode]: (acc[n.currencyCode] || 0) + n.amount }), {});
    const entries = Object.entries(totals).filter(([, v]) => v > 0);
    return entries.length ? entries.map(([code, v]) => formatCurrency(v, code)).join(" · ") : "—";
  };
  const credits = notes.filter((n) => n.noteType === "CREDIT");
  const debits = notes.filter((n) => n.noteType === "DEBIT");
  const thisMonth = toLocalIsoDate().slice(0, 7);
  const kpis = [
    {
      label: "Credit Notes",
      value: credits.length,
      icon: FileMinus,
      iconClass: "bg-emerald-50 text-emerald-700",
      hint: `${totalsByCurrency(credits)} credited`,
      hintClass: "text-emerald-600",
      onClick: () => setTypeTab(typeTab === "CREDIT" ? ALL : "CREDIT"),
      active: typeTab === "CREDIT",
    },
    {
      label: "Debit Notes",
      value: debits.length,
      icon: FilePlus,
      iconClass: "bg-rose-50 text-rose-700",
      hint: `${totalsByCurrency(debits)} debited`,
      hintClass: "text-rose-600",
      onClick: () => setTypeTab(typeTab === "DEBIT" ? ALL : "DEBIT"),
      active: typeTab === "DEBIT",
    },
    {
      label: "Invoices Adjusted",
      value: new Set(notes.map((n) => n.receivableId)).size,
      icon: FileText,
      iconClass: "bg-blue-50 text-blue-700",
      hint: `${new Set(notes.map((n) => n.clientId)).size} clients affected`,
    },
    {
      label: "Issued This Month",
      value: notes.filter((n) => String(n.noteDate || "").startsWith(thisMonth)).length,
      icon: CalendarDays,
      iconClass: "bg-slate-100 text-slate-700",
      hint: "Notes dated this calendar month",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <ConsoleHeader
        title="Credit & Debit Notes"
        subtitle="Correct what a client owes after an invoice is sent — credit notes lower the balance, debit notes raise it."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => openForm(NOTE_TYPES.DEBIT)}>
              <Plus className="h-4 w-4" /> Debit Note
            </Button>
            <Button variant="primary" onClick={() => openForm(NOTE_TYPES.CREDIT)}>
              <Plus className="h-4 w-4" /> Credit Note
            </Button>
          </div>
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
        title="Adjustment Register"
        subtitle="Every credit and debit note issued, the invoice it adjusts, and the balance left on that invoice afterwards."
        toolbar={
          !unavailable && (
            <>
              <div className="min-w-0 flex-1">
                <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onSearch={setSearchQuery} placeholder="Search note, invoice, client or reason..." />
              </div>
              {(searchQuery || typeTab !== ALL) && (
                <ARClearFiltersButton onClick={() => { setSearchQuery(""); setTypeTab(ALL); }} label="Clear filters" />
              )}
            </>
          )
        }
        tabs={
          !unavailable && {
            label: "Note type",
            loading,
            items: [
              { key: ALL, label: "All", value: counts[ALL], active: typeTab === ALL, onClick: () => setTypeTab(ALL) },
              { key: "CREDIT", label: "Credit Notes", value: counts.CREDIT, active: typeTab === "CREDIT", onClick: () => setTypeTab(typeTab === "CREDIT" ? ALL : "CREDIT") },
              { key: "DEBIT", label: "Debit Notes", value: counts.DEBIT, active: typeTab === "DEBIT", onClick: () => setTypeTab(typeTab === "DEBIT" ? ALL : "DEBIT") },
            ],
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
          <ARFeaturePending endpoint={ADJUSTMENT_NOTES_ENDPOINT} />
        ) : error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <ARTable headers={TABLE_HEADERS} columns={TABLE_COLUMNS} rows={tableRows} loading={loading} emptyMessage="No credit or debit notes issued yet." />
          </div>
        )}
      </RegisterCard>

      {/* Issue note */}
      <Modal
        isOpen={Boolean(form)}
        onClose={() => !submitting && setForm(null)}
        title={form ? `Issue ${TYPE_LABELS[form.noteType]}` : ""}
        subtitle={form?.noteType === NOTE_TYPES.CREDIT ? "Reduces the invoice's outstanding balance." : "Increases the invoice's outstanding balance."}
        size="2xl"
      >
        {form && (
          <div className="space-y-4">
            <SearchableSelect
              label="Invoice"
              name="receivableId"
              requiredMark
              value={form.receivableId}
              onChange={setField}
              placeholder="Search invoice or client..."
              options={receivables.map((r) => ({ value: r.receivableId, label: receivableOptionLabel(r, formatCurrency) }))}
              emptyState="No outstanding invoices to adjust."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelect label="Reason" name="reason" value={form.reason} onChange={setField} options={NOTE_REASONS[form.noteType]} placeholder="Select reason" />
              <FormInput
                label={`Amount${selectedReceivable ? ` (${selectedReceivable.currencyCode})` : ""}`}
                name="amount"
                type="number"
                value={form.amount}
                onChange={setField}
                placeholder="0.00"
                requiredMark
                onWheel={(e) => e.currentTarget.blur()}
              />
              <FormDatePicker label="Note Date" name="noteDate" value={form.noteDate} onChange={setField} />
            </div>
            {selectedReceivable && (
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 px-4 py-3 text-xs">
                <div>
                  <p className="text-slate-500">Balance now</p>
                  <p className="font-semibold tabular-nums text-slate-900">{formatCurrency(selectedReceivable.outstandingBalance, selectedReceivable.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Balance after note</p>
                  <p className={`font-semibold tabular-nums ${balanceAfter < 0 ? "text-rose-700" : "text-slate-900"}`}>
                    {formatCurrency(balanceAfter, selectedReceivable.currencyCode)}
                  </p>
                </div>
              </div>
            )}
            <FormTextArea label="Remarks" name="remarks" value={form.remarks} onChange={setField} rows={3} required placeholder="Explain why this adjustment is needed" />
            {formError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setForm(null)} disabled={submitting}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit} loading={submitting} loadingText="Issuing...">
                Issue {TYPE_LABELS[form.noteType]}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

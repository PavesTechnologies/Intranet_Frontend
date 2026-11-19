import { useEffect, useMemo, useState } from "react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchableSelect from "../common/SearchableSelect";
import { formatCurrency, formatDisplayDate } from "../../utils/format";
import { getArApiErrorMessage } from "../../utils/apiAvailability";
import { CASE_PRIORITIES, openCollectionCase } from "../../services/collectionsService";

/**
 * Open a collection case for one client's overdue receivables (one currency
 * per case). `prefill` = { clientId, receivableIds } from a receivable action.
 */
export default function OpenCaseModal({ isOpen, onClose, onOpened, receivables, defaultAssignee, prefill }) {
  const overdue = useMemo(() => receivables.filter((r) => r.daysOverdue > 0), [receivables]);

  const clients = useMemo(() => {
    const map = new Map();
    overdue.forEach((r) => map.set(r.clientId, r.clientName));
    return [...map.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [overdue]);

  const [form, setForm] = useState({ clientId: "", currencyCode: "", priority: "MEDIUM", assigneeName: "", notes: "" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const first = overdue.find((r) => prefill?.receivableIds?.includes(r.receivableId));
    setForm({
      clientId: prefill?.clientId || first?.clientId || "",
      currencyCode: first?.currencyCode || "",
      priority: "MEDIUM",
      assigneeName: defaultAssignee || "",
      notes: "",
    });
    setSelectedIds(prefill?.receivableIds?.filter((id) => overdue.some((r) => r.receivableId === id)) || []);
    setFormError(null);
  }, [isOpen, prefill, overdue, defaultAssignee]);

  const clientOverdue = overdue.filter((r) => r.clientId === form.clientId);
  const currencies = [...new Set(clientOverdue.map((r) => r.currencyCode))].sort();
  const currency = form.currencyCode || currencies[0] || "";
  const candidates = clientOverdue.filter((r) => r.currencyCode === currency);
  const selectedTotal = candidates.filter((r) => selectedIds.includes(r.receivableId)).reduce((s, r) => s + r.outstandingBalance, 0);

  const setField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value, ...(name === "clientId" ? { currencyCode: "" } : {}) }));
    if (name === "clientId" || name === "currencyCode") setSelectedIds([]);
  };

  const toggle = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleOpen = async () => {
    if (!form.clientId) return setFormError("Select a client.");
    if (selectedIds.length === 0) return setFormError("Select at least one overdue invoice.");
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await openCollectionCase({
        clientId: form.clientId,
        receivableIds: selectedIds,
        priority: form.priority,
        assigneeName: form.assigneeName.trim() || null,
        notes: form.notes.trim() || null,
      });
      showStatusToast(created.caseNumber !== "—" ? `Collection case ${created.caseNumber} opened.` : "Collection case opened.", "success");
      onOpened?.();
      onClose();
    } catch (err) {
      setFormError(getArApiErrorMessage(err, "The collection case could not be opened."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !submitting && onClose()} title="Open Collection Case" subtitle="Track follow-ups for a client's overdue invoices." size="3xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SearchableSelect
            label="Client"
            name="clientId"
            requiredMark
            value={form.clientId}
            onChange={setField}
            placeholder="Search client..."
            options={clients}
            emptyState="No clients with overdue invoices."
          />
          {currencies.length > 1 ? (
            <FormSelect label="Currency" name="currencyCode" value={currency} onChange={setField} options={currencies.map((c) => ({ value: c, label: c }))} />
          ) : (
            <FormInput label="Currency" name="currencyCode" value={currency} disabled placeholder="From client's invoices" />
          )}
          <FormSelect label="Priority" name="priority" value={form.priority} onChange={setField} options={CASE_PRIORITIES} />
          <FormInput label="Collector" name="assigneeName" value={form.assigneeName} onChange={setField} placeholder="Who will follow up" />
        </div>

        {form.clientId && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue invoices</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {candidates.map((r) => (
                <li key={r.receivableId}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.receivableId)}
                      onChange={() => toggle(r.receivableId)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0A0082] focus:ring-indigo-500"
                    />
                    <span className="font-mono font-semibold text-indigo-700">{r.invoiceNumber}</span>
                    <span className="text-xs text-slate-500">Due {r.dueDate ? formatDisplayDate(r.dueDate) : "—"} · {r.daysOverdue} days overdue</span>
                    <span className="ml-auto font-semibold tabular-nums">{formatCurrency(r.outstandingBalance, r.currencyCode)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-right text-xs text-slate-500">
              Selected overdue <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(selectedTotal, currency)}</span>
            </p>
          </div>
        )}

        <FormTextArea label="Notes" name="notes" value={form.notes} onChange={setField} rows={2} placeholder="Optional context for the collector" />
        {formError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleOpen} loading={submitting} loadingText="Opening...">Open Case</Button>
        </div>
      </div>
    </Modal>
  );
}

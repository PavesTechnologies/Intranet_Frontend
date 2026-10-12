import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CalendarX } from "lucide-react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import GenericTable from "@/components/Table/table";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "@/components/toastfy/toast";
import { categoryTaxMappingService } from "@/pages/expense-management/api/expenseReportsApi";

/** yyyy-mm-dd in the browser's own time zone (toISOString would shift it to UTC). */
const isoDate = (date) => date.toLocaleDateString("en-CA");
const todayIso = () => isoDate(new Date());
const yesterdayIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDate(d);
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const STATE_STYLES = {
  CURRENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  PAST: "bg-gray-100 text-gray-500 border-gray-200",
};
const STATE_LABELS = { CURRENT: "Current", SCHEDULED: "Scheduled", PAST: "Past" };

const emptyForm = { mode: null, mappingId: null, taxCodeId: "", effectiveFrom: "", effectiveTo: "" };

/**
 * Dated tax code mappings of one expense category: which code applies from when. A mapping that
 * has taken effect can only be ended; scheduled ones can be edited or removed. Newest first.
 */
export default function CategoryTaxMappingModal({ isOpen, onClose, category, taxCodes = [], canEdit, onChanged }) {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState(null);

  const categoryId = category?.categoryId;

  const load = useCallback(async () => {
    if (!categoryId) return;
    try {
      setLoading(true);
      const res = await categoryTaxMappingService.list(categoryId);
      setMappings(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to load tax mappings:", err);
      showStatusToast(err.response?.data?.message || "Failed to load tax mappings.", "error");
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setErrors({});
      load();
    }
  }, [isOpen, load]);

  const activeCodeOptions = taxCodes
    .filter((t) => (t.status || "").toUpperCase() === "ACTIVE")
    .map((t) => ({ label: `${t.taxCode} - ${t.taxName} (${Number(t.ratePercent)}%)`, value: t.taxCodeId }));

  const startAdd = () => {
    setForm({ mode: "add", mappingId: null, taxCodeId: "", effectiveFrom: todayIso(), effectiveTo: "" });
    setErrors({});
  };
  const startEdit = (m) => {
    setForm({ mode: "edit", mappingId: m.mappingId, taxCodeId: m.taxCodeId, effectiveFrom: m.effectiveFrom, effectiveTo: m.effectiveTo || "" });
    setErrors({});
  };
  const startEnd = (m) => {
    setForm({ mode: "end", mappingId: m.mappingId, taxCodeId: m.taxCodeId, effectiveFrom: m.effectiveFrom, effectiveTo: yesterdayIso() });
    setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!form.taxCodeId) e.taxCodeId = "Choose a tax code.";
    if (!form.effectiveFrom) e.effectiveFrom = "Start date is required.";
    if (form.mode === "end" && !form.effectiveTo) e.effectiveTo = "Choose the last day the code applies.";
    if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) {
      e.effectiveTo = "The end date cannot be before the start date.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const payload = { taxCodeId: form.taxCodeId, effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || null };
    try {
      setSaving(true);
      if (form.mode === "add") {
        await categoryTaxMappingService.create(categoryId, payload);
        showStatusToast("Tax mapping added.", "success");
      } else {
        await categoryTaxMappingService.update(categoryId, form.mappingId, payload);
        showStatusToast(form.mode === "end" ? "Tax mapping ended." : "Tax mapping updated.", "success");
      }
      setForm(emptyForm);
      await load();
      onChanged?.();
    } catch (err) {
      console.error("Failed to save tax mapping:", err);
      showStatusToast(err.response?.data?.message || "Failed to save tax mapping.", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    try {
      setSaving(true);
      await categoryTaxMappingService.delete(categoryId, toRemove.mappingId);
      showStatusToast("Tax mapping removed.", "success");
      setToRemove(null);
      await load();
      onChanged?.();
    } catch (err) {
      console.error("Failed to remove tax mapping:", err);
      showStatusToast(err.response?.data?.message || "Failed to remove tax mapping.", "error");
    } finally {
      setSaving(false);
    }
  };

  const today = todayIso();
  const headers = ["Tax Code", "From", "To", "State"];
  const columns = ["code", "from", "to", "state"];
  if (canEdit) {
    headers.push("Actions");
    columns.push("actions");
  }
  const rows = mappings.map((m) => {
    const row = {
      code: (
        <div className="leading-tight">
          <span className="font-mono text-xs font-semibold text-gray-800">{m.taxCode}</span>
          <span className="block text-[11px] text-gray-500">
            {m.taxName} · {Number(m.ratePercent)}%
            {(m.taxCodeStatus || "").toUpperCase() !== "ACTIVE" && <span className="ml-1 text-amber-700">(inactive)</span>}
          </span>
        </div>
      ),
      from: formatDate(m.effectiveFrom),
      to: m.effectiveTo ? formatDate(m.effectiveTo) : "Open",
      state: (
        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATE_STYLES[m.state] || STATE_STYLES.PAST}`}>
          {STATE_LABELS[m.state] || m.state}
        </span>
      ),
    };
    if (canEdit) {
      const removable = m.effectiveFrom >= today;
      row.actions = (
        <div className="flex items-center justify-center gap-1">
          {m.state === "SCHEDULED" && (
            <Button type="button" variant="link" size="icon" title="Edit mapping" aria-label="Edit mapping"
              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" onClick={() => startEdit(m)}>
              <Pencil size={15} />
            </Button>
          )}
          {m.state === "CURRENT" && !removable && (
            <Button type="button" variant="link" size="icon" title="End mapping" aria-label="End mapping"
              className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50" onClick={() => startEnd(m)}>
              <CalendarX size={15} />
            </Button>
          )}
          {removable && (
            <Button type="button" variant="link" size="icon" title="Remove mapping" aria-label="Remove mapping"
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" onClick={() => setToRemove(m)}>
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      );
    }
    return row;
  });

  const lockedCodeAndStart = form.mode === "end";
  const formTitle = form.mode === "add" ? "Add mapping" : form.mode === "end" ? "End mapping" : "Edit scheduled mapping";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Tax Mapping · ${category?.categoryName || ""}`}
        subtitle="Which tax code applies to this category on each expense date. To change a rate, end the current mapping and add the new code from the date it applies."
        size="lg"
        fullScreenMobile
        footer={
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {canEdit && !form.mode && (
            <div className="flex justify-end">
              <Button type="button" variant="primary" size="small" onClick={startAdd}>
                <Plus size={14} /> Add mapping
              </Button>
            </div>
          )}

          {form.mode && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-700">{formTitle}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {lockedCodeAndStart ? (
                  <FormInput label="Tax Code" name="taxCodeLocked" disabled
                    value={mappings.find((m) => m.mappingId === form.mappingId)?.taxCode || ""} />
                ) : (
                  <div>
                    <FormSelect
                      label="Tax Code"
                      name="taxCodeId"
                      value={form.taxCodeId}
                      onChange={(e) => setForm((f) => ({ ...f, taxCodeId: e.target.value }))}
                      options={activeCodeOptions}
                      placeholder="Select an active code"
                      anchorOptions
                    />
                    {errors.taxCodeId && <p className="mt-1 text-[11px] text-red-600">{errors.taxCodeId}</p>}
                  </div>
                )}
                <FormInput
                  label="From"
                  name="effectiveFrom"
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                  min={form.mode === "edit" ? today : undefined}
                  disabled={saving || lockedCodeAndStart}
                  requiredMark
                  error={errors.effectiveFrom}
                />
                <FormInput
                  label={form.mode === "end" ? "Last day it applies" : "To (optional)"}
                  name="effectiveTo"
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
                  min={form.mode === "end" ? yesterdayIso() : form.effectiveFrom || undefined}
                  disabled={saving}
                  requiredMark={form.mode === "end"}
                  error={errors.effectiveTo}
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" size="small" onClick={() => setForm(emptyForm)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" size="small" onClick={save} loading={saving} loadingText="Saving..." disabled={saving}>
                  {form.mode === "end" ? "End mapping" : "Save mapping"}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-10">
              <LoadingSpinner text="Loading tax mappings..." />
            </div>
          ) : mappings.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No tax code is mapped to this category, so its expenses get no GST pre-fill.
            </p>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable headers={headers} rows={rows} columns={columns} />
            </div>
          )}
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={!!toRemove}
        title="Remove Tax Mapping"
        message={`Remove the ${toRemove?.taxCode || ""} mapping starting ${formatDate(toRemove?.effectiveFrom)}? It has not applied to any earlier expense date.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
        isLoading={saving}
        variant="danger"
      />
    </>
  );
}

import { useState } from "react";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import VendorPicker from "../../vendor/components/VendorPicker";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import { usePurchaseCategoriesByDepartment } from "../../system-configuration/hooks/usePurchaseCategories";
import { useTdsPaymentNatures } from "../../system-configuration/hooks/useTdsConfig";
import { useVendorAgreements } from "../../invoice/hooks/useInvoicePaymentTerms";
import { getApiErrorMessage } from "../../utils/apiError";
import { FREQUENCY_OPTIONS } from "../../constants/recurring";
import { useSaveSchedule } from "../hooks/useRecurring";

const today = () => new Date().toISOString().slice(0, 10);

function initialForm(schedule) {
  const s = schedule || {};
  return {
    name: s.name ?? "",
    frequency: s.frequency ?? "MONTHLY",
    expected_day: String(s.expected_day ?? 1),
    expected_amount: s.expected_amount != null ? String(s.expected_amount) : "",
    tolerance_pct: String(s.tolerance_pct ?? 5),
    grace_days: String(s.grace_days ?? 5),
    start_date: s.start_date ?? today().slice(0, 8) + "01",
    end_date: s.end_date ?? "",
    agreement_id: s.agreement_id ? String(s.agreement_id) : "",
    department_id: s.department_id ? String(s.department_id) : "",
    purchase_category_id: s.purchase_category_id ? String(s.purchase_category_id) : "",
    payment_nature_code: s.payment_nature_code ?? "",
    match_keyword: s.match_keyword ?? "",
    fast_track: Boolean(s.fast_track),
    notes: s.notes ?? "",
  };
}

/** Errors keyed by field - mirrors the backend checks so the user sees them before saving. */
export function validateSchedule(form, vendorId) {
  const errors = {};
  if (!vendorId) errors.vendor = "Choose the vendor";
  if (!form.name.trim()) errors.name = "Give the schedule a name, e.g. \"WeWork desks - Floor 6\"";
  const day = Number(form.expected_day);
  if (!Number.isInteger(day) || day < 1 || day > 28) errors.expected_day = "Day 1 to 28";
  if (!(Number(form.expected_amount) > 0)) errors.expected_amount = "Enter the usual invoice total (incl. GST)";
  const tol = Number(form.tolerance_pct);
  if (Number.isNaN(tol) || tol < 0 || tol > 100) errors.tolerance_pct = "0 to 100 %";
  if (!form.start_date) errors.start_date = "Required";
  if (form.end_date && form.start_date && form.end_date < form.start_date) errors.end_date = "Ends before it starts";
  return errors;
}

export default function ScheduleFormModal({ isOpen, onClose, schedule }) {
  const editing = Boolean(schedule?.schedule_id);
  const [form, setForm] = useState(() => initialForm(schedule));
  const [vendorId, setVendorId] = useState(schedule?.vendor_id ?? null);
  const [vendorLabel, setVendorLabel] = useState(schedule?.vendor_name ?? "");
  const [errors, setErrors] = useState({});
  const save = useSaveSchedule();

  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = usePurchaseCategoriesByDepartment(form.department_id ? Number(form.department_id) : undefined);
  const { data: natures = [] } = useTdsPaymentNatures();
  const { data: agreements = [] } = useVendorAgreements(vendorId, { enabled: Boolean(vendorId) });

  const set = (key) => (e) => {
    const value = e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: value, ...(key === "department_id" ? { purchase_category_id: "" } : {}) }));
  };

  const submit = async () => {
    const found = validateSchedule(form, vendorId);
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = {
      name: form.name.trim(), frequency: form.frequency, expected_day: Number(form.expected_day),
      expected_amount: form.expected_amount, tolerance_pct: form.tolerance_pct, grace_days: Number(form.grace_days || 0),
      start_date: form.start_date, end_date: form.end_date || null,
      agreement_id: form.agreement_id ? Number(form.agreement_id) : null,
      department_id: form.department_id ? Number(form.department_id) : null,
      purchase_category_id: form.purchase_category_id ? Number(form.purchase_category_id) : null,
      payment_nature_code: form.payment_nature_code || null, match_keyword: form.match_keyword.trim() || null,
      fast_track: form.fast_track, notes: form.notes.trim() || null,
      ...(editing ? {} : { vendor_id: vendorId }),
    };
    try {
      await save.mutateAsync({ scheduleId: schedule?.schedule_id, body });
      toast.success(editing ? "Schedule updated." : "Schedule created.");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save the schedule."));
    }
  };

  const agreementOptions = [{ value: "", label: "No agreement" }].concat(
    (Array.isArray(agreements) ? agreements : agreements?.items || []).map((a) => ({
      value: String(a.agreement_id), label: `${a.title}${a.reference_no ? ` (${a.reference_no})` : ""} · ${a.status}`,
    })),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit recurring schedule" : "New recurring schedule"}
      subtitle="What this vendor bills every period. Each period's invoice is still uploaded and approved - the schedule only says what to expect."
      size="3xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={save.isPending}>{editing ? "Save changes" : "Create schedule"}</Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          {editing ? (
            <p className="text-sm text-slate-700"><span className="font-medium">Vendor:</span> {vendorLabel}</p>
          ) : (
            <>
              <p className="mb-1 text-sm font-medium text-slate-700">Vendor</p>
              <VendorPicker vendorId={vendorId} vendorLabel={vendorLabel} onSelect={(id, label) => { setVendorId(id); setVendorLabel(label); }} />
              {errors.vendor && <p className="mt-1 text-xs text-rose-600">{errors.vendor}</p>}
            </>
          )}
        </div>
        <FormInput label="Schedule name" name="name" value={form.name} onChange={set("name")} error={errors.name} />
        <FormSelect anchorOptions label="Agreement" name="agreement_id" options={agreementOptions} value={form.agreement_id} onChange={set("agreement_id")} />
        <FormSelect anchorOptions label="Billed" name="frequency" options={FREQUENCY_OPTIONS} value={form.frequency} onChange={set("frequency")} />
        <FormInput label="Invoice expected on day" name="expected_day" type="number" value={form.expected_day} onChange={set("expected_day")} error={errors.expected_day} />
        <FormInput label="Expected invoice total (₹, incl. GST)" name="expected_amount" type="number" value={form.expected_amount} onChange={set("expected_amount")} error={errors.expected_amount} />
        <FormInput label="Tolerance (%)" name="tolerance_pct" type="number" value={form.tolerance_pct} onChange={set("tolerance_pct")} error={errors.tolerance_pct} />
        <FormInput label="Start date" name="start_date" type="date" value={form.start_date} onChange={set("start_date")} error={errors.start_date} />
        <FormInput label="End date (optional)" name="end_date" type="date" value={form.end_date} onChange={set("end_date")} error={errors.end_date} />
        <FormInput label="Flag as missing after (days)" name="grace_days" type="number" value={form.grace_days} onChange={set("grace_days")} />
        <FormInput label="Text on the invoice that identifies it (optional)" name="match_keyword" value={form.match_keyword} onChange={set("match_keyword")}
          placeholder='e.g. "a/c 4417" when one vendor sends several bills' />
        <FormSelect anchorOptions label="Department" name="department_id" value={form.department_id} onChange={set("department_id")}
          options={[{ value: "", label: "Not set" }].concat(departments.filter((d) => d.is_active).map((d) => ({ value: String(d.id), label: `${d.code} — ${d.name}` })))} />
        <FormSelect anchorOptions label="Purchase category" name="purchase_category_id" value={form.purchase_category_id} onChange={set("purchase_category_id")}
          options={[{ value: "", label: form.department_id ? "Not set" : "Choose a department first" }].concat(
            categories.filter((c) => c.is_active).map((c) => ({ value: String(c.id), label: `${c.code} — ${c.name}` })))} />
        <FormSelect anchorOptions label="TDS nature of payment" name="payment_nature_code" value={form.payment_nature_code} onChange={set("payment_nature_code")}
          options={[{ value: "", label: "Use the category default" }].concat(natures.filter((n) => n.isActive).map((n) => ({ value: n.code, label: n.name || n.code })))} />
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm sm:col-span-2">
          <input type="checkbox" className="mt-0.5" checked={form.fast_track} onChange={set("fast_track")} />
          <span>
            <span className="font-medium text-slate-800">Fast-track approval</span>
            <span className="block text-xs text-slate-500">
              An invoice within the tolerance, under an active agreement, is approved automatically when sent. Finance still verifies TDS before payment.
            </span>
          </span>
        </label>
        <div className="sm:col-span-2">
          <FormTextArea label="Notes" name="notes" value={form.notes} onChange={set("notes")} rows={2} />
        </div>
      </div>
    </Modal>
  );
}

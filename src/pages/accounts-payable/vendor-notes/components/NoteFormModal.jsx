import { useState } from "react";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import VendorPicker from "../../vendor/components/VendorPicker";
import { formatMoney } from "../../dashboard/components/insights";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { validateDocumentFile } from "../../utils/documentUpload";
import { NOTE_TYPE } from "../../constants/vendorNotes";
import { useApplicableInvoices, useRecordNote } from "../hooks/useVendorNotes";

const today = () => new Date().toISOString().slice(0, 10);

/** Field errors before saving - same rules as the backend. */
export function validateNote(form, noteType, vendorId) {
  const errors = {};
  if (!vendorId) errors.vendor = "Choose the vendor";
  if (!form.note_number.trim()) errors.note_number = "Required";
  if (!form.note_date) errors.note_date = "Required";
  else if (form.note_date > today()) errors.note_date = "Cannot be in the future";
  if (form.reason.trim().length < 5) errors.reason = "Say why (at least 5 characters)";
  if (!(Number(form.taxable_value) > 0)) errors.taxable_value = "Enter the value before GST";
  const gst = ["cgst", "sgst", "igst"].reduce((s, k) => s + (Number(form[k]) || 0), 0);
  if (noteType === "DEBIT_NOTE" && gst > 0) errors.igst = "A debit note we raise carries no GST";
  if ((Number(form.cgst) || Number(form.sgst)) && Number(form.igst)) errors.igst = "Use CGST + SGST or IGST, not both";
  return errors;
}

export default function NoteFormModal({ noteType, onClose }) {
  const [vendorId, setVendorId] = useState(null);
  const [vendorLabel, setVendorLabel] = useState("");
  const [form, setForm] = useState({ note_number: "", note_date: today(), reason: "", taxable_value: "", cgst: "", sgst: "", igst: "",
    reference_invoice_id: "", apply_to_invoice_id: "" });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const record = useRecordNote();
  const { data: invoices = [] } = useApplicableInvoices(vendorId);
  const spec = NOTE_TYPE[noteType];
  const isCredit = noteType === "CREDIT_NOTE";
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const total = ["taxable_value", "cgst", "sgst", "igst"].reduce((s, k) => s + (Number(form[k]) || 0), 0);

  const invoiceOptions = (placeholder) => [{ value: "", label: placeholder }].concat(
    invoices.map((i) => ({ value: String(i.invoice_id), label: `${i.invoice_number} · ${formatDate(i.invoice_date)} · owed ${formatMoney(i.outstanding, "INR")}` })));

  const submit = async () => {
    const found = validateNote(form, noteType, vendorId);
    if (file) {
      const problem = validateDocumentFile(file);
      if (problem) found.file = problem;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    const payload = {
      note_type: noteType, vendor_id: vendorId, note_number: form.note_number.trim(), note_date: form.note_date,
      reason: form.reason.trim(), taxable_value: form.taxable_value, cgst: form.cgst || 0, sgst: form.sgst || 0, igst: form.igst || 0,
      reference_invoice_id: form.reference_invoice_id ? Number(form.reference_invoice_id) : null,
      apply_to_invoice_id: form.apply_to_invoice_id ? Number(form.apply_to_invoice_id) : null,
    };
    try {
      const result = await record.mutateAsync({ payload, file });
      toast.success(result.status === "APPLIED" ? `${spec.label} recorded and applied.${result.tds_note ? ` ${result.tds_note}` : ""}` : `${spec.label} recorded.`);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Could not record the ${spec.label.toLowerCase()}.`));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isCredit ? "Record a vendor credit note" : "Raise a debit note"} subtitle={spec.hint} size="3xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-600">Note total <span className="font-semibold tabular-nums text-slate-800">{formatMoney(total, "INR")}</span></span>
          <span className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={submit} loading={record.isPending}>Save</Button>
          </span>
        </div>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="mb-1 text-sm font-medium text-slate-700">Vendor</p>
          <VendorPicker vendorId={vendorId} vendorLabel={vendorLabel} onSelect={(id, label) => { setVendorId(id); setVendorLabel(label); }} />
          {errors.vendor && <p className="mt-1 text-xs text-rose-600">{errors.vendor}</p>}
        </div>
        <FormInput label={isCredit ? "Credit note number (vendor's)" : "Debit note number"} name="note_number" value={form.note_number} onChange={set("note_number")} error={errors.note_number} />
        <FormInput label="Note date" name="note_date" type="date" value={form.note_date} onChange={set("note_date")} error={errors.note_date} />
        <FormSelect anchorOptions label="Corrects invoice (optional)" name="reference_invoice_id" value={form.reference_invoice_id}
          onChange={set("reference_invoice_id")} options={invoiceOptions(vendorId ? "Not linked to one invoice" : "Choose a vendor first")} />
        <FormSelect anchorOptions label="Apply now to" name="apply_to_invoice_id" value={form.apply_to_invoice_id}
          onChange={set("apply_to_invoice_id")} options={invoiceOptions("Keep open - apply later")} />
        <FormInput label="Value before GST (₹)" name="taxable_value" type="number" value={form.taxable_value} onChange={set("taxable_value")} error={errors.taxable_value} />
        {isCredit ? (
          <div className="grid grid-cols-3 gap-2">
            <FormInput label="CGST" name="cgst" type="number" value={form.cgst} onChange={set("cgst")} />
            <FormInput label="SGST" name="sgst" type="number" value={form.sgst} onChange={set("sgst")} />
            <FormInput label="IGST" name="igst" type="number" value={form.igst} onChange={set("igst")} error={errors.igst} />
          </div>
        ) : (
          <p className="self-end text-xs text-slate-500">No GST on a debit note we raise - the vendor's credit note carries it.</p>
        )}
        <div className="sm:col-span-2">
          <FormTextArea label="Reason" name="reason" value={form.reason} onChange={set("reason")} rows={2} />
          {errors.reason && <p className="mt-1 text-xs text-rose-600">{errors.reason}</p>}
        </div>
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">{isCredit ? "Vendor's credit note (PDF / image)" : "Debit note copy (optional)"}</span>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="mt-1 block text-xs" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {errors.file && <span className="text-xs text-rose-600">{errors.file}</span>}
        </label>
      </div>
    </Modal>
  );
}

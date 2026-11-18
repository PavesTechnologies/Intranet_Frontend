import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import {
  errorMessage,
  supplementaryPaymentService,
  unwrap,
  unwrapList,
} from "@/pages/expense-management/api/supplementaryClaimApi";

// Mirrors the backend PaymentMethod enum that AP records.
const AP_METHOD_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank transfer (NEFT/RTGS/IMPS)" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

const EMPTY_FORM = { bankReference: "", paymentMethod: "BANK_TRANSFER", paymentDate: "", amountPaid: "", remarks: "" };

/**
 * AP queue for supplementary claims approved by Finance. Recording a payment settles the claim; the backend refuses a second
 * payment for the same request and any bank reference that is already used.
 */
export default function ApSupplementaryPaymentsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await supplementaryPaymentService.queue();
      setRows(unwrapList(res));
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Could not load the payment queue."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = (row) => {
    setOpenId(row.paymentId);
    setForm({ ...EMPTY_FORM, amountPaid: String(row.amount ?? ""), paymentDate: new Date().toISOString().slice(0, 10) });
    setFormError("");
  };

  const confirm = async (e) => {
    e.preventDefault();
    setFormError("");
    if (form.bankReference.trim().length < 6) return setFormError("Enter the bank reference (at least 6 characters).");
    if (!form.paymentDate) return setFormError("Enter the payment date.");
    const amount = Number(form.amountPaid);
    if (!(amount > 0)) return setFormError("Enter the amount paid.");
    setSaving(true);
    try {
      const res = await supplementaryPaymentService.confirm(openId, {
        bankReference: form.bankReference.trim(),
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        amountPaid: amount,
        remarks: form.remarks.trim() || null,
      });
      unwrap(res);
      showStatusToast("Payment recorded. The claim is settled.", "success");
      setOpenId(null);
      setLoading(true);
      await load();
    } catch (err) {
      setFormError(errorMessage(err, "Could not record the payment."));
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/expense-management/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold text-[#0a174e]">Supplementary claims to pay</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Claims Finance has approved. Record the bank payment here; the claim is settled only after you confirm it.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">No supplementary payments are waiting.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.paymentId} className="space-y-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{r.claimNumber} · {r.employeeId}</p>
                    <p className="text-xs text-gray-500">
                      {Number(r.amount).toFixed(2)} {r.currencyCode} · requested by {r.requestedBy}
                    </p>
                  </div>
                  {openId !== r.paymentId && (
                    <Button variant="primary" size="small" onClick={() => open(r)}>
                      <CheckCircle2 size={14} aria-hidden="true" /> Record payment
                    </Button>
                  )}
                </div>

                {openId === r.paymentId && (
                  <form onSubmit={confirm} className="grid grid-cols-1 gap-3 rounded-md bg-gray-50 p-3 sm:grid-cols-2" noValidate>
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">Bank reference</span>
                      <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={form.bankReference}
                        onChange={(e) => setForm({ ...form, bankReference: e.target.value })} maxLength={100} />
                    </label>
                    <FormSelect label="Payment method" name="paymentMethod" value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} options={AP_METHOD_OPTIONS} />
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">Payment date</span>
                      <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2" value={form.paymentDate}
                        onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">Amount paid</span>
                      <input type="number" min="0.01" step="0.01" className="w-full rounded-md border border-gray-300 px-3 py-2"
                        value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="mb-1 block text-gray-600">Remarks (optional)</span>
                      <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={form.remarks} maxLength={500}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                    </label>
                    {formError && <p className="text-sm text-red-600 sm:col-span-2" role="alert">{formError}</p>}
                    <div className="flex gap-2 sm:col-span-2">
                      <Button variant="primary" size="small" type="submit" disabled={saving}>Confirm payment</Button>
                      <Button variant="outline" size="small" type="button" onClick={() => setOpenId(null)} disabled={saving}>Cancel</Button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

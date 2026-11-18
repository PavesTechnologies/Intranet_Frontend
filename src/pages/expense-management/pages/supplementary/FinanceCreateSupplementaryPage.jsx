import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import {
  LATE_REASON_OPTIONS,
  errorMessage,
  supplementaryClaimService,
  unwrap,
} from "@/pages/expense-management/api/supplementaryClaimApi";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finance creates a supplementary claim on an employee's behalf. The employee must acknowledge it before it can be
 * submitted; acknowledging is not an approval. Both the role and the create permission are checked by the backend.
 */
export default function FinanceCreateSupplementaryPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    employeeId: "",
    reportId: "",
    lateReasonCode: "",
    lateReasonText: "",
    creationReason: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.employeeId.trim()) return setError("Enter the employee's id.");
    if (!UUID_PATTERN.test(form.reportId.trim())) return setError("Enter the id of the employee's settled report.");
    if (!form.lateReasonCode) return setError("Choose the reason the expense is missing.");
    if (form.creationReason.trim().length < 5) return setError("Give a reason for creating this claim for the employee.");
    setSaving(true);
    try {
      const created = unwrap(
        await supplementaryClaimService.createOnBehalf({
          employeeId: form.employeeId.trim(),
          reportId: form.reportId.trim(),
          lateReasonCode: form.lateReasonCode,
          lateReasonText: form.lateReasonText.trim() || null,
          creationReason: form.creationReason.trim(),
        }),
      );
      showStatusToast("Claim created. The employee needs to acknowledge it before it is submitted.", "success");
      navigate(`/expense-management/finance/supplementary-claims/${created.claimId}`);
    } catch (err) {
      setError(errorMessage(err, "Could not create the claim."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <button type="button" onClick={() => navigate("/expense-management/finance/supplementary-claims")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold text-[#0a174e]">Create a supplementary claim for an employee</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Use this when an employee's missing expense was found by Finance. The employee must acknowledge the claim before it goes to their manager.
        </p>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6" noValidate>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Employee id</span>
          <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={form.employeeId} onChange={set("employeeId")} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Settled report id</span>
          <input className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs" value={form.reportId} onChange={set("reportId")} />
        </label>
        <FormSelect
          label="Why is the expense missing?"
          name="lateReasonCode"
          value={form.lateReasonCode}
          onChange={set("lateReasonCode")}
          options={LATE_REASON_OPTIONS}
          placeholder="Select a reason"
        />
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-gray-600">Explanation</span>
          <textarea rows={2} maxLength={2000} className="w-full rounded-md border border-gray-300 px-3 py-2" value={form.lateReasonText} onChange={set("lateReasonText")} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-gray-600">Why are you creating it for the employee?</span>
          <textarea rows={2} maxLength={500} className="w-full rounded-md border border-gray-300 px-3 py-2" value={form.creationReason} onChange={set("creationReason")} />
        </label>
        {error && <p className="text-sm text-red-600 sm:col-span-2" role="alert">{error}</p>}
        <div className="sm:col-span-2">
          <Button variant="primary" size="small" type="submit" disabled={saving}>Create claim</Button>
        </div>
      </form>
    </div>
  );
}

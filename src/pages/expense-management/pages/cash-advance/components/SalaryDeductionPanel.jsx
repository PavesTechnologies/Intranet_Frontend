import React, { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { recoveryApi } from "@/pages/expense-management/api/recoveryApi";
import { Field, confirmationInputClass } from "@/pages/expense-management/components/disbursement/DisbursementConfirmationFields";
import {
  EMAIL_STATUS_LABEL,
  EVIDENCE_TYPE_OPTIONS,
  SALARY_STATUS_LABEL,
  buildResultFormData,
  shortfallOf,
  validateRequestAmount,
  validateResult,
} from "@/pages/expense-management/pages/cash-advance/components/salaryDeduction";

const formatMoney = (amount, currency) =>
  `${currency || "INR"} ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_RESULT = {
  actualAmount: "",
  payrollMonthProcessed: "",
  payrollReference: "",
  evidenceType: "",
  evidenceNote: "",
  evidenceFile: null,
};

/**
 * Finance requests a salary deduction for an advance: amount and payroll month only. The request goes to payroll by
 * email. Payroll's result is recorded later, with a reference or alternative evidence. Only the actual amount posts.
 */
export default function SalaryDeductionPanel({ advanceId, outstanding, currencyCode, onChanged }) {
  const [months, setMonths] = useState([]);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState(String(outstanding ?? ""));
  const [payrollMonth, setPayrollMonth] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [openResultId, setOpenResultId] = useState(null);
  const [result, setResult] = useState(EMPTY_RESULT);
  const [resultErrors, setResultErrors] = useState({});
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await recoveryApi.listSalaryDeductions(advanceId);
      setRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not load salary deduction requests", "error");
    }
  }, [advanceId]);

  useEffect(() => {
    load();
    recoveryApi
      .payrollMonths()
      .then((list) => {
        const options = Array.isArray(list) ? list : [];
        setMonths(options);
        setPayrollMonth((current) => current || options[0]?.value || "");
      })
      .catch(() => setMonths([]));
  }, [load]);

  useEffect(() => {
    setAmount(String(outstanding ?? ""));
  }, [outstanding]);

  const notify = async (message) => {
    showStatusToast(message, "success");
    await load();
    onChanged?.();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = {};
    const amountError = validateRequestAmount(amount, outstanding);
    if (amountError) next.amount = amountError;
    if (!payrollMonth) next.payrollMonth = "Select the payroll month.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const created = await recoveryApi.createSalaryDeduction(advanceId, { amount: Number(amount), payrollMonth });
      await notify(`Salary deduction ${created?.payrollRequestId || ""} created. Payroll has been emailed.`);
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not create the salary deduction", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (request) => {
    try {
      await recoveryApi.retrySalaryEmail(request.salaryDeductionRequestId);
      await notify(`${request.payrollRequestId}: email queued again.`);
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not send the email again", "error");
    }
  };

  const handleCancel = async (request) => {
    if (!cancelReason.trim()) {
      showStatusToast("Enter the reason for cancelling the request.", "error");
      return;
    }
    try {
      await recoveryApi.cancelSalaryDeduction(request.salaryDeductionRequestId, cancelReason.trim());
      setCancelId(null);
      setCancelReason("");
      await notify(`${request.payrollRequestId} cancelled.`);
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not cancel the request", "error");
    }
  };

  const openResult = (request) => {
    setOpenResultId(request.salaryDeductionRequestId);
    setResult({ ...EMPTY_RESULT, actualAmount: String(request.requestedAmount ?? ""), payrollMonthProcessed: request.payrollMonth });
    setResultErrors({});
  };

  const handleResult = async (request) => {
    const problems = validateResult(result, request.requestedAmount);
    setResultErrors(problems);
    if (Object.keys(problems).length > 0) return;
    try {
      await recoveryApi.recordSalaryResult(request.salaryDeductionRequestId, buildResultFormData(result));
      setOpenResultId(null);
      await notify(`${request.payrollRequestId}: Payroll result recorded.`);
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not record the Payroll result", "error");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="salary-amount" label={`Amount to deduct (max ${formatMoney(outstanding, currencyCode)})`} error={errors.amount}>
          <input
            id="salary-amount"
            type="number"
            min="0"
            step="0.01"
            className={confirmationInputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field id="salary-month" label="Payroll month" error={errors.payrollMonth}>
          <select id="salary-month" className={confirmationInputClass} value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end justify-end md:col-span-2">
          <Button type="submit" variant="success" disabled={submitting} loading={submitting}>
            Send to Payroll
          </Button>
        </div>
      </form>

      {requests.length === 0 ? (
        <p className="text-xs text-gray-500">No salary deduction requests for this advance yet.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.salaryDeductionRequestId} className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-gray-900">
                  {request.payrollRequestId} · {formatMoney(request.requestedAmount, currencyCode)} · payroll {request.payrollMonth}
                </p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                  {SALARY_STATUS_LABEL[request.status] || request.status}
                </span>
              </div>
              <p className="mt-1 text-gray-600">
                Email: {EMAIL_STATUS_LABEL[request.emailStatus] || request.emailStatus}
                {request.sentAt ? ` · delivered ${new Date(request.sentAt).toLocaleString("en-IN")}` : ""}
                {request.requestedBy === "SYSTEM" ? " · raised automatically when payment was not received" : ""}
              </p>

              {request.outcomeRecorded && (
                <p className="mt-1 text-emerald-800">
                  Deducted {formatMoney(request.actualAmountDeducted, currencyCode)}
                  {shortfallOf(request.requestedAmount, request.actualAmountDeducted) > 0
                    ? ` · shortfall ${formatMoney(shortfallOf(request.requestedAmount, request.actualAmountDeducted), currencyCode)}`
                    : ""}
                  {request.payrollReference ? ` · Payroll ref ${request.payrollReference}` : ` · evidence ${request.evidenceType || ""}`}
                </p>
              )}
              {request.cancellationReason && <p className="mt-1 text-gray-600">Cancelled: {request.cancellationReason}</p>}

              <div className="mt-2 flex flex-wrap gap-2">
                {request.canRetryEmail && (
                  <Button type="button" variant="outline" size="small" onClick={() => handleRetry(request)}>
                    Send email again
                  </Button>
                )}
                {request.canRecordResult && (
                  <Button type="button" variant="outline" size="small" onClick={() => openResult(request)}>
                    Record Payroll result
                  </Button>
                )}
                {request.canCancel && (
                  <Button type="button" variant="outline" size="small" onClick={() => setCancelId(request.salaryDeductionRequestId)}>
                    Cancel request
                  </Button>
                )}
              </div>

              {cancelId === request.salaryDeductionRequestId && (
                <div className="mt-2 space-y-2 rounded-md bg-amber-50 p-2">
                  <p className="text-amber-800">
                    {request.sentToPayroll
                      ? "This request already reached Payroll. Cancelling does not stop Payroll; you must record the result afterwards."
                      : "The request has not reached Payroll yet, so it is withdrawn."}
                  </p>
                  <input
                    aria-label="Cancellation reason"
                    className={confirmationInputClass}
                    placeholder="Reason"
                    maxLength={500}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <Button type="button" variant="success" size="small" onClick={() => handleCancel(request)}>
                    Confirm cancellation
                  </Button>
                </div>
              )}

              {openResultId === request.salaryDeductionRequestId && (
                <div className="mt-3 space-y-3 rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                  <p className="font-semibold text-gray-900">Payroll result</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id={`result-amount-${request.payrollRequestId}`} label="Amount actually deducted" error={resultErrors.actualAmount}>
                      <input
                        id={`result-amount-${request.payrollRequestId}`}
                        type="number"
                        min="0"
                        step="0.01"
                        className={confirmationInputClass}
                        value={result.actualAmount}
                        onChange={(e) => setResult({ ...result, actualAmount: e.target.value })}
                      />
                    </Field>
                    <Field id={`result-month-${request.payrollRequestId}`} label="Payroll month processed" error={resultErrors.payrollMonthProcessed}>
                      <input
                        id={`result-month-${request.payrollRequestId}`}
                        type="text"
                        className={confirmationInputClass}
                        value={result.payrollMonthProcessed}
                        onChange={(e) => setResult({ ...result, payrollMonthProcessed: e.target.value })}
                      />
                    </Field>
                    <Field id={`result-ref-${request.payrollRequestId}`} label="Payroll confirmation reference" required={false}>
                      <input
                        id={`result-ref-${request.payrollRequestId}`}
                        type="text"
                        maxLength={100}
                        className={confirmationInputClass}
                        value={result.payrollReference}
                        onChange={(e) => setResult({ ...result, payrollReference: e.target.value })}
                      />
                    </Field>
                    <Field id={`result-evidence-type-${request.payrollRequestId}`} label="Evidence type (if no reference)" required={false} error={resultErrors.evidenceType}>
                      <select
                        id={`result-evidence-type-${request.payrollRequestId}`}
                        className={confirmationInputClass}
                        value={result.evidenceType}
                        onChange={(e) => setResult({ ...result, evidenceType: e.target.value })}
                      >
                        <option value="">Select</option>
                        {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field id={`result-file-${request.payrollRequestId}`} label="Evidence file (PDF, JPG or PNG)" required={false} error={resultErrors.evidence}>
                      <input
                        id={`result-file-${request.payrollRequestId}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="block w-full text-sm text-gray-700"
                        onChange={(e) => setResult({ ...result, evidenceFile: e.target.files?.[0] || null })}
                      />
                    </Field>
                    <Field id={`result-note-${request.payrollRequestId}`} label="Evidence note" required={false}>
                      <input
                        id={`result-note-${request.payrollRequestId}`}
                        type="text"
                        maxLength={500}
                        className={confirmationInputClass}
                        value={result.evidenceNote}
                        onChange={(e) => setResult({ ...result, evidenceNote: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="small" onClick={() => setOpenResultId(null)}>
                      Close
                    </Button>
                    <Button type="button" variant="success" size="small" onClick={() => handleResult(request)}>
                      Record result
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

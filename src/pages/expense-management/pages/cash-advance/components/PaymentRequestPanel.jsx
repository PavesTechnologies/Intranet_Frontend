import React, { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import FinancePayout, { todayIso, useFinancePayout } from "@/components/settlement/FinancePayout";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { recoveryApi } from "@/pages/expense-management/api/recoveryApi";
import DisbursementConfirmationFields, {
  Field,
  confirmationInputClass,
} from "@/pages/expense-management/components/disbursement/DisbursementConfirmationFields";
import {
  DISBURSEMENT_MODE,
  EMPTY_DISBURSEMENT_CONFIRMATION,
  buildDisbursementFormData,
  validateDisbursementConfirmation,
} from "@/pages/expense-management/components/disbursement/disbursementConfirmation";
import { validateRequestAmount } from "@/pages/expense-management/pages/cash-advance/components/salaryDeduction";

const REPAY_MODES = [DISBURSEMENT_MODE.CASH, DISBURSEMENT_MODE.BANK_TRANSFER, DISBURSEMENT_MODE.UPI];

const formatMoney = (amount, currency) =>
  `${currency || "INR"} ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (value) => (value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-");

const freshConfirmation = () => ({ ...EMPTY_DISBURSEMENT_CONFIRMATION, transferDate: todayIso() });

/**
 * Step one of settling a balance: Finance asks the employee to pay. The employee is emailed and notified with a due
 * date of one working day. When Finance records the payment, its mode and proof are kept on the repayment. If the
 * due time passes unpaid, the system raises a salary deduction automatically.
 */
export default function PaymentRequestPanel({ advanceId, outstanding, currencyCode, onChanged }) {
  const [notice, setNotice] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [amount, setAmount] = useState(String(outstanding ?? ""));
  const [confirmation, setConfirmation] = useState(freshConfirmation);
  const [sameAsDisbursement, setSameAsDisbursement] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);

  const payout = useFinancePayout(advanceId, true);
  const lockedMode = sameAsDisbursement && payout?.mode ? payout.mode : null;

  useEffect(() => {
    if (lockedMode) setConfirmation((prev) => ({ ...prev, mode: lockedMode }));
  }, [lockedMode]);

  useEffect(() => {
    setAmount(String(outstanding ?? ""));
  }, [outstanding]);

  const load = useCallback(async () => {
    try {
      const cases = await recoveryApi.listOpenNotices();
      const mine = (Array.isArray(cases) ? cases : []).filter(
        (c) => c.advanceId === advanceId && (c.status === "NOTICE_SENT" || c.status === "SENT_TO_PAYROLL"),
      );
      setNotice(mine[0] || null);
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not load the payment request", "error");
    } finally {
      setLoaded(true);
    }
  }, [advanceId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    await load();
    onChanged?.();
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const sent = await recoveryApi.sendPaymentRequest(advanceId);
      showStatusToast(`Payment request sent. Due ${formatDateTime(sent?.dueAt)}.`, "success", 6000);
      await refresh();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not send the payment request", "error");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      showStatusToast("Enter the reason for cancelling the payment request.", "error");
      return;
    }
    try {
      await recoveryApi.cancelNotice(notice.recoveryCaseId, cancelReason.trim());
      setCancelling(false);
      setCancelReason("");
      showStatusToast("Payment request cancelled. The balance is unchanged.", "success");
      await refresh();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not cancel the payment request", "error");
    }
  };

  const handleRecord = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = { ...validateDisbursementConfirmation(confirmation) };
    const amountError = validateRequestAmount(amount, outstanding);
    if (amountError) next.amount = amountError;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const formData = buildDisbursementFormData(confirmation);
      formData.append("amount", String(Number(amount)));
      if (remarks.trim()) formData.append("notes", remarks.trim());
      await cashAdvanceApi.repay(advanceId, formData);
      showStatusToast("Payment from employee recorded.", "success");
      setConfirmation(freshConfirmation());
      setRemarks("");
      setRecording(false);
      await refresh();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to record the payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) {
    return <div className="h-16 animate-pulse rounded-lg bg-gray-100" />;
  }

  if (!notice) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-gray-700">
          <p className="font-semibold text-gray-900">Ask the employee to pay the balance</p>
          <p>
            The employee is emailed and notified to pay {formatMoney(outstanding, currencyCode)}, due in one working day. If it
            is not paid by then, a salary deduction request is raised automatically.
          </p>
        </div>
        <Button type="button" variant="primary" size="small" onClick={handleSend} disabled={sending} loading={sending}>
          Send payment request
        </Button>
      </div>
    );
  }

  const automaticallyRaised = notice.status === "SENT_TO_PAYROLL";

  return (
    <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-gray-900">
            Payment request {automaticallyRaised ? "overdue" : "sent"} · {formatMoney(notice.amountAtNotice, currencyCode)}
          </p>
          <p className="text-gray-700">
            Sent {formatDateTime(notice.noticeSentAt)} · due {formatDateTime(notice.dueAt)}
          </p>
          {automaticallyRaised ? (
            <p className="text-amber-800">Not paid by the due time. A salary deduction request was raised automatically (see below).</p>
          ) : (
            <p className="text-gray-700">If not paid by the due time, a salary deduction request is raised automatically.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="success" size="small" onClick={() => setRecording((v) => !v)}>
            {recording ? "Hide payment form" : "Record payment received"}
          </Button>
          {notice.status === "NOTICE_SENT" && (
            <Button type="button" variant="outline" size="small" onClick={() => setCancelling((v) => !v)}>
              Cancel payment request
            </Button>
          )}
        </div>
      </div>

      {cancelling && (
        <div className="space-y-2 rounded-md bg-amber-50 p-3">
          <input
            aria-label="Cancellation reason"
            className={confirmationInputClass}
            placeholder="Reason for cancelling the payment request"
            maxLength={500}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <Button type="button" variant="success" size="small" onClick={handleCancel}>
            Confirm cancellation
          </Button>
        </div>
      )}

      {recording && (
        <form onSubmit={handleRecord} noValidate className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">Payment received from the employee</p>
          <FinancePayout payout={payout} sameMode={sameAsDisbursement} onSameModeChange={setSameAsDisbursement} />
          <Field id="repay-amount" label={`Amount received (max ${formatMoney(outstanding, currencyCode)})`} error={errors.amount}>
            <input
              id="repay-amount"
              type="number"
              min="0"
              step="0.01"
              className={confirmationInputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <DisbursementConfirmationFields
            values={confirmation}
            errors={errors}
            modes={lockedMode ? [lockedMode] : REPAY_MODES}
            onFieldChange={(key, value) => setConfirmation((prev) => ({ ...prev, [key]: value }))}
          />
          <Field id="repay-remarks" label="Remarks" required={false}>
            <textarea
              id="repay-remarks"
              rows={2}
              maxLength={500}
              className={confirmationInputClass}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="success" disabled={submitting} loading={submitting}>
              Record payment
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

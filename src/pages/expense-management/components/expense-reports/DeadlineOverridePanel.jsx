import React, { useState } from "react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  buildDeadlineOverrideRequest,
  DEADLINE_OVERRIDE_ACTION,
  deadlineOverrideApi,
  MIN_REASON_LENGTH,
} from "@/pages/expense-management/api/deadlineOverrideApi";
import { formatDeadlineDate, todayIsoDate } from "@/pages/expense-management/components/expense-reports/submissionDeadline";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20";

/**
 * Finance control to extend or reopen a draft report's submission deadline. The reason is required and kept in the
 * audit log. The server re-checks every rule (own report, draft status, dates, reason length).
 */
export default function DeadlineOverridePanel({ reportId, currentDeadline, onApplied }) {
  const [action, setAction] = useState(DEADLINE_OVERRIDE_ACTION.EXTEND);
  const [extendedUntil, setExtendedUntil] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    let body;
    try {
      body = buildDeadlineOverrideRequest({ action, extendedUntil, reason });
    } catch (err) {
      setError(err.message);
      return;
    }

    setSubmitting(true);
    try {
      await deadlineOverrideApi.apply(reportId, body);
      showStatusToast(
        action === DEADLINE_OVERRIDE_ACTION.EXTEND
          ? "Submission deadline extended. The reason is in the audit log."
          : "Report reopened for submission. The reason is in the audit log.",
        "success",
      );
      setReason("");
      setExtendedUntil("");
      onApplied?.();
    } catch (err) {
      setError(err.response?.data?.message || "The deadline could not be changed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-700">
        <span>Finance deadline override</span>
        {currentDeadline && <span className="text-gray-500">(current: {formatDeadlineDate(currentDeadline)})</span>}
      </div>

      <div role="radiogroup" aria-label="Override action" className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="deadline-override-action"
            value={DEADLINE_OVERRIDE_ACTION.EXTEND}
            checked={action === DEADLINE_OVERRIDE_ACTION.EXTEND}
            onChange={() => setAction(DEADLINE_OVERRIDE_ACTION.EXTEND)}
          />
          Extend deadline
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="deadline-override-action"
            value={DEADLINE_OVERRIDE_ACTION.REOPEN}
            checked={action === DEADLINE_OVERRIDE_ACTION.REOPEN}
            onChange={() => setAction(DEADLINE_OVERRIDE_ACTION.REOPEN)}
          />
          Reopen (lift the deadline check)
        </label>
      </div>

      {action === DEADLINE_OVERRIDE_ACTION.EXTEND && (
        <div>
          <label htmlFor="deadline-override-date" className="block text-xs font-medium text-gray-700">
            New submission date
          </label>
          <input
            id="deadline-override-date"
            type="date"
            min={todayIsoDate()}
            className={inputClass}
            value={extendedUntil}
            onChange={(e) => setExtendedUntil(e.target.value)}
          />
        </div>
      )}

      <div>
        <label htmlFor="deadline-override-reason" className="block text-xs font-medium text-gray-700">
          Reason (at least {MIN_REASON_LENGTH} characters, kept in the audit log)
        </label>
        <textarea
          id="deadline-override-reason"
          rows={2}
          maxLength={500}
          className={inputClass}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="outline" disabled={submitting} loading={submitting} loadingText="Saving...">
          {action === DEADLINE_OVERRIDE_ACTION.EXTEND ? "Extend deadline" : "Reopen report"}
        </Button>
      </div>
    </form>
  );
}

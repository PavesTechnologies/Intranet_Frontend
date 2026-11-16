/**
 * Expense report submission deadline. Deadline = estimated trip/meeting end date + N days, where N
 * is the configured `expense.submission.deadline-days` (default 30). The backend owns the
 * configured value and returns it on the report as `submissionDeadlineDays`; this file only
 * computes and displays from it, so employees never need the admin-only settings endpoint.
 */

export const DEFAULT_SUBMISSION_DEADLINE_DAYS = 30;

// Statuses that still need the employee to submit. Once submitted or approved the deadline no longer applies.
const PRE_SUBMISSION_STATUSES = ["DRAFT"];

const toDateOnly = (value) => {
  if (!value) return null;
  // Date-only strings (YYYY-MM-DD) are parsed as local dates so they do not shift a day in negative offsets.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const d = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Returns the Date the report must be submitted by (end of that day), or null without a trip end date. */
export const computeSubmissionDeadline = (tripEndDate, days = DEFAULT_SUBMISSION_DEADLINE_DAYS) => {
  const end = toDateOnly(tripEndDate);
  if (!end) return null;
  const deadline = new Date(end);
  deadline.setDate(deadline.getDate() + (Number(days) || DEFAULT_SUBMISSION_DEADLINE_DAYS));
  return deadline;
};

/**
 * Deadline state for one report. Returns null when there is nothing to show (no trip end date, or the
 * report is already past the submission stage).
 */
export const getSubmissionDeadlineInfo = (report, now = new Date()) => {
  if (!report) return null;
  const status = (report.reportStatus || "DRAFT").toUpperCase();
  if (!PRE_SUBMISSION_STATUSES.includes(status)) return null;

  const days = report.submissionDeadlineDays ?? DEFAULT_SUBMISSION_DEADLINE_DAYS;
  // The backend's deadline is authoritative: it is null when no clock is running (advance not yet disbursed, or reopened).
  const deadline =
    "submissionDeadline" in report
      ? toDateOnly(report.submissionDeadline)
      : computeSubmissionDeadline(report.tripEndDate, days);
  if (!deadline) return null;

  const today = toDateOnly(now);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.round((deadline - today) / msPerDay);
  return { deadline, daysRemaining, isOverdue: daysRemaining < 0 };
};

/** Validation for the trip date pair entered on a report. Returns an error message or "". */
export const validateTripDates = (tripStartDate, tripEndDate) => {
  if (!tripStartDate) return "Enter the trip or client meeting start date.";
  if (!tripEndDate) return "Enter the estimated trip end date.";
  if (toDateOnly(tripEndDate) < toDateOnly(tripStartDate)) return "The end date cannot be before the start date.";
  return "";
};

export const formatDeadlineDate = (date) =>
  date ? date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" }) : "—";

/**
 * UI guard for submit: the message to show when the deadline has passed, or null when submit may proceed.
 * The backend enforces the same rule on the submit call; this only spares the user a round trip.
 */
export const getOverdueSubmitBlockMessage = (deadlineInfo) =>
  deadlineInfo?.isOverdue
    ? `The submission deadline passed on ${formatDeadlineDate(deadlineInfo.deadline)}. This report can no longer be submitted.`
    : null;

/** Today as YYYY-MM-DD for date inputs. Used to stop an override date from being set in the past. */
export const todayIsoDate = (now = new Date()) => {
  const d = toDateOnly(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

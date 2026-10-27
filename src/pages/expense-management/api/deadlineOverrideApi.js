import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

/**
 * Finance deadline override for an expense report (POST /xms/finance/expense-reports/{id}/deadline-override).
 * EXTEND moves the submission deadline to a date; REOPEN lifts the check. Both need a reason of at least
 * MIN_REASON_LENGTH characters, which the server stores in the audit log. The server re-checks every rule.
 */

export const DEADLINE_OVERRIDE_ACTION = {
  EXTEND: "EXTEND",
  REOPEN: "REOPEN",
};

export const MIN_REASON_LENGTH = 10;

export class DeadlineOverrideError extends Error {
  constructor(message) {
    super(message);
    this.name = "DeadlineOverrideError";
  }
}

const toIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

const startOfToday = (now = new Date()) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

/**
 * Builds the request body. Throws DeadlineOverrideError with the reason when the override cannot be sent, so the
 * form can show it instead of waiting for the server to refuse it.
 */
export const buildDeadlineOverrideRequest = ({ action, extendedUntil, reason }, now = new Date()) => {
  const trimmedReason = String(reason || "").trim();
  if (trimmedReason.length < MIN_REASON_LENGTH) {
    throw new DeadlineOverrideError(`Give a reason of at least ${MIN_REASON_LENGTH} characters for the override.`);
  }

  if (action === DEADLINE_OVERRIDE_ACTION.EXTEND) {
    const date = toIsoDate(extendedUntil);
    if (!date) {
      throw new DeadlineOverrideError("Enter the new submission date for the extension.");
    }
    if (date < startOfToday(now)) {
      throw new DeadlineOverrideError("The extended deadline cannot be in the past.");
    }
    return { action, extendedUntil, reason: trimmedReason };
  }

  if (action === DEADLINE_OVERRIDE_ACTION.REOPEN) {
    if (extendedUntil) {
      throw new DeadlineOverrideError("A reopen does not take a date.");
    }
    return { action, reason: trimmedReason };
  }

  throw new DeadlineOverrideError("Choose whether to extend the deadline or reopen the report.");
};

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const deadlineOverrideApi = {
  apply: (reportId, body) =>
    api.post(`/xms/finance/expense-reports/${reportId}/deadline-override`, body, {
      baseURL: XMS_BASE_URL,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    }),
};

export default deadlineOverrideApi;

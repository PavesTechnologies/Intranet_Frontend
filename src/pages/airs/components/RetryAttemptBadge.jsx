import React from "react";

// Shown only while a task is actually mid-retry. The numbers are the
// TASK-level budget (retry_count/max_attempts) — the stage rows carry their own
// attempt_number/max_attempts against a different reference point, and mixing
// the two side by side reads as contradictory.
// retry_count is how many retries have already happened, so the attempt now in
// flight is retry_count + 1.
export default function RetryAttemptBadge({ status, retryCount, maxAttempts, className = "" }) {
  if (String(status || "").toUpperCase() !== "RETRY") return null;
  if (maxAttempts === null || maxAttempts === undefined) return null;

  return (
    <span className={`text-[11px] font-semibold text-orange-600 whitespace-nowrap ${className}`}>
      Retrying — attempt {Number(retryCount || 0) + 1} of {maxAttempts}
    </span>
  );
}

// Shared copy for the two failure modes the retry endpoints return, so JD and
// resume retries tell the user the same thing:
//   409 — the task isn't in a retryable state, or there's no checkpoint left to
//         replay from. Nothing the user can do but upload the file again.
//   403 — the upload belongs to someone else.
export function retryErrorMessage(error, fallback = "Failed to retry processing.") {
  const status = error?.response?.status;
  const fromServer = error?.response?.data?.message || error?.response?.data?.detail;
  if (status === 409) {
    return fromServer || "This upload can't be retried — please upload the file again.";
  }
  if (status === 403) {
    return fromServer || "You can only retry your own uploads.";
  }
  return fromServer || fallback;
}

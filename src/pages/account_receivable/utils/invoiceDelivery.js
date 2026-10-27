import { DEMO_DELIVERY_STATUS } from "./invoiceDemoData";

/**
 * What a "Send to Client" response means. The backend answers HTTP 200 for every delivery attempt and reports the real
 * outcome in `deliveryStatus` (SENT | SIMULATED | FAILED | PENDING). Only SENT is a real delivery; SIMULATED
 * (local-demo backends) means the workflow ran but NO email left the server, so it must never be shown as sent.
 *
 * `result` is the unwrapped delivery DTO ({ deliveryStatus, sentAt, recipientEmail, failureReason, ... }).
 * A response with no deliveryStatus at all (an older backend) keeps the legacy behaviour: treated as SENT.
 */
export const DELIVERY_OUTCOME = {
  SENT: "SENT",
  SIMULATED: "SIMULATED",
  FAILED: "FAILED",
  PENDING: "PENDING",
  UNKNOWN: "UNKNOWN",
};

export const SIMULATED_LABEL = "Simulated — no email sent";

export function interpretSendResult(result, { recipientEmail = null, sentBy = null, now = new Date() } = {}) {
  const raw = result?.deliveryStatus;
  const status = typeof raw === "string" ? raw.trim().toUpperCase() : "";

  if (!status || status === "SENT") {
    return {
      kind: DELIVERY_OUTCOME.SENT,
      entry: { deliveryStatus: DEMO_DELIVERY_STATUS.SENT_TO_CLIENT, sentAt: now.toISOString(), sentBy, recipientEmail },
    };
  }
  if (status === "SIMULATED") {
    return {
      kind: DELIVERY_OUTCOME.SIMULATED,
      // never a sent time or a sender: nothing was sent
      entry: { deliveryStatus: DEMO_DELIVERY_STATUS.SIMULATED, sentAt: null, sentBy: null, recipientEmail },
      message: `${SIMULATED_LABEL}. The delivery was recorded as simulated; the client was not emailed.`,
      toastType: "info",
    };
  }
  if (status === "FAILED") {
    const reason = result?.failureReason ? `: ${result.failureReason}` : ".";
    return { kind: DELIVERY_OUTCOME.FAILED, entry: null, message: `Invoice delivery failed${reason}`, toastType: "error" };
  }
  if (status === "PENDING") {
    return {
      kind: DELIVERY_OUTCOME.PENDING,
      entry: null,
      message: "Invoice delivery is still pending; it has not been sent yet.",
      toastType: "info",
    };
  }
  return {
    kind: DELIVERY_OUTCOME.UNKNOWN,
    entry: null,
    message: `Invoice delivery returned an unrecognised status (${status}); it was not recorded as sent.`,
    toastType: "error",
  };
}

/** Presentation of a stored delivery entry ({ deliveryStatus, sentAt, sentBy }) for the badge, banner and buttons. */
export function describeDelivery(entry) {
  const status = entry?.deliveryStatus;
  if (status === DEMO_DELIVERY_STATUS.SENT_TO_CLIENT) {
    return { state: "SENT", badge: "Sent to Client", tone: "success", showSentDetails: true, caption: null,
      buttonLabel: "Sent to Client", rowActionLabel: "Resend to Client" };
  }
  if (status === DEMO_DELIVERY_STATUS.SIMULATED) {
    return { state: "SIMULATED", badge: SIMULATED_LABEL, tone: "simulated", showSentDetails: false,
      caption: "Delivery simulated (local demo). The invoice was not emailed to the client.",
      buttonLabel: SIMULATED_LABEL, rowActionLabel: "Send to Client (simulated)" };
  }
  return { state: "NOT_SENT", badge: "Not Sent", tone: "warning", showSentDetails: false, caption: null,
    buttonLabel: "Send to Client", rowActionLabel: "Send to Client" };
}

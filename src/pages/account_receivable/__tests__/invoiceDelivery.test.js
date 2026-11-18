import { describe, it, expect } from "vitest";
import {
  interpretSendResult,
  describeDelivery,
  DELIVERY_OUTCOME,
  SIMULATED_LABEL,
} from "../utils/invoiceDelivery";
import { DEMO_DELIVERY_STATUS } from "../utils/invoiceDemoData";

const NOW = new Date("2026-10-23T10:00:00.000Z");
const opts = { recipientEmail: "client@example.invalid", sentBy: "Paves Admin", now: NOW };

// the unwrapped delivery DTO the backend returns inside { success, message, data }
const dto = (extra) => ({ deliveryId: "d1", invoiceId: "i1", recipientEmail: "client@example.invalid", ...extra });

describe("interpretSendResult - what a Send to Client response means", () => {
  it("SENT is a real delivery and is recorded as sent (existing behaviour)", () => {
    const r = interpretSendResult(dto({ deliveryStatus: "SENT", sentAt: [2026, 10, 23, 9, 0] }), opts);
    expect(r.kind).toBe(DELIVERY_OUTCOME.SENT);
    expect(r.entry).toMatchObject({
      deliveryStatus: DEMO_DELIVERY_STATUS.SENT_TO_CLIENT,
      sentAt: NOW.toISOString(),
      sentBy: "Paves Admin",
    });
  });

  it("a response without deliveryStatus (older backend) keeps the legacy sent behaviour", () => {
    expect(interpretSendResult(dto({}), opts).kind).toBe(DELIVERY_OUTCOME.SENT);
    expect(interpretSendResult(null, opts).kind).toBe(DELIVERY_OUTCOME.SENT);
  });

  it("SIMULATED is never recorded as sent: no sent time, no sender, its own status and a clear label", () => {
    const r = interpretSendResult(dto({ deliveryStatus: "SIMULATED", sentAt: null }), opts);
    expect(r.kind).toBe(DELIVERY_OUTCOME.SIMULATED);
    expect(r.entry.deliveryStatus).toBe(DEMO_DELIVERY_STATUS.SIMULATED);
    expect(r.entry.deliveryStatus).not.toBe(DEMO_DELIVERY_STATUS.SENT_TO_CLIENT);
    expect(r.entry.sentAt).toBeNull();
    expect(r.entry.sentBy).toBeNull();
    expect(r.message).toContain(SIMULATED_LABEL);
    expect(r.message.toLowerCase()).not.toMatch(/marked as sent|sent successfully/);
    expect(r.toastType).toBe("info");
  });

  it("is case/whitespace tolerant about the status", () => {
    expect(interpretSendResult(dto({ deliveryStatus: " simulated " }), opts).kind).toBe(DELIVERY_OUTCOME.SIMULATED);
    expect(interpretSendResult(dto({ deliveryStatus: "sent" }), opts).kind).toBe(DELIVERY_OUTCOME.SENT);
  });

  it("FAILED is not recorded and reports the failure reason as an error", () => {
    const r = interpretSendResult(dto({ deliveryStatus: "FAILED", failureReason: "SMTP authentication failed" }), opts);
    expect(r.kind).toBe(DELIVERY_OUTCOME.FAILED);
    expect(r.entry).toBeNull();
    expect(r.toastType).toBe("error");
    expect(r.message).toContain("SMTP authentication failed");
  });

  it("FAILED without a reason still reads as a failure", () => {
    const r = interpretSendResult(dto({ deliveryStatus: "FAILED" }), opts);
    expect(r.entry).toBeNull();
    expect(r.message).toMatch(/failed/i);
  });

  it("PENDING is not recorded as sent", () => {
    const r = interpretSendResult(dto({ deliveryStatus: "PENDING" }), opts);
    expect(r.kind).toBe(DELIVERY_OUTCOME.PENDING);
    expect(r.entry).toBeNull();
    expect(r.message).toMatch(/pending/i);
  });

  it("an unrecognised status is never recorded as sent", () => {
    const r = interpretSendResult(dto({ deliveryStatus: "BOUNCED" }), opts);
    expect(r.kind).toBe(DELIVERY_OUTCOME.UNKNOWN);
    expect(r.entry).toBeNull();
    expect(r.toastType).toBe("error");
  });
});

describe("describeDelivery - badge, caption and action labels", () => {
  it("SENT_TO_CLIENT is the only state that reads as sent", () => {
    const d = describeDelivery({ deliveryStatus: DEMO_DELIVERY_STATUS.SENT_TO_CLIENT });
    expect(d).toMatchObject({ state: "SENT", badge: "Sent to Client", showSentDetails: true, rowActionLabel: "Resend to Client" });
    expect(d.caption).toBeNull();
  });

  it("SIMULATED reads as simulated and never as sent", () => {
    const d = describeDelivery({ deliveryStatus: DEMO_DELIVERY_STATUS.SIMULATED });
    expect(d.state).toBe("SIMULATED");
    expect(d.badge).toBe(SIMULATED_LABEL);
    expect(d.showSentDetails).toBe(false);
    expect(d.caption).toMatch(/not emailed/i);
    for (const label of [d.badge, d.buttonLabel, d.rowActionLabel]) {
      expect(label).not.toMatch(/^(sent to client|resend to client)$/i);
    }
  });

  it("NOT_SENT and missing entries keep the existing labels", () => {
    for (const entry of [{ deliveryStatus: DEMO_DELIVERY_STATUS.NOT_SENT }, undefined, null, {}]) {
      expect(describeDelivery(entry)).toMatchObject({
        state: "NOT_SENT",
        badge: "Not Sent",
        buttonLabel: "Send to Client",
        rowActionLabel: "Send to Client",
        showSentDetails: false,
      });
    }
  });
});

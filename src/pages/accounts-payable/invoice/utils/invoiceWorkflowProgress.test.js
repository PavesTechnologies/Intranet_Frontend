import { describe, it, expect } from "vitest";
import { deriveWorkflowStages, STAGE_STATE } from "./invoiceWorkflowProgress";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";

const states = (stages) => Object.fromEntries(stages.map((stage) => [stage.key, stage.state]));
const stage = (stages, key) => stages.find((entry) => entry.key === key);
const ev = (action, changed_at = "2026-09-17T10:00:00Z", new_values = {}) => ({ action, changed_at, new_values });

describe("deriveWorkflowStages", () => {
  it("OCR review pending: upload done, review current, rest pending", () => {
    expect(states(deriveWorkflowStages({ status: INVOICE_STATUS.OCR_REVIEW_PENDING }))).toEqual({
      upload: "complete",
      review: "current",
      validation: "pending",
      approval: "pending",
      payment: "pending",
    });
  });

  it("OCR failed marks review as failed", () => {
    expect(stage(deriveWorkflowStages({ status: INVOICE_STATUS.OCR_FAILED }), "review").state).toBe(STAGE_STATE.FAILED);
  });

  it("OCR reviewed puts the invoice at validation", () => {
    const result = states(deriveWorkflowStages({ status: INVOICE_STATUS.OCR_REVIEWED }));
    expect(result.review).toBe("complete");
    expect(result.validation).toBe("current");
  });

  it("pending approval shows the active level from the approval instance", () => {
    const stages = deriveWorkflowStages({
      status: INVOICE_STATUS.PENDING_APPROVAL,
      approval: { steps: [{ level_number: 1, status: "APPROVED" }, { level_number: 2, status: "PENDING" }, { level_number: 3, status: "WAITING" }] },
    });
    expect(stage(stages, "validation").state).toBe("complete");
    expect(stage(stages, "approval")).toMatchObject({ state: "current", note: "Level 2 of 3" });
  });

  it("pending approval after a send-back is noted as resubmitted", () => {
    const stages = deriveWorkflowStages({ status: INVOICE_STATUS.PENDING_APPROVAL, history: [ev("INVOICE_SENT_BACK")] });
    expect(stage(stages, "approval").note).toMatch(/resubmitted/);
  });

  it("returned for review: review current, approval blocked, never shown approved", () => {
    const stages = deriveWorkflowStages({ status: INVOICE_STATUS.RETURNED_FOR_REVIEW, history: [ev("INVOICE_SENT_BACK")] });
    expect(states(stages)).toMatchObject({ review: "current", validation: "pending", approval: "blocked", payment: "pending" });
  });

  it("rejected: approval rejected with level, payment not applicable", () => {
    const stages = deriveWorkflowStages({
      status: INVOICE_STATUS.REJECTED,
      history: [ev("INVOICE_REJECTED", "2026-09-18T09:00:00Z", { level_number: 2 })],
    });
    expect(stage(stages, "approval")).toMatchObject({ state: "rejected", note: "Rejected at level 2", timestamp: "2026-09-18T09:00:00Z" });
    expect(stage(stages, "payment").state).toBe("skipped");
  });

  it("approved is not paid: payment is current, awaiting release", () => {
    const stages = deriveWorkflowStages({ status: INVOICE_STATUS.APPROVED, history: [ev("INVOICE_AUTO_APPROVED")] });
    expect(stage(stages, "approval")).toMatchObject({ state: "complete", note: "Auto-approved" });
    expect(stage(stages, "payment").state).toBe("current");
  });

  it("ready for payment with a sent payment is still not complete", () => {
    const stages = deriveWorkflowStages({
      status: INVOICE_STATUS.READY_FOR_PAYMENT,
      history: [ev("INVOICE_READY_FOR_PAYMENT"), ev("INVOICE_PAYMENT_SCHEDULED"), ev("INVOICE_PAYMENT_SENT")],
    });
    expect(stage(stages, "payment")).toMatchObject({ state: "current", note: "Sent to bank — awaiting confirmation" });
  });

  it("a failed latest payment attempt marks payment as failed", () => {
    const stages = deriveWorkflowStages({
      status: INVOICE_STATUS.READY_FOR_PAYMENT,
      history: [ev("INVOICE_PAYMENT_SCHEDULED"), ev("INVOICE_PAYMENT_FAILED")],
    });
    expect(stage(stages, "payment").state).toBe("failed");
  });

  it("partially paid shows amounts from the invoice", () => {
    const stages = deriveWorkflowStages({ status: INVOICE_STATUS.PARTIALLY_PAID, amountPaid: 400, netAmount: 1000 });
    expect(stage(stages, "payment")).toMatchObject({ state: "current", note: "Partially paid — ₹400.00 of ₹1,000.00" });
  });

  it("paid: every stage complete with timestamps from real events", () => {
    const stages = deriveWorkflowStages({
      status: INVOICE_STATUS.PAID,
      history: [ev("INVOICE_CREATED", "2026-09-01T10:00:00Z"), ev("INVOICE_PAYMENT_CLEARED", "2026-09-20T10:00:00Z")],
    });
    expect(Object.values(states(stages)).every((state) => state === "complete")).toBe(true);
    expect(stage(stages, "upload").timestamp).toBe("2026-09-01T10:00:00Z");
    expect(stage(stages, "payment").timestamp).toBe("2026-09-20T10:00:00Z");
    expect(stage(stages, "review").timestamp).toBeNull();
  });

  it("disputed after approval holds the payment stage", () => {
    const stages = deriveWorkflowStages({ status: INVOICE_STATUS.DISPUTED, history: [ev("INVOICE_APPROVED")] });
    expect(states(stages)).toMatchObject({ approval: "complete", payment: "blocked" });
  });

  it("an unknown status claims nothing beyond upload", () => {
    const result = states(deriveWorkflowStages({ status: "Something New" }));
    expect(result).toMatchObject({ upload: "complete", review: "blocked", approval: "pending", payment: "pending" });
  });
});

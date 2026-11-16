import { describe, it, expect } from "vitest";
import {
  buildActivityItems,
  countByCategory,
  groupItemsByDate,
  mapActivityEvent,
  resolveActor,
} from "./invoiceActivityEvents";

const ev = (action, overrides = {}) => ({ action, changed_by: "101", changed_at: "2026-09-17T10:00:00Z", new_values: {}, old_values: null, ...overrides });

describe("mapActivityEvent", () => {
  it("keeps the original event type and the raw record untouched", () => {
    const raw = ev("INVOICE_APPROVED", { new_values: { invoice_approval_id: 9 } });
    const snapshot = JSON.stringify(raw);
    const item = mapActivityEvent(raw);
    expect(item).toMatchObject({ eventType: "INVOICE_APPROVED", title: "Invoice approved", category: "approval", tone: "success" });
    expect(item.raw).toBe(raw);
    expect(JSON.stringify(raw)).toBe(snapshot);
    // The approval instance id is internal — not shown as a reference or anywhere else in the details.
    expect(item.details.references).toEqual([]);
    expect(item.details.metadata).toEqual([]);
  });

  it("handles null / missing payloads safely", () => {
    const item = mapActivityEvent({ action: "INVOICE_PAYMENT_CLEARED", changed_by: null, changed_at: null, new_values: null, old_values: null });
    expect(item.title).toBe("Payment cleared");
    expect(item.description).toBeNull();
    expect(item.actor).toEqual({ name: "System", isSystem: true });
    expect(mapActivityEvent({}).title).toBe("Unknown event");
  });

  it("titles approval step decisions from the decision itself", () => {
    expect(mapActivityEvent(ev("INVOICE_APPROVAL_STEP_DECISION", { new_values: { level_number: 1, decision: "APPROVED" } })).title).toBe("Level 1 approved");
    expect(mapActivityEvent(ev("INVOICE_APPROVAL_STEP_DECISION", { new_values: { level_number: 2, decision: "REJECTED" } })).tone).toBe("danger");
  });

  it("flags automation exceptions in amber with their reasons", () => {
    const item = mapActivityEvent(ev("AP_AUTOMATION_RESULT", { changed_by: "AP_AUTOMATION", new_values: { outcome: "EXCEPTION", reasons: ["No GRN", "Price variance"] } }));
    expect(item).toMatchObject({ tone: "warning", statusLabel: "Exception", description: "No GRN (+1 more)" });
    expect(item.details.metadata.find((field) => field.key === "reasons").value).toEqual(["No GRN", "Price variance"]);
  });
});

describe("resolveActor", () => {
  it("distinguishes people from system actors", () => {
    expect(resolveActor("5100031", () => "Jane")).toEqual({ name: "Jane", isSystem: false });
    expect(resolveActor("RECURRING_SCHEDULE")).toEqual({ name: "Recurring schedule", isSystem: true });
    expect(resolveActor("NEW_SERVICE_BOT")).toEqual({ name: "New service bot", isSystem: true });
    expect(resolveActor(null)).toEqual({ name: "System", isSystem: true });
  });
});

describe("buildActivityItems", () => {
  it("merges only back-to-back identical records and keeps every timestamp", () => {
    const a = ev("INVOICE_PAYMENT_TERMS_CHECKED", { new_values: { validation_status: "MISMATCH" } });
    const items = buildActivityItems([
      a,
      { ...a, changed_at: "2026-09-17T11:00:00Z" },
      ev("INVOICE_PAYMENT_TERMS_CHECKED", { new_values: { validation_status: "COMPLIANT" } }),
      { ...a, changed_at: "2026-09-17T13:00:00Z" },
    ]);
    expect(items).toHaveLength(3);
    expect(items[0].occurrences).toEqual(["2026-09-17T10:00:00Z", "2026-09-17T11:00:00Z"]);
    expect(items[0].rawRecords).toHaveLength(2);
  });

  it("never merges records from different actors", () => {
    expect(buildActivityItems([ev("INVOICE_OCR_REVIEWED"), ev("INVOICE_OCR_REVIEWED", { changed_by: "102" })])).toHaveLength(2);
  });

  it("counts by category", () => {
    const counts = countByCategory(buildActivityItems([ev("INVOICE_CREATED"), ev("INVOICE_TDS_VERIFIED"), ev("UNKNOWN_THING")]));
    expect(counts).toMatchObject({ all: 3, processing: 1, tax: 1, other: 1 });
  });
});

describe("groupItemsByDate", () => {
  it("groups consecutive items by day without reordering", () => {
    const items = buildActivityItems([
      ev("INVOICE_CREATED", { changed_at: "2026-09-16T10:00:00Z" }),
      ev("INVOICE_OCR_REVIEWED", { changed_at: "2026-09-17T10:00:00Z" }),
      ev("INVOICE_SENT_FOR_APPROVAL", { changed_at: "2026-09-17T10:05:00Z" }),
      ev("INVOICE_APPROVED", { changed_at: null }),
    ]);
    const groups = groupItemsByDate(items, new Date("2026-09-17T12:00:00Z"));
    expect(groups.map((group) => group.items.length)).toEqual([1, 2, 1]);
    expect(groups[1].label).toMatch(/^Today/);
    expect(groups[0].label).toMatch(/^Yesterday/);
    expect(groups[2].label).toBe("Date not recorded");
  });
});

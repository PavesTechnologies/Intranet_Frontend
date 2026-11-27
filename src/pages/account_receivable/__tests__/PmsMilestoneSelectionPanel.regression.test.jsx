import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.hoisted(() => {
  window.__APP_CONFIG__ = { ...(window.__APP_CONFIG__ || {}), AR_BASE_URL: "http://ar.test" };
});
vi.mock("../../../api/axiosInstance", () => ({ default: { get: vi.fn() } }));

import PmsMilestoneSelectionPanel from "../components/billing-setup/PmsMilestoneSelectionPanel";

// Rebuilds panel coverage from the current source (the original __tests__ folder is missing). It renders the panel with
// an injected milestones state; it does not exercise the wizard's save flow or the real backend.
const ms = (id, code, extra = {}) => ({
  id, pmsMilestoneId: id, pmsProjectId: 9002, code, name: `Milestone ${code}`, description: "",
  plannedCompletionDate: "2026-12-15", actualCompletionDate: "", executionStatus: "IN_PROGRESS", billable: true,
  pmsAllocationPercentage: 25, billingReadiness: "READY_FOR_BILLING", ...extra,
});

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const renderPanel = (milestones, { entries = [], status = "success", error = "", onEntriesChange = vi.fn(), onReload = vi.fn() } = {}) => {
  render(
    <PmsMilestoneSelectionPanel
      pmsProjectId={9002}
      milestonesState={{ status, milestones, error }}
      onReload={onReload}
      entries={entries}
      onEntriesChange={onEntriesChange}
      totalValue={100000}
      currency="INR"
    />,
  );
  return { onEntriesChange, onReload };
};

describe("PmsMilestoneSelectionPanel", () => {
  it("renders no action box, Sync button or Manage in PMS link", () => {
    renderPanel([ms(11, "M-1", { billingState: "AVAILABLE" })]);
    expect(screen.queryByRole("button", { name: /sync/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/manage in pms/i)).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="tab=milestones"]')).toBeNull();
    expect(screen.getByTestId("pms-milestone-panel")).toBeInTheDocument();
  });

  it("shows an AR billing-state badge per known state", () => {
    renderPanel([
      ms(11, "M-1", { billingState: "AVAILABLE", eligibleForBilling: true }),
      ms(12, "M-2", { billingState: "RESERVED", eligibleForBilling: false }),
      ms(13, "M-3", { billingState: "IN_BILLING", eligibleForBilling: false }),
      ms(14, "M-4", { billingState: "INVOICED", eligibleForBilling: false }),
    ]);
    ["Available", "Reserved", "In Billing", "Invoiced"].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
    expect(screen.queryByText("State unavailable")).not.toBeInTheDocument();
  });

  it("shows 'State unavailable' for a missing or unrecognised state and never Available", () => {
    renderPanel([ms(11, "M-1"), ms(12, "M-2", { billingState: "WEIRD" })]);
    expect(screen.getAllByText("State unavailable")).toHaveLength(2);
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
  });

  it("keeps AR billing state separate from the PMS execution status and readiness columns", () => {
    renderPanel([ms(11, "M-1", { billingState: "INVOICED", executionStatus: "COMPLETED", billingReadiness: "NOT_READY", eligibleForBilling: false })]);
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("Not ready")).toBeInTheDocument();
    expect(screen.getByText("Invoiced")).toBeInTheDocument();
  });

  it("bills every eligible milestone automatically, with the PMS allocation and planned due date", () => {
    const { onEntriesChange } = renderPanel([ms(11, "M-1", { billingState: "AVAILABLE", eligibleForBilling: true })]);
    expect(onEntriesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        pmsMilestoneId: 11,
        percentage: "25",
        billingDate: "2026-12-15",
        remarks: "Milestone M-1",
      }),
    ]);
  });

  it("falls back to a free date only when PMS reports no planned due date", () => {
    const { onEntriesChange } = renderPanel([
      ms(11, "M-1", { billingState: "AVAILABLE", eligibleForBilling: true, plannedCompletionDate: "" }),
    ]);
    expect(onEntriesChange).toHaveBeenCalledWith([expect.objectContaining({ billingDate: today() })]);
    expect(screen.getByTestId("billing-date-unavailable-M-1")).toBeInTheDocument();
  });

  it("does not bill an ineligible milestone, but still shows its allocation and the backend reason", () => {
    const { onEntriesChange } = renderPanel([
      ms(12, "M-2", { billingState: "RESERVED", eligibleForBilling: false, ineligibilityReason: "Held by plan cfg-9" }),
    ]);
    expect(onEntriesChange).not.toHaveBeenCalled();
    expect(screen.getByText("Held by plan cfg-9")).toBeInTheDocument();
    expect(screen.getByTestId("ar-percentage-M-2")).toHaveTextContent("25%");
  });

  it("renders no Bill checkbox and no AR percentage input at all", () => {
    renderPanel([ms(11, "M-1", { billingState: "AVAILABLE", eligibleForBilling: true })], {
      entries: [{ pmsMilestoneId: 11, percentage: "25", billingDate: "2027-01-20" }],
    });
    expect(screen.queryByLabelText(/^Bill milestone/)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    expect(screen.queryByLabelText(/AR billing percentage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PMS Allocation/i)).not.toBeInTheDocument();
  });

  it("flags a milestone PMS gave no usable allocation for, instead of billing a guess", () => {
    const { onEntriesChange } = renderPanel([
      ms(11, "M-1", { billingState: "AVAILABLE", eligibleForBilling: true, pmsAllocationPercentage: null }),
    ]);
    expect(onEntriesChange).toHaveBeenCalledWith([expect.objectContaining({ pmsMilestoneId: 11, percentage: "" })]);
    expect(screen.getByTestId("ar-percentage-unavailable-M-1")).toBeInTheDocument();
  });

  it("computes the amount from the AR percentage and the contract value", () => {
    renderPanel([ms(11, "M-1", { billingState: "AVAILABLE", eligibleForBilling: true })], {
      entries: [{ pmsMilestoneId: 11, percentage: "40", billingDate: "2027-01-20", remarks: "x" }],
    });
    expect(screen.getByTestId("ar-percentage-M-1")).toHaveTextContent("40%");
    expect(screen.getAllByText(/40,000/).length).toBeGreaterThan(0); // row amount (and the cycle total in the header)
  });

  it("shows the billing date as read-only text, with no date input anywhere", () => {
    renderPanel([ms(11, "M-1", { billingState: "AVAILABLE", eligibleForBilling: true })], {
      entries: [{ pmsMilestoneId: 11, percentage: "25", billingDate: "2026-12-15" }],
    });
    expect(screen.getByTestId("billing-date-M-1")).toHaveTextContent("15 Dec 2026");
    expect(document.querySelector('input[type="date"]')).toBeNull();
    expect(screen.queryByLabelText(/Billing date for/)).not.toBeInTheDocument();
  });

  it("shows the planned due date as the billing date for a milestone that is not billed", () => {
    renderPanel([
      ms(12, "M-2", {
        billingState: "AVAILABLE",
        eligibleForBilling: false,
        billingReadiness: "NOT_READY",
        plannedCompletionDate: "2027-02-28",
      }),
    ]);
    expect(screen.getByTestId("billing-date-M-2")).toHaveTextContent("28 Feb 2027");
  });

  it("re-points a saved entry at the milestone's planned due date", () => {
    const { onEntriesChange } = renderPanel([ms(11, "M-1", { billingState: "AVAILABLE", eligibleForBilling: true })], {
      entries: [{ paymentEntryId: "e1", pmsMilestoneId: 11, percentage: "25", billingDate: "2020-05-05", frozen: false }],
    });
    expect(onEntriesChange).toHaveBeenCalledWith([expect.objectContaining({ billingDate: "2026-12-15" })]);
  });

  it("leaves a frozen entry on the date its billing started, and says so", () => {
    const { onEntriesChange } = renderPanel(
      [ms(11, "M-1", { billingState: "IN_BILLING", plannedCompletionDate: "2027-03-03" })],
      {
        entries: [
          { paymentEntryId: "e1", pmsMilestoneId: 11, percentage: "60", billingDate: "2026-12-15", frozen: true },
        ],
      },
    );
    expect(screen.getByTestId("frozen-indicator-11")).toBeInTheDocument();
    expect(onEntriesChange).not.toHaveBeenCalled();
    const cell = screen.getByTestId("billing-date-M-1");
    expect(cell).toHaveTextContent("15 Dec 2026");
    expect(cell).toHaveAttribute("title", expect.stringMatching(/billing has started/i));
  });

  it("keeps a saved entry read-only as 'unknown' when the backend gave no frozen flag", () => {
    const { onEntriesChange } = renderPanel([ms(11, "M-1", { billingState: "AVAILABLE" })], {
      entries: [{ paymentEntryId: "e1", pmsMilestoneId: 11, percentage: "60", billingDate: "2026-11-01" }],
    });
    expect(screen.getByTestId("unknown-state-indicator-11")).toBeInTheDocument();
    expect(onEntriesChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("billing-date-M-1")).toHaveTextContent("01 Nov 2026");
  });

  it("shows loading, error with Retry, and empty states", () => {
    const { onReload } = renderPanel([], { status: "error", error: "PMS down" });
    expect(screen.getByRole("alert")).toHaveTextContent("PMS down");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("shows the empty message for a successful empty list", () => {
    renderPanel([]);
    expect(screen.getByText(/no milestones have been synchronised from pms/i)).toBeInTheDocument();
  });

  it("shows a loading status while the list loads", () => {
    renderPanel([], { status: "loading" });
    expect(screen.getByRole("status")).toHaveTextContent(/loading milestones/i);
  });
});

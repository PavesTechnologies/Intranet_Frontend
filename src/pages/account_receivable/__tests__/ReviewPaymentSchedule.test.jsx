import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

vi.hoisted(() => {
  window.__APP_CONFIG__ = { ...(window.__APP_CONFIG__ || {}), AR_BASE_URL: "http://ar.test" };
});
vi.mock("../../../api/axiosInstance", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

const getProjectMilestones = vi.fn();
vi.mock("../services/projectMilestoneService", async (importOriginal) => ({
  ...(await importOriginal()),
  getProjectMilestones: (...args) => getProjectMilestones(...args),
}));
vi.mock("../services/billingConfigurationService", async (importOriginal) => ({
  ...(await importOriginal()),
  getBillingRecurringSchedule: vi.fn().mockResolvedValue(null),
  getBillingRecurringScheduleByBillingConfigurationId: vi.fn().mockResolvedValue(null),
}));

import ReviewActivateStep from "../components/billing-setup/ReviewActivateStep";

// GET /api/projects/{pmsProjectId}/milestones, as projectMilestoneService maps it.
const milestone = (id, code, due, extra = {}) => ({
  id,
  pmsMilestoneId: id,
  pmsProjectId: 9002,
  code,
  name: `Milestone ${code}`,
  plannedCompletionDate: due,
  actualCompletionDate: "",
  executionStatus: "COMPLETED",
  billable: true,
  pmsAllocationPercentage: 25,
  billingReadiness: "READY_FOR_BILLING",
  billingState: "AVAILABLE",
  eligibleForBilling: true,
  ...extra,
});

const notReady = (id, code, due, percentage) =>
  milestone(id, code, due, {
    executionStatus: "PLANNED",
    billingReadiness: "NOT_READY",
    eligibleForBilling: false,
    ineligibilityReason: "Milestone is not ready for billing in PMS (billing readiness: NOT_READY).",
    pmsAllocationPercentage: percentage,
  });

const wizardData = {
  projectInfo: { projectId: "cfg-uuid", pmsProjectId: 9002, projectName: "Apollo", projectBudget: 100000 },
  controls: {},
  billingConfig: {
    billingType: "MILESTONE_PLAN",
    currency: "INR",
    milestonePlan: {
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "e1", sequence: 1, percentage: 25, amount: 25000, billingDate: "2026-10-01", pmsMilestoneId: 11, remarks: "Milestone M-1" },
      ],
    },
  },
};

const renderReview = () => render(<ReviewActivateStep wizardData={wizardData} onEditStep={vi.fn()} />);

describe("Review — Payment Schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-10-01"),
      notReady(12, "M-2", "2026-12-31", 25),
      notReady(13, "M-3", "2027-02-28", 20),
    ]);
  });

  it("shows the not-ready milestones as cards beside the billed ones", async () => {
    renderReview();

    await waitFor(() => expect(screen.getByTestId("pending-milestone-M-2")).toBeInTheDocument());
    const pending = screen.getByTestId("pending-milestone-M-2");
    expect(within(pending).getByText("Milestone M-2")).toBeInTheDocument();
    expect(within(pending).getByText("Not ready")).toBeInTheDocument();
    expect(within(pending).getByText("31 Dec 2026")).toBeInTheDocument(); // its planned due date
    expect(within(pending).getByText(/not ready for billing in PMS/i)).toBeInTheDocument();
    expect(screen.getByTestId("pending-milestone-M-3")).toBeInTheDocument();

    // the billed milestone still has its own payment card
    expect(screen.getByText("Payment 1")).toBeInTheDocument();
    expect(screen.getByText(/Not billed by this plan \(2\)/i)).toBeInTheDocument();
  });

  it("keeps them out of the schedule's totals", async () => {
    renderReview();
    await waitFor(() => expect(screen.getByTestId("pending-milestone-M-2")).toBeInTheDocument());

    // One payment of 25% — the 45% still pending in PMS is not counted anywhere.
    expect(screen.getByText("Number of Payments").parentElement).toHaveTextContent("1");
    expect(screen.queryByText("70%")).not.toBeInTheDocument();
  });

  it("shows no pending section when every milestone is billed", async () => {
    getProjectMilestones.mockResolvedValue([milestone(11, "M-1", "2026-10-01")]);
    renderReview();

    await waitFor(() => expect(screen.getByText("Payment 1")).toBeInTheDocument());
    expect(screen.queryByText(/Not billed by this plan/i)).not.toBeInTheDocument();
  });
});

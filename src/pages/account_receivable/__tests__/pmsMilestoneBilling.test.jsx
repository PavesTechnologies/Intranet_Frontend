import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, configure, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { MilestonePlanForm } from "../components/billing-setup/BillingConfigurationStep";
import ReviewActivateStep from "../components/billing-setup/ReviewActivateStep";
import { useProjectMilestones } from "../components/billing-setup/useProjectMilestones";
import { getProjectMilestones } from "../services/projectMilestoneService";
import {
  createMilestonePlanConfiguration,
  getMilestonePlanByBillingConfiguration,
  updateMilestonePlanConfiguration,
} from "../services/billingConfigurationService";
import { showStatusToast } from "../../../components/toastfy/toast";

vi.mock("../services/billingConfigurationService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getMilestonePlanByBillingConfiguration: vi.fn(),
    createMilestonePlanConfiguration: vi.fn(),
    updateMilestonePlanConfiguration: vi.fn(),
    deleteMilestonePlanConfiguration: vi.fn(),
  };
});

vi.mock("../services/projectMilestoneService", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getProjectMilestones: vi.fn() };
});

vi.mock("../../../components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

// The first render of the (large) billing form is slow on a loaded machine; the default 1s is too tight.
configure({ asyncUtilTimeout: 4000 });

const milestone = (id, code, due, extra = {}) => ({
  id,
  pmsMilestoneId: id,
  pmsProjectId: 9002,
  code,
  name: `Milestone ${code}`,
  description: "",
  plannedStartDate: "",
  plannedCompletionDate: due,
  actualCompletionDate: "",
  executionStatus: "IN_PROGRESS",
  billable: true,
  pmsAllocationPercentage: 25,
  billingReadiness: "READY_FOR_BILLING",
  sourceVersion: 1,
  lastSyncedAt: null,
  ...extra,
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("useProjectMilestones", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads milestones for the PMS project and reports success", async () => {
    getProjectMilestones.mockResolvedValueOnce([milestone(11, "M-1", "2026-12-15")]);

    const { result } = renderHook(() => useProjectMilestones(9002));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(getProjectMilestones).toHaveBeenCalledWith(9002, expect.any(Object));
    expect(result.current.milestones.map((m) => m.pmsMilestoneId)).toEqual([11]);
  });

  it("ignores a late response of the previous project after the project changed", async () => {
    const first = deferred();
    const second = deferred();
    getProjectMilestones.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(({ id }) => useProjectMilestones(id), { initialProps: { id: 9002 } });
    rerender({ id: 9003 });

    await act(async () => {
      second.resolve([milestone(21, "B-1", "2027-01-01")]);
    });
    await waitFor(() => expect(result.current.status).toBe("success"));

    await act(async () => {
      first.resolve([milestone(11, "A-1", "2026-12-15")]); // stale: belongs to project 9002
    });

    expect(result.current.milestones.map((m) => m.pmsMilestoneId)).toEqual([21]);
    expect(result.current.loadedFor).toBe(9003);
  });

  it("clears the previous project's rows while the new project loads", async () => {
    const second = deferred();
    getProjectMilestones.mockResolvedValueOnce([milestone(11, "A-1", "2026-12-15")]).mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(({ id }) => useProjectMilestones(id), { initialProps: { id: 9002 } });
    await waitFor(() => expect(result.current.status).toBe("success"));
    rerender({ id: 9003 });

    expect(result.current.status).toBe("loading");
    expect(result.current.milestones).toEqual([]);
  });

  it("reports the backend message on failure, keeps no rows, and recovers on retry", async () => {
    getProjectMilestones
      .mockRejectedValueOnce({ response: { status: 500, data: { message: "PMS milestones unavailable" } } })
      .mockResolvedValueOnce([milestone(11, "M-1", "2026-12-15")]);

    const { result } = renderHook(() => useProjectMilestones(9002));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("PMS milestones unavailable");
    expect(result.current.milestones).toEqual([]);

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(getProjectMilestones).toHaveBeenCalledTimes(2);
    expect(result.current.milestones).toHaveLength(1);
  });

  it("treats an empty list as a successful, empty result", async () => {
    getProjectMilestones.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useProjectMilestones(9002));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.milestones).toEqual([]);
  });

  it("without a PMS project id it fails clearly and never calls the API", async () => {
    const { result } = renderHook(() => useProjectMilestones(null));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/not linked to a PMS project/);
    expect(getProjectMilestones).not.toHaveBeenCalled();
  });

  it("does not load when disabled (Full Payment / Installments)", async () => {
    const { result } = renderHook(() => useProjectMilestones(9002, { enabled: false }));
    expect(result.current.status).toBe("idle");
    expect(getProjectMilestones).not.toHaveBeenCalled();
  });
});

function Harness({ initial, projectInfo = { projectId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", pmsProjectId: 9002 }, onValue }) {
  const [value, setValue] = useState(initial);
  onValue?.(value);
  return (
    <MilestonePlanForm
      value={value}
      onChange={setValue}
      currency="INR"
      projectBudget={100000}
      billingConfigurationId="cfg-1"
      projectInfo={projectInfo}
    />
  );
}

// Milestones are no longer picked with a checkbox: every eligible one is billed as soon as the list
// loads, at the allocationPercentage PMS reported, so the tests assert on the row rather than drive it.
const row = (code) => screen.getByTestId(`milestone-row-${code}`);
const expectBilled = (code) => expect(row(code)).toHaveAttribute("data-billed", "yes");
const expectNotBilled = (code) => expect(row(code)).toHaveAttribute("data-billed", "no");
const arPercent = (code) => screen.getByTestId(`ar-percentage-${code}`);
// The billing date is the PMS planned due date, rendered as text: no row field is editable.
const billingDateCell = (code) => screen.getByTestId(`billing-date-${code}`);
const expectNoDateFields = () => expect(screen.queryByLabelText(/Billing date for/)).not.toBeInTheDocument();

const dateOnly = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
// The defaults start at today and step forward, because a Milestone Plan needs one date per milestone.
const dayFromToday = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateOnly(date);
};

// The form resets to its default once the saved-plan lookup resolves, so wait for the lookup to FINISH
// (not just to start) before interacting - otherwise the reset can overwrite what the test just did.
const waitForPlanLoad = async () => {
  await waitFor(() => expect(getMilestonePlanByBillingConfiguration).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText(/Loading saved milestone plan/)).not.toBeInTheDocument());
};

describe("MilestonePlanForm — PMS milestones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMilestonePlanByBillingConfiguration.mockResolvedValue(null);
    createMilestonePlanConfiguration.mockImplementation(async (_cfg, payload) => ({
      milestonePlanId: "plan-1",
      totalContractValue: payload.totalContractValue,
      paymentStructure: payload.paymentStructure,
      remarks: payload.remarks,
      entries: payload.entries.map((e, i) => ({ ...e, paymentEntryId: `e${i + 1}`, amount: 0, frozen: false })),
    }));
    updateMilestonePlanConfiguration.mockImplementation(async (id, payload) => ({
      milestonePlanId: id,
      totalContractValue: payload.totalContractValue,
      paymentStructure: payload.paymentStructure,
      remarks: payload.remarks,
      entries: payload.entries.map((e, i) => ({ ...e, paymentEntryId: `e${i + 1}`, amount: 0, frozen: false })),
    }));
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15"),
      milestone(12, "M-2", "2027-01-20"),
    ]);
  });

  const chooseMilestonesPlan = async () => {
    await waitForPlanLoad();
    fireEvent.click(screen.getByRole("radio", { name: /milestones/i }));
    await screen.findByTestId("milestone-row-M-1");
  };

  it("loads the milestones from the PMS project id (not the AR project id) when Milestones is chosen", async () => {
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await waitForPlanLoad();
    expect(getProjectMilestones).not.toHaveBeenCalled(); // Full Payment never touches the milestone API

    fireEvent.click(screen.getByRole("radio", { name: /milestones/i }));

    await screen.findByTestId("milestone-row-M-1");
    expect(getProjectMilestones).toHaveBeenCalledWith(9002, expect.any(Object));
    expect(screen.getByTestId("milestone-row-M-2")).toBeInTheDocument();
  });

  it("saves every eligible milestone as MILESTONES with numeric pmsMilestoneId, PMS percentage and billing date", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { pmsAllocationPercentage: 60 }),
      milestone(12, "M-2", "2027-01-20", { pmsAllocationPercentage: 40 }),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(createMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    const [configId, payload] = createMilestonePlanConfiguration.mock.calls[0];
    expect(configId).toBe("cfg-1");
    expect(payload.paymentStructure).toBe("MILESTONES");
    expect(payload.entries).toEqual([
      { sequence: 1, percentage: 60, billingDate: "2026-12-15", remarks: "Milestone M-1", pmsMilestoneId: 11 },
      { sequence: 2, percentage: 40, billingDate: "2027-01-20", remarks: "Milestone M-2", pmsMilestoneId: 12 },
    ]);
    payload.entries.forEach((e) => expect(typeof e.pmsMilestoneId).toBe("number"));
  });

  it("takes the AR percentage from the PMS allocation, read-only, and saves a partial allocation", async () => {
    getProjectMilestones.mockResolvedValue([milestone(11, "M-1", "2026-12-15", { pmsAllocationPercentage: 70 })]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    expect(arPercent("M-1")).toHaveTextContent("70%");
    expect(screen.queryByLabelText(/AR billing percentage/i)).not.toBeInTheDocument();
    
    // Partial allocation is valid for milestones!
    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(createMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    const [, payload] = createMilestonePlanConfiguration.mock.calls[0];
    expect(payload.paymentStructure).toBe("MILESTONES");
    expect(payload.entries).toEqual([
      { sequence: 1, percentage: 70, billingDate: "2026-12-15", remarks: "Milestone M-1", pmsMilestoneId: 11 },
    ]);
  });

  it("bills several eligible milestones at once with a partial total", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { pmsAllocationPercentage: 30 }),
      milestone(12, "M-2", "2027-01-20", { pmsAllocationPercentage: 40 }),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(createMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    const [, payload] = createMilestonePlanConfiguration.mock.calls[0];
    expect(payload.paymentStructure).toBe("MILESTONES");
    expect(payload.entries).toHaveLength(2);
    expect(payload.entries[0].percentage).toBe(30);
    expect(payload.entries[1].percentage).toBe(40);
  });

  it("blocks saving when the PMS allocations total more than 100%", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { pmsAllocationPercentage: 65 }),
      milestone(12, "M-2", "2027-01-20", { pmsAllocationPercentage: 45 }),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    await waitFor(() => expect(screen.getByRole("button", { name: /save milestone plan/i })).toBeDisabled());
    expect(screen.getByRole("button", { name: /save milestone plan/i })).toBeDisabled();
    expect(screen.getByText(/Total allocation cannot exceed 100%/i)).toBeInTheDocument();
  });

  it("rounds a PMS allocation with more than 2 decimal places instead of blocking the save", async () => {
    getProjectMilestones.mockResolvedValue([milestone(11, "M-1", "2026-12-15", { pmsAllocationPercentage: 33.333 })]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    expect(arPercent("M-1")).toHaveTextContent("33.33%");
    expect(screen.queryByText(/Percentage must have at most 2 decimal places/i)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /save milestone plan/i })).not.toBeDisabled());
  });

  it("bills each milestone on its PMS planned due date, shown as read-only text", async () => {
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    await waitFor(() => expect(billingDateCell("M-1")).toHaveTextContent("15 Dec 2026"));
    expect(billingDateCell("M-2")).toHaveTextContent("20 Jan 2027");
    expectNoDateFields();
    expect(screen.getByRole("button", { name: /save milestone plan/i })).not.toBeDisabled();
  });

  it("blocks saving when two milestones share a planned due date", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15"),
      milestone(12, "M-2", "2026-12-15"),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    await waitFor(() => expect(screen.getByRole("button", { name: /save milestone plan/i })).toBeDisabled());
    expect(screen.getByText(/Each milestone must have a unique billing date/i)).toBeInTheDocument();
  });

  it("falls back to a free date for a milestone PMS gave no due date", async () => {
    getProjectMilestones.mockResolvedValue([milestone(11, "M-1", "")]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    await waitFor(() => expect(screen.getByTestId("billing-date-unavailable-M-1")).toBeInTheDocument());
    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(createMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    const [, payload] = createMilestonePlanConfiguration.mock.calls[0];
    expect(payload.entries[0].billingDate).toBe(dayFromToday(0));
  });

  it("shows the backend's claim-conflict message, keeps the selection, and does not report success", async () => {
    const conflict = "PMS milestone 11 (M-1) is already part of another active billing plan (billing configuration abc).";
    createMilestonePlanConfiguration.mockRejectedValueOnce({ response: { status: 400, data: { message: conflict } } });
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith(conflict, "error"));
    expect(showStatusToast).not.toHaveBeenCalledWith("Milestone plan configuration saved", "success");
    expectBilled("M-1");
    expect(arPercent("M-1")).toHaveTextContent("25%");
  });

  it("hydrates a saved MILESTONES plan, preserves the exact milestone ids, and updates (not re-creates) on save", async () => {
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      remarks: "",
      entries: [
        { paymentEntryId: "e1", sequence: 1, percentage: 60, amount: 60000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: false },
        { paymentEntryId: "e2", sequence: 2, percentage: 40, amount: 40000, billingDate: "2027-01-20", pmsMilestoneId: 12, remarks: "Milestone M-2", frozen: false },
      ],
    });
    render(<Harness initial={{}} />);

    await waitFor(() => expectBilled("M-1"));
    expectBilled("M-2");
    // the saved percentage is kept as stored, not overwritten by the PMS allocation
    expect(arPercent("M-1")).toHaveTextContent("60%");
    expect(billingDateCell("M-2")).toHaveTextContent("20 Jan 2027");

    const update = screen.getByRole("button", { name: /update milestone plan/i });
    await waitFor(() => expect(update).not.toBeDisabled());
    fireEvent.click(update);

    await waitFor(() => expect(updateMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    expect(createMilestonePlanConfiguration).not.toHaveBeenCalled();
    const [planId, payload] = updateMilestonePlanConfiguration.mock.calls[0];
    expect(planId).toBe("plan-9");
    expect(payload.entries.map((e) => e.pmsMilestoneId)).toEqual([11, 12]);
  });

  it("flags a saved entry whose milestone PMS no longer lists and blocks saving until it is removed", async () => {
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "e1", sequence: 1, percentage: 100, billingDate: "2026-12-15", pmsMilestoneId: 777, remarks: "gone", frozen: false },
      ],
    });
    render(<Harness initial={{}} />);

    await screen.findByText(/PMS milestone 777/);
    expect(screen.getByRole("button", { name: /update milestone plan/i })).toBeDisabled();
    expect(screen.getByText(/Remove milestones PMS no longer lists/)).toBeInTheDocument();
  });

  it("shows the load failure with Retry, then the rows once the retry succeeds", async () => {
    getProjectMilestones
      .mockRejectedValueOnce({ response: { status: 503, data: { message: "PMS milestone data is unavailable" } } })
      .mockResolvedValueOnce([milestone(11, "M-1", "2026-12-15")]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await waitForPlanLoad();
    fireEvent.click(screen.getByRole("radio", { name: /milestones/i }));

    expect(await screen.findByText("PMS milestone data is unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("milestone-row-M-1")).not.toBeInTheDocument(); // no sample/stored fallback

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("milestone-row-M-1")).toBeInTheDocument();
  });

  it("shows an empty state when PMS has no milestones for the project", async () => {
    getProjectMilestones.mockResolvedValue([]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await waitForPlanLoad();
    fireEvent.click(screen.getByRole("radio", { name: /milestones/i }));

    expect(await screen.findByText(/No milestones have been synchronised from PMS/)).toBeInTheDocument();
  });

  it("explains a project without a PMS id instead of guessing one", async () => {
    render(
      <Harness
        initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }}
        projectInfo={{ projectId: "3fa85f64-5717-4562-b3fc-2c963f66afa6" }}
      />,
    );
    await waitForPlanLoad();
    fireEvent.click(screen.getByRole("radio", { name: /milestones/i }));

    expect(await screen.findByText(/not linked to a PMS project/)).toBeInTheDocument();
    expect(getProjectMilestones).not.toHaveBeenCalled();
  });

  it("does not bill not-ready, non-billable, already-billed or reserved milestones, and gives the reason", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { billingReadiness: "READY_FOR_BILLING" }),
      milestone(12, "M-2", "2027-01-20", { billingReadiness: "NOT_READY" }),
      milestone(13, "M-3", "2027-02-15", { billable: false }),
      milestone(14, "M-4", "2027-03-10", { alreadyBilled: true }),
      milestone(15, "M-5", "2027-04-05", { reserved: true, reservedBy: "cfg-99" }),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    // M-1 is eligible, so it is billed without anything being clicked
    await waitFor(() => expectBilled("M-1"));

    // M-2 is not ready
    expectNotBilled("M-2");
    expect(screen.getByText("Not ready for billing in PMS")).toBeInTheDocument();

    // M-3 is not billable
    expectNotBilled("M-3");
    expect(screen.getByText("Not billable in PMS")).toBeInTheDocument();

    // M-4 is already billed
    expectNotBilled("M-4");
    expect(screen.getAllByText("Already billed").length).toBeGreaterThan(0);

    // M-5 is reserved
    expectNotBilled("M-5");
    expect(screen.getByText("Reserved by billing plan cfg-99")).toBeInTheDocument();
  });

  it("reloads milestones through Retry to reveal a newly eligible future milestone and preserves previous billing state", async () => {
    getProjectMilestones
      .mockRejectedValueOnce({ response: { status: 503, data: { message: "PMS synchronization temporarily unavailable" } } })
      .mockResolvedValueOnce([
        milestone(11, "M-1", "2026-12-15", { alreadyBilled: true }),
        milestone(12, "M-2", "2027-01-20", { billingReadiness: "READY_FOR_BILLING" }),
      ]);

    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await waitForPlanLoad();
    fireEvent.click(screen.getByRole("radio", { name: /milestones/i }));

    await screen.findByText("PMS synchronization temporarily unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await screen.findByTestId("milestone-row-M-1");
    await waitFor(() => expectBilled("M-2"));
    expectNotBilled("M-1");
    expect(screen.getAllByText("Already billed").length).toBeGreaterThan(0);
  });

  it("does not render the PMS milestones action box, Sync button or Manage in PMS link", async () => {
    getProjectMilestones.mockResolvedValue([milestone(11, "M-1", "2026-12-15", { billingState: "AVAILABLE" })]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    expect(screen.queryByRole("button", { name: /sync/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /manage in pms/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/manage in pms/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/a milestone can belong to only one billing plan/i)).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="tab=milestones"]')).toBeNull();
    // the milestone table itself is still there, and billing its rows
    expect(screen.getByTestId("pms-milestone-panel")).toBeInTheDocument();
    await waitFor(() => expectBilled("M-1"));
  });

  it("handles backend over-allocation error while preserving form state and reloading milestones", async () => {
    const errorMsg = "The selected milestones total 60000, which exceeds the remaining contract value of 50000.";
    createMilestonePlanConfiguration.mockRejectedValueOnce({ response: { status: 400, data: { message: errorMsg } } });
    getProjectMilestones.mockResolvedValue([milestone(11, "M-1", "2026-12-15", { pmsAllocationPercentage: 60 })]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith(errorMsg, "error"));
    expectBilled("M-1");
    expect(arPercent("M-1")).toHaveTextContent("60%");
    // Verifies reload was called on save error
    await waitFor(() => expect(getProjectMilestones).toHaveBeenCalledTimes(2));
  });

  it("displays authoritative previously billed amount and remaining contract balance in the summary panel", async () => {
    getMilestonePlanByBillingConfiguration.mockResolvedValueOnce({
      milestonePlanId: "plan-1",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      previouslyBilledAmount: 30000,
      remainingContractBalance: 70000,
      entries: [
        { paymentEntryId: "e1", sequence: 1, percentage: 40, amount: 40000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: false },
      ],
    });

    render(<Harness initial={{}} />);
    await waitForPlanLoad();
    await screen.findByText("Previously Billed");
    expect(screen.getByText("Remaining Contract Balance")).toBeInTheDocument();
    // the saved entry allocates 40%; M-2 is eligible and is billed automatically at its PMS allocation of 25%
    expect(screen.getByText(/Current cycle allocation: 65%/)).toBeInTheDocument();
  });

  it("uses authoritative eligibleForBilling and ineligibilityReason from the backend API", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", {
        billingState: "AVAILABLE",
        eligibleForBilling: true,
        billingReadiness: "NOT_READY",
      }),
      milestone(12, "M-2", "2027-01-20", {
        billingState: "RESERVED",
        eligibleForBilling: false,
        ineligibilityReason: "Milestone claimed by active plan cfg-99",
      }),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    // M-1 is authoritative eligible, so it is billed although PMS readiness says NOT_READY
    await waitFor(() => expectBilled("M-1"));

    // M-2 shows the backend ineligibilityReason and is not billed
    expectNotBilled("M-2");
    expect(screen.getByText("Milestone claimed by active plan cfg-99")).toBeInTheDocument();
  });

  it("displays accurate billingState badges for AVAILABLE, RESERVED, IN_BILLING, and INVOICED", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { billingState: "AVAILABLE" }),
      milestone(12, "M-2", "2027-01-20", { billingState: "RESERVED" }),
      milestone(13, "M-3", "2027-02-15", { billingState: "IN_BILLING" }),
      milestone(14, "M-4", "2027-03-10", { billingState: "INVOICED" }),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Reserved")).toBeInTheDocument();
    expect(screen.getByText("In Billing")).toBeInTheDocument();
    expect(screen.getByText("Invoiced")).toBeInTheDocument();
    expect(screen.queryByText("State unavailable")).not.toBeInTheDocument();
  });

  it("shows 'State unavailable' (never Available) when billingState is missing or null, without changing eligibility", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15"),
      milestone(12, "M-2", "2027-01-20", { billingState: null }),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    expect(screen.getAllByText("State unavailable")).toHaveLength(2);
    expect(screen.getByTestId("billing-state-unavailable-11")).toBeInTheDocument();
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
    // the missing state neither blocks nor grants billing: eligibility still comes from the existing rules
    await waitFor(() => expectBilled("M-1"));
    expectBilled("M-2");
  });

  it("shows 'State unavailable' for an unrecognised billingState and does not display it as Available", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { billingState: "SOMETHING_NEW" }),
      milestone(12, "M-2", "2027-01-20", { billingState: "AVAILABLE" }),
    ]);
    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await chooseMilestonesPlan();

    expect(screen.getByTestId("billing-state-unavailable-11")).toHaveTextContent("State unavailable");
    expect(screen.getByTestId("billing-state-unavailable-11")).toHaveAttribute("title", expect.stringContaining("SOMETHING_NEW"));
    expect(screen.getAllByText("Available")).toHaveLength(1); // only M-2
    expect(screen.queryByTestId("billing-state-unavailable-12")).not.toBeInTheDocument();
  });

  it("protects frozen milestone entries in an existing plan: prevents removal, edits, and preserves in update payload", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { billingState: "IN_BILLING" }),
      milestone(12, "M-2", "2027-01-20", { billingState: "AVAILABLE" }),
    ]);
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      remarks: "plan remarks",
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 60, amount: 60000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: true },
        { paymentEntryId: "entry-2", sequence: 2, percentage: 40, amount: 40000, billingDate: "2027-01-20", pmsMilestoneId: 12, remarks: "Milestone M-2", frozen: false },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-1"));

    // M-1 is frozen: the Billed / Locked indicator is visible and it keeps its own date
    expect(screen.getByTestId("frozen-indicator-11")).toBeInTheDocument();
    expect(billingDateCell("M-1")).toHaveTextContent("15 Dec 2026");
    expectNoDateFields();

    // Save/update plan: frozen entry remains unchanged in payload
    const updateBtn = screen.getByRole("button", { name: /update milestone plan/i });
    await waitFor(() => expect(updateBtn).not.toBeDisabled());
    fireEvent.click(updateBtn);

    await waitFor(() => expect(updateMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    const [planId, payload] = updateMilestonePlanConfiguration.mock.calls[0];
    expect(planId).toBe("plan-9");
    expect(payload.entries[0]).toEqual({
      paymentEntryId: "entry-1",
      sequence: 1,
      percentage: 60,
      billingDate: "2026-12-15",
      remarks: "Milestone M-1",
      pmsMilestoneId: 11,
    });
    expect(payload.entries[1].percentage).toBe(40); // read-only: the PMS allocation stands
    expect(payload.entries[1].billingDate).toBe("2027-01-20"); // M-2's PMS planned due date
  });

  it("does not treat a RESERVED milestone as frozen: its entry in the current plan stays editable", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { billingState: "RESERVED" }),
    ]);
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 50, amount: 50000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: false },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-1"));

    // M-1 is RESERVED, but NOT frozen! It carries no lock and tracks the PMS due date.
    expect(billingDateCell("M-1")).toHaveTextContent("15 Dec 2026");
    expect(screen.queryByTestId("frozen-indicator-11")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unknown-state-indicator-11")).not.toBeInTheDocument();
    expect(arPercent("M-1")).toHaveTextContent("50%"); // the saved share, not the PMS allocation
  });

  it("prevents changing payment structure or deleting the plan when frozen entries exist", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { billingState: "IN_BILLING" }),
    ]);
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 100, amount: 100000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: true },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-1"));

    // Try switching to Full Payment
    fireEvent.click(screen.getByRole("radio", { name: /full payment/i }));
    expect(showStatusToast).toHaveBeenCalledWith(
      "The payment structure cannot be changed because billing has already started for one or more milestones.",
      "error",
    );
    expect(screen.getByRole("radio", { name: /milestones/i })).toBeChecked();

    // Try removing configuration
    const removeBtn = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeBtn);
    expect(showStatusToast).toHaveBeenCalledWith(
      "The milestone plan cannot be deleted because billing has already started for one or more milestones.",
      "error",
    );
  });

  it("frozen:false keeps an entry editable even when the milestone-level billingState is IN_BILLING or INVOICED", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { billingState: "IN_BILLING" }),
      milestone(12, "M-2", "2027-01-20", { billingState: "INVOICED" }),
    ]);
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 30, amount: 30000, billingDate: "2026-12-15", pmsMilestoneId: 11, frozen: false, occurrenceStatus: "SCHEDULED", invoiced: false },
        { paymentEntryId: "entry-2", sequence: 2, percentage: 20, amount: 20000, billingDate: "2027-01-20", pmsMilestoneId: 12, frozen: false },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-1"));

    for (const code of ["M-1", "M-2"]) expectBilled(code);
    expect(screen.queryByTestId("frozen-indicator-11")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unknown-state-indicator-11")).not.toBeInTheDocument();
    // Unfrozen entries follow the PMS due date rather than whatever was saved before.
    expect(billingDateCell("M-1")).toHaveTextContent("15 Dec 2026");
    expect(billingDateCell("M-2")).toHaveTextContent("20 Jan 2027");
  });

  it("occurrenceStatus TAX_PENDING / TAX_CALCULATED / INVOICED or invoiced:true do not override an explicit frozen:false", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15"),
      milestone(12, "M-2", "2027-01-20"),
    ]);
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 30, amount: 30000, billingDate: "2026-12-15", pmsMilestoneId: 11, frozen: false, occurrenceStatus: "TAX_PENDING", invoiced: true },
        { paymentEntryId: "entry-2", sequence: 2, percentage: 20, amount: 20000, billingDate: "2027-01-20", pmsMilestoneId: 12, frozen: false, occurrenceStatus: "INVOICED", invoiced: true },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-1"));

    expectNoDateFields();
    expect(screen.queryByTestId("frozen-indicator-11")).not.toBeInTheDocument();
    expect(screen.queryByTestId("frozen-indicator-12")).not.toBeInTheDocument();
  });

  it("frozen:true locks the entry and shows the occurrence status for information only", async () => {
    getProjectMilestones.mockResolvedValue([milestone(11, "M-1", "2026-12-15", { billingState: "AVAILABLE" })]);
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 30, amount: 30000, billingDate: "2026-12-15", pmsMilestoneId: 11, frozen: true, occurrenceStatus: "TAX_CALCULATED", invoiced: false },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-1"));

    // locked although the milestone-level state says AVAILABLE: the entry's own field decides
    expect(screen.getByTestId("frozen-indicator-11")).toBeInTheDocument();
    expect(screen.getByTestId("frozen-occurrence-11")).toHaveTextContent("TAX_CALCULATED");
    // a locked entry is never rewritten by the auto-fill: its saved share and date stand
    expect(arPercent("M-1")).toHaveTextContent("30%");
    expect(billingDateCell("M-1")).toHaveTextContent("15 Dec 2026");
    expectNoDateFields();
  });

  it("a saved entry without a frozen field is kept read-only as 'unknown' and is NOT resolved from the milestone billingState", async () => {
    getProjectMilestones.mockResolvedValue([
      milestone(11, "M-1", "2026-12-15", { billingState: "INVOICED" }),
      milestone(12, "M-2", "2027-01-20", { billingState: "AVAILABLE" }),
    ]);
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 30, amount: 30000, billingDate: "2026-12-15", pmsMilestoneId: 11, frozen: null },
        { paymentEntryId: "entry-2", sequence: 2, percentage: 20, amount: 20000, billingDate: "2027-01-20", pmsMilestoneId: 12 },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-1"));

    for (const id of [11, 12]) {
      // never presented as backend-confirmed frozen, whatever the aggregate says (INVOICED here, AVAILABLE there)
      expect(screen.queryByTestId(`frozen-indicator-${id}`)).not.toBeInTheDocument();
      expect(screen.getByTestId(`unknown-state-indicator-${id}`)).toBeInTheDocument();
    }
    // read-only, and the saved dates stand: an unknown-state entry is never rewritten
    expect(billingDateCell("M-1")).toHaveTextContent("15 Dec 2026");
    expect(billingDateCell("M-2")).toHaveTextContent("20 Jan 2027");
    expectNoDateFields();
  });

  it("a frozen entry stays protected and does not block saving when its PMS milestone is absent from the list", async () => {
    getProjectMilestones.mockResolvedValue([milestone(12, "M-2", "2027-01-20")]); // M-1 (id 11) deleted in PMS
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 60, amount: 60000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: true, occurrenceStatus: "INVOICED", invoiced: true },
        { paymentEntryId: "entry-2", sequence: 2, percentage: 20, amount: 20000, billingDate: "2027-01-20", pmsMilestoneId: 12, remarks: "Milestone M-2", frozen: false },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-2"));

    // the unavailable-source entry is shown as locked, with no way to remove it
    expect(await screen.findByTestId("unlisted-locked-11")).toHaveTextContent(/source milestone unavailable/i);
    const lockedRow = screen.getByTestId("unlisted-locked-11").closest("li");
    expect(within(lockedRow).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Remove milestones PMS no longer lists/i)).not.toBeInTheDocument();

    // saving is possible and sends the frozen entry back unchanged
    const update = screen.getByRole("button", { name: /update milestone plan/i });
    await waitFor(() => expect(update).not.toBeDisabled());
    fireEvent.click(update);
    await waitFor(() => expect(updateMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    const [, payload] = updateMilestonePlanConfiguration.mock.calls[0];
    expect(payload.entries[0]).toEqual({
      paymentEntryId: "entry-1",
      sequence: 1,
      percentage: 60,
      billingDate: "2026-12-15",
      remarks: "Milestone M-1",
      pmsMilestoneId: 11,
    });
  });

  it("an UNFROZEN entry whose milestone PMS no longer lists can still be removed and blocks saving until it is", async () => {
    getProjectMilestones.mockResolvedValue([milestone(12, "M-2", "2027-01-20")]);
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 60, amount: 60000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: false },
        { paymentEntryId: "entry-2", sequence: 2, percentage: 20, amount: 20000, billingDate: "2027-01-20", pmsMilestoneId: 12, remarks: "Milestone M-2", frozen: false },
      ],
    });

    render(<Harness initial={{}} />);
    await waitFor(() => expectBilled("M-2"));

    expect(screen.queryByTestId("unlisted-locked-11")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update milestone plan/i })).toBeDisabled();
    const row = (await screen.findByText(/PMS milestone 11 —/)).closest("li");
    fireEvent.click(within(row).getByRole("button", { name: /remove/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /update milestone plan/i })).not.toBeDisabled());
  });

  it("after a create, the plan is re-read so saved entries show the authoritative frozen state instead of 'unknown'", async () => {
    // the create response (like the real backend's) carries no frozen field; the re-read does
    createMilestonePlanConfiguration.mockImplementation(async (_cfg, payload) => ({
      milestonePlanId: "plan-1",
      totalContractValue: payload.totalContractValue,
      paymentStructure: payload.paymentStructure,
      entries: payload.entries.map((e, i) => ({ ...e, paymentEntryId: `e${i + 1}`, amount: 0 })),
    }));
    getMilestonePlanByBillingConfiguration
      .mockResolvedValueOnce(null) // initial load: nothing saved yet
      .mockResolvedValueOnce(null) // the save's "is there already a plan" check
      .mockResolvedValue({
        milestonePlanId: "plan-1",
        paymentStructure: "MILESTONES",
        totalContractValue: 100000,
        entries: [
          { paymentEntryId: "e1", sequence: 1, percentage: 25, amount: 25000, billingDate: dayFromToday(0), pmsMilestoneId: 11, frozen: false, occurrenceStatus: null, invoiced: false },
          { paymentEntryId: "e2", sequence: 2, percentage: 25, amount: 25000, billingDate: dayFromToday(1), pmsMilestoneId: 12, frozen: false, occurrenceStatus: null, invoiced: false },
        ],
      });

    render(<Harness initial={{ paymentStructure: "FULL_PAYMENT", entries: [{ billingDate: "2026-12-15", percentage: 100 }] }} />);
    await waitForPlanLoad();
    fireEvent.click(screen.getByRole("radio", { name: /milestones/i }));
    await screen.findByTestId("milestone-row-M-1");
    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith("Milestone plan configuration saved", "success"));
    expect(screen.queryByTestId("unknown-state-indicator-11")).not.toBeInTheDocument();
    expect(billingDateCell("M-1")).toHaveTextContent("15 Dec 2026");
  });

  it("reloading the milestone list (Retry after a failed load) preserves all saved entries and never changes their frozen state from the milestone billingState", async () => {
    // Initial fetch fails; the Retry fetch returns M-1 as IN_BILLING
    getProjectMilestones
      .mockRejectedValueOnce({ response: { status: 503, data: { message: "PMS synchronization temporarily unavailable" } } })
      .mockResolvedValueOnce([
        milestone(11, "M-1", "2026-12-15", { billingState: "IN_BILLING" }),
        milestone(12, "M-2", "2027-01-20", { billingState: "AVAILABLE" }),
      ]);

    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 60, amount: 60000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: false },
        { paymentEntryId: "entry-2", sequence: 2, percentage: 40, amount: 40000, billingDate: "2027-01-20", pmsMilestoneId: 12, remarks: "Milestone M-2", frozen: false },
      ],
    });

    render(<Harness initial={{}} />);
    await screen.findByText("PMS synchronization temporarily unavailable");

    // User clicks Retry to reload the list
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    // After the reload: both entries are preserved. The milestone-level aggregate is now IN_BILLING, but that says nothing
    // about THIS plan's entry: the backend still reports frozen:false, so M-1 stays editable.
    await waitFor(() => expect(getProjectMilestones).toHaveBeenCalledTimes(2));
    await screen.findByText("In Billing");
    expect(screen.queryByTestId("frozen-indicator-11")).not.toBeInTheDocument();
    expectBilled("M-1");
    expect(billingDateCell("M-1")).toHaveTextContent("15 Dec 2026");
    expectBilled("M-2");
    expect(billingDateCell("M-2")).toHaveTextContent("20 Jan 2027");
  });

  it("a failed milestone-list response does not silently remove saved entries and blocks saving", async () => {
    getProjectMilestones.mockRejectedValue({
      response: { status: 503, data: { message: "PMS synchronization temporarily unavailable" } },
    });
    getMilestonePlanByBillingConfiguration.mockResolvedValue({
      milestonePlanId: "plan-9",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "entry-1", sequence: 1, percentage: 60, amount: 60000, billingDate: "2026-12-15", pmsMilestoneId: 11, remarks: "Milestone M-1", frozen: false },
      ],
    });

    render(<Harness initial={{}} />);
    await waitForPlanLoad();

    // Milestone list failed with error
    await screen.findByText("PMS synchronization temporarily unavailable");

    // Save button is disabled because milestones failed to load
    expect(screen.getByRole("button", { name: /update milestone plan/i })).toBeDisabled();
    expect(screen.getByText(/PMS milestones are not loaded/i)).toBeInTheDocument();
    expect(updateMilestonePlanConfiguration).not.toHaveBeenCalled();
  });

  it("ReviewActivateStep displays Locked badge and accessible tooltip consistently for frozen entries", () => {
    const wizardData = {
      projectInfo: { projectName: "Test Project", projectBudget: 100000 },
      billingConfig: {
        billingType: "MILESTONE_PLAN",
        milestonePlan: {
          paymentStructure: "MILESTONES",
          totalContractValue: 100000,
          entries: [
            { paymentEntryId: "entry-1", sequence: 1, percentage: 60, amount: 60000, billingDate: "2026-12-15", pmsMilestoneId: 11, frozen: true },
            { paymentEntryId: "entry-2", sequence: 2, percentage: 40, amount: 40000, billingDate: "2027-01-20", pmsMilestoneId: 12, frozen: false },
          ],
        },
      },
    };

    render(
      <ReviewActivateStep
        wizardData={wizardData}
        projectInfo={wizardData.projectInfo}
      />,
    );

    // Payment 1 is frozen: shows Locked badge with exact accessible tooltip
    const lockedBadge = screen.getByTitle("This milestone is already in billing or invoiced and cannot be modified or removed.");
    expect(lockedBadge).toBeInTheDocument();
    expect(lockedBadge).toHaveTextContent("Locked");

    // Payment 2 is not frozen: no Locked badge
    expect(screen.getAllByText("Payment 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Payment 2").length).toBeGreaterThan(0);
  });
});

describe("MilestonePlanForm — Full Payment and Installments are unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMilestonePlanByBillingConfiguration.mockResolvedValue(null);
    createMilestonePlanConfiguration.mockImplementation(async (_cfg, payload) => ({
      milestonePlanId: "plan-1",
      paymentStructure: payload.paymentStructure,
      totalContractValue: payload.totalContractValue,
      entries: payload.entries,
    }));
  });

  // A new plan (nothing saved) is reset to the Full Payment default once the load finishes.
  const settled = async () => {
    await waitForPlanLoad();
    await waitFor(() => expect(screen.queryByText(/Loading saved milestone plan/)).not.toBeInTheDocument());
  };

  const typeInto = (container, selector, value) => fireEvent.change(container.querySelector(selector), { target: { value } });

  it("saves Full Payment with the old request shape and never touches the milestone API", async () => {
    const { container } = render(<Harness initial={{}} />);
    await settled();
    typeInto(container, "#paymentBillingDate-0", "2026-12-15");

    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(createMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    expect(createMilestonePlanConfiguration.mock.calls[0][1]).toEqual({
      totalContractValue: 100000,
      paymentStructure: "FULL_PAYMENT",
      entries: [{ sequence: 1, percentage: 100, billingDate: "2026-12-15", remarks: "" }],
      remarks: "",
    });
    expect(getProjectMilestones).not.toHaveBeenCalled();
  });

  it("saves Installments with the old request shape", async () => {
    const { container } = render(<Harness initial={{}} />);
    await settled();
    fireEvent.click(screen.getByRole("radio", { name: /installments/i }));
    typeInto(container, "#paymentPercentage-0", "40");
    typeInto(container, "#paymentBillingDate-0", "2026-11-01");
    fireEvent.click(screen.getByRole("button", { name: /add installment/i }));
    typeInto(container, "#paymentPercentage-1", "60");
    typeInto(container, "#paymentBillingDate-1", "2026-12-01");

    const save = screen.getByRole("button", { name: /save milestone plan/i });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(createMilestonePlanConfiguration).toHaveBeenCalledTimes(1));
    const payload = createMilestonePlanConfiguration.mock.calls[0][1];
    expect(payload.paymentStructure).toBe("INSTALLMENTS");
    expect(payload.entries).toEqual([
      { sequence: 1, percentage: 40, billingDate: "2026-11-01", remarks: "" },
      { sequence: 2, percentage: 60, billingDate: "2026-12-01", remarks: "" },
    ]);
    expect(getProjectMilestones).not.toHaveBeenCalled();
  });
});

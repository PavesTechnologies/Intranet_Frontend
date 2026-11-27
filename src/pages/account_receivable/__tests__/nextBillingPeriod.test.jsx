import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("../../../components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

import api from "../../../api/axiosInstance";
import { showStatusToast } from "../../../components/toastfy/toast";
import {
  fetchNextBillingPeriod,
  normalizeNextBillingPeriod,
} from "../services/billingDataAcquisitionService";
import NextBillingPeriodCard from "../components/acquisition/NextBillingPeriodCard";
import AcquisitionDetail from "../pages/AcquisitionDetail";

const CONFIG_ID = "3f2b9c1e-8a4d-4c6e-9b1a-2d3e4f5a6b7c";
const NEXT_PERIOD_URL = `/api/billing-data-acquisition/configurations/${CONFIG_ID}/next-period`;

// Shape of NextBillingPeriodResponseDto wrapped in the backend ApiResponse envelope.
function nextPeriodResponse(overrides = {}) {
  const data = {
    projectId: 101,
    billingConfigurationId: CONFIG_ID,
    billingFrequency: "WEEKLY",
    effectiveFrom: "2026-11-02",
    billingPeriodStart: "2026-11-09",
    billingPeriodEnd: "2026-11-15",
    partialPeriod: false,
    periodEnded: true,
    acquisitionAllowed: true,
    alreadyInvoiced: false,
    returnedRecordCount: 5,
    eligibleRecordCount: 5,
    eligibleHours: 40,
    alreadyClaimedCount: 0,
    notApprovedCount: 0,
    invalidHoursCount: 0,
    alreadyClaimedTimesheetIds: [],
    previousSnapshotId: "a1",
    previousPeriodStart: "2026-11-02",
    previousPeriodEnd: "2026-11-08",
    previousSnapshotStatus: "INVOICED",
    previousPeriodInvoiced: true,
    reason: "Billing period 2026-11-09 to 2026-11-15 has ended and has 5 approved billable timesheet(s) (40 hours) not yet billed.",
    ...overrides,
  };
  return { data: { success: true, message: data.reason, data } };
}

describe("fetchNextBillingPeriod — API mapping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the next-period endpoint and passes the backend period through unchanged", async () => {
    api.get.mockResolvedValueOnce(nextPeriodResponse());
    const result = await fetchNextBillingPeriod(CONFIG_ID);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.mock.calls[0][0]).toContain(NEXT_PERIOD_URL);
    expect(result).toMatchObject({
      billingConfigurationId: CONFIG_ID,
      billingFrequency: "WEEKLY",
      billingPeriodStart: "2026-11-09",
      billingPeriodEnd: "2026-11-15",
      partialPeriod: false,
      acquisitionAllowed: true,
      eligibleRecordCount: 5,
      eligibleHours: 40,
      alreadyClaimedCount: 0,
      hasPeriod: true,
    });
  });

  it("rejects an invalid configuration id without calling the backend", async () => {
    await expect(fetchNextBillingPeriod("not-a-uuid")).rejects.toThrow(/valid billing configuration ID/i);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("never reports acquisition allowed when the backend returned no period", () => {
    const result = normalizeNextBillingPeriod({ acquisitionAllowed: true, billingPeriodStart: null, billingPeriodEnd: null });
    expect(result.acquisitionAllowed).toBe(false);
    expect(result.hasPeriod).toBe(false);
  });

  it("falls back to the envelope message when the DTO has no reason", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, message: "Envelope reason", data: { billingConfigurationId: CONFIG_ID } } });
    const result = await fetchNextBillingPeriod(CONFIG_ID);
    expect(result.reason).toBe("Envelope reason");
  });

  it("maps a network failure to a connectivity message", async () => {
    api.get.mockRejectedValueOnce(Object.assign(new Error("Network Error"), { request: {} }));
    const err = await fetchNextBillingPeriod(CONFIG_ID).catch((e) => e);
    expect(err.isNetworkError).toBe(true);
    expect(err.message).toMatch(/could not be reached/i);
  });

  it("surfaces a backend error message for HTTP failures", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 404, data: { message: "Billing configuration not found." } } });
    await expect(fetchNextBillingPeriod(CONFIG_ID)).rejects.toThrow("Billing configuration not found.");
  });
});

describe("NextBillingPeriodCard", () => {
  const renderCard = (props) =>
    render(<NextBillingPeriodCard onAcquire={vi.fn()} onRefresh={vi.fn()} {...props} />);

  it("shows period, frequency, eligible counts and enables Acquire when allowed", () => {
    const onAcquire = vi.fn();
    const nextPeriod = normalizeNextBillingPeriod(nextPeriodResponse().data.data);
    renderCard({ nextPeriod, onAcquire });

    expect(screen.getByText("09 Nov 2026 - 15 Nov 2026")).toBeInTheDocument();
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /acquire period/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onAcquire).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["DAILY", "Daily"],
    ["MONTHLY", "Monthly"],
    ["BI_WEEKLY", "Bi Weekly"],
  ])("labels %s frequency", (raw, label) => {
    renderCard({ nextPeriod: normalizeNextBillingPeriod({ ...nextPeriodResponse().data.data, billingFrequency: raw }) });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("marks a partial period", () => {
    renderCard({
      nextPeriod: normalizeNextBillingPeriod({
        ...nextPeriodResponse().data.data,
        billingPeriodStart: "2026-11-12",
        partialPeriod: true,
      }),
    });
    expect(screen.getByText("Partial period")).toBeInTheDocument();
    expect(screen.getByText("12 Nov 2026 - 15 Nov 2026")).toBeInTheDocument();
  });

  it("disables Acquire for an unfinished period and shows the backend reason", () => {
    const reason = "The next billing period 2026-11-23 to 2026-11-29 ends on 2026-11-29 and can be acquired once it has ended.";
    renderCard({
      nextPeriod: normalizeNextBillingPeriod({
        ...nextPeriodResponse().data.data,
        billingPeriodStart: "2026-11-23",
        billingPeriodEnd: "2026-11-29",
        periodEnded: false,
        acquisitionAllowed: false,
        eligibleRecordCount: null,
        eligibleHours: null,
        reason,
      }),
    });
    expect(screen.getByRole("button", { name: /acquire period/i })).toBeDisabled();
    expect(screen.getByText(reason)).toBeInTheDocument();
  });

  it("presents a TMS connectivity reason as an alert", () => {
    const reason = "Timesheets could not be read from TMS for 2026-11-09 to 2026-11-15: Connection refused";
    renderCard({
      nextPeriod: normalizeNextBillingPeriod({ ...nextPeriodResponse().data.data, acquisitionAllowed: false, reason }),
    });
    expect(screen.getByRole("alert")).toHaveTextContent(reason);
    expect(screen.getByRole("button", { name: /acquire period/i })).toBeDisabled();
  });

  it("shows an API error and keeps Acquire disabled", () => {
    renderCard({ nextPeriod: null, error: "The AR billing service could not be reached." });
    expect(screen.getByRole("alert")).toHaveTextContent("could not be reached");
    expect(screen.getByRole("button", { name: /acquire period/i })).toBeDisabled();
  });

  it("lists earlier blocked periods with their backend reasons and keeps the READY period acquirable", () => {
    const warning =
      "Billing period 2026-11-02 to 2026-11-08 has unbilled records but cannot be acquired: No active hourly rate for timesheet [T9] on 2026-11-04.";
    const onAcquire = vi.fn();
    renderCard({
      nextPeriod: normalizeNextBillingPeriod({ ...nextPeriodResponse().data.data, warnings: [warning, "", null] }),
      onAcquire,
    });
    const box = screen.getByLabelText("Earlier blocked periods");
    expect(within(box).getAllByRole("listitem")).toHaveLength(1);
    expect(within(box).getByText(warning)).toBeInTheDocument();
    expect(box).toHaveTextContent(/do not block the period above/i);
    const button = screen.getByRole("button", { name: /acquire period/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onAcquire).toHaveBeenCalledTimes(1);
  });

  it("treats a missing warnings field as no warnings", () => {
    const data = { ...nextPeriodResponse().data.data };
    delete data.warnings;
    const nextPeriod = normalizeNextBillingPeriod(data);
    expect(nextPeriod.warnings).toEqual([]);
    renderCard({ nextPeriod });
    expect(screen.queryByLabelText("Earlier blocked periods")).not.toBeInTheDocument();
  });

  it("explains when every period has been acquired", () => {
    renderCard({
      nextPeriod: normalizeNextBillingPeriod({
        billingConfigurationId: CONFIG_ID,
        billingFrequency: "WEEKLY",
        acquisitionAllowed: false,
        reason: "Every billing period of this Billing Configuration has already been acquired.",
      }),
    });
    expect(screen.getByText(/already been acquired/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /acquire period/i })).toBeDisabled();
  });
});

describe("AcquisitionDetail — next eligible period workflow", () => {
  const baseConfig = {
    projectId: 101,
    projectName: "Atlas",
    client: "Acme",
    currency: "USD",
    billingConfigurationId: CONFIG_ID,
    billingTypeCode: "TIME_MATERIAL",
    billingType: "TIME_MATERIAL",
    billingStatus: "NOT_ACQUIRED",
    expenseBillingEligible: false,
  };

  function renderDetail(config = baseConfig) {
    return render(
      <MemoryRouter initialEntries={[{ pathname: "/ar/101", state: { config } }]}>
        <Routes>
          <Route path="/ar/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );
  }

  const nextPeriodCalls = () => api.get.mock.calls.filter(([url]) => String(url).includes("/next-period"));

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("Week 1 invoiced → offers Week 2, acquires its exact dates, then offers Week 3", async () => {
    let nextPeriodCall = 0;
    api.get.mockImplementation((url) => {
      if (String(url).includes("/next-period")) {
        nextPeriodCall += 1;
        return Promise.resolve(
          nextPeriodCall === 1
            ? nextPeriodResponse()
            : nextPeriodResponse({
                billingPeriodStart: "2026-11-16",
                billingPeriodEnd: "2026-11-22",
                eligibleRecordCount: 4,
                eligibleHours: 32,
                previousPeriodStart: "2026-11-09",
                previousPeriodEnd: "2026-11-15",
                previousSnapshotStatus: "READY_FOR_TAX",
                previousPeriodInvoiced: false,
                reason: "Billing period 2026-11-16 to 2026-11-22 has ended and has 4 approved billable timesheet(s) (32 hours) not yet billed.",
              })
        );
      }
      return Promise.resolve({ data: { success: true, data: null } });
    });
    api.post.mockImplementation((url) => {
      if (String(url).endsWith("/api/v1/billing-snapshots")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              snapshotId: "b2",
              snapshotNumber: "BS-0002",
              status: "READY_FOR_TAX",
              billingPeriodStart: "2026-11-09",
              billingPeriodEnd: "2026-11-15",
              laborAmount: 4000,
              timesheets: [{ sourceReferenceId: "t1", employee: "A", workDate: "2026-11-10", hours: 8, rate: 100, amount: 800 }],
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    renderDetail();

    const card = await screen.findByRole("region", { name: /next billing period/i });
    await within(card).findByText("09 Nov 2026 - 15 Nov 2026");
    expect(nextPeriodCalls()).toHaveLength(1);

    const headerAcquire = screen.getByRole("button", { name: /acquire snapshot/i });
    expect(headerAcquire).toBeEnabled();
    fireEvent.click(headerAcquire);

    await waitFor(() => {
      const snapshotPosts = api.post.mock.calls.filter(([url]) => String(url).endsWith("/api/v1/billing-snapshots"));
      expect(snapshotPosts).toHaveLength(1);
      expect(snapshotPosts[0][1]).toEqual({
        projectId: 101,
        billingConfigurationId: CONFIG_ID,
        billingPeriodStart: "2026-11-09",
        billingPeriodEnd: "2026-11-15",
      });
    });

    await within(card).findByText("16 Nov 2026 - 22 Nov 2026");
    expect(nextPeriodCalls()).toHaveLength(2);
    expect(screen.queryByText(/select billing period/i)).not.toBeInTheDocument();
  });

  it("keeps acquisition disabled and posts nothing when the backend disallows it", async () => {
    const reason = "The next billing period 2026-11-23 to 2026-11-29 ends on 2026-11-29 and can be acquired once it has ended.";
    api.get.mockImplementation((url) =>
      Promise.resolve(
        String(url).includes("/next-period")
          ? nextPeriodResponse({
              billingPeriodStart: "2026-11-23",
              billingPeriodEnd: "2026-11-29",
              periodEnded: false,
              acquisitionAllowed: false,
              reason,
            })
          : { data: { success: true, data: null } }
      )
    );

    renderDetail();

    expect(await screen.findByText(reason)).toBeInTheDocument();
    const headerAcquire = screen.getByRole("button", { name: /acquire snapshot/i });
    expect(headerAcquire).toBeDisabled();
    expect(screen.getByRole("button", { name: /acquire period/i })).toBeDisabled();
    fireEvent.click(headerAcquire);
    expect(api.post).not.toHaveBeenCalled();
    expect(nextPeriodCalls()).toHaveLength(1);
  });

  it("shows a load error, and Refresh re-queries the backend", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500, data: { message: "Billing period lookup failed." } } });
    renderDetail();

    expect(await screen.findByText("Billing period lookup failed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /acquire snapshot/i })).toBeDisabled();

    api.get.mockResolvedValueOnce(nextPeriodResponse());
    fireEvent.click(screen.getByRole("button", { name: /refresh next billing period/i }));
    expect(await screen.findByText("09 Nov 2026 - 15 Nov 2026")).toBeInTheDocument();
    expect(nextPeriodCalls()).toHaveLength(2);
    expect(showStatusToast).not.toHaveBeenCalledWith(expect.stringMatching(/lookup failed/), "error");
  });
});

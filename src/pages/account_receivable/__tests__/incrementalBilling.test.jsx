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
  fetchBillingPeriods,
  createIncrementalBatch,
  normalizeBillingPeriodDiscovery,
} from "../services/billingDataAcquisitionService";
import IncrementalBillingPanel, { getBatchInvoiceAction } from "../components/acquisition/IncrementalBillingPanel";
import AcquisitionDetail from "../pages/AcquisitionDetail";

const CONFIG_ID = "3f2b9c1e-8a4d-4c6e-9b1a-2d3e4f5a6b7c";

const batch = (seq, overrides = {}) => ({
  snapshotId: `00000000-0000-4000-8000-00000000000${seq}`,
  snapshotNumber: `BS-000${seq}`,
  batchSequence: seq,
  snapshotStatus: "READY_FOR_TAX",
  totalAmount: 800 * seq,
  timesheetCount: seq,
  expenseCount: 0,
  createdDate: "2026-11-12T10:00:00",
  invoiceId: null,
  invoiceNumber: null,
  invoiceStatus: null,
  ...overrides,
});

// Shape of BillingPeriodAcquisitionDto.
const period = (overrides = {}) => ({
  periodNumber: 2,
  billingPeriodStart: "2026-11-04",
  billingPeriodEnd: "2026-11-10",
  billingDate: "2026-11-10",
  partialPeriod: false,
  periodEnded: true,
  newTimesheetCount: 3,
  newBillableHours: 24,
  estimatedTimesheetAmount: 2400,
  newExpenseCount: 1,
  newExpenseAmount: 150,
  hasNewItems: true,
  previouslyAcquired: false,
  rateValidationPassed: true,
  readiness: "READY",
  blockingReasons: [],
  batches: [],
  ...overrides,
});

const discoveryResponse = (periods, warnings = []) => ({
  data: {
    success: true,
    message: "Billing periods retrieved successfully.",
    data: {
      billingConfigurationId: CONFIG_ID,
      projectId: 101,
      billingFrequency: "WEEKLY",
      scheduleStart: "2026-10-28",
      scheduleEnd: "2026-11-17",
      expenseBillingEnabled: true,
      asOf: "2026-11-26",
      warnings,
      periods,
    },
  },
});

describe("incremental billing service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests periods with onlyWithNewItems=false and keeps every batch of a period", async () => {
    api.get.mockResolvedValueOnce(discoveryResponse([period({ batches: [batch(1), batch(2)], previouslyAcquired: true })]));
    const result = await fetchBillingPeriods(CONFIG_ID);

    expect(api.get.mock.calls[0][0]).toContain(`/api/billing-data-acquisition/configurations/${CONFIG_ID}/periods`);
    expect(api.get.mock.calls[0][1]).toEqual({ params: { onlyWithNewItems: false } });
    expect(result.periods[0]).toMatchObject({
      key: "2026-11-04..2026-11-10",
      newTimesheetCount: 3,
      newBillableHours: 24,
      newExpenseCount: 1,
      newExpenseAmount: 150,
      estimatedTimesheetAmount: 2400,
      readiness: "READY",
    });
    expect(result.periods[0].batches.map((b) => b.batchSequence)).toEqual([1, 2]);
  });

  it("posts the period and idempotency key, and recognises the backend's no-new-items answer", async () => {
    api.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: "No new approved, billable timesheets or eligible expenses were found for billing period 2026-11-04 to 2026-11-10.",
      },
    });
    const result = await createIncrementalBatch(CONFIG_ID, {
      billingPeriodStart: "2026-11-04",
      billingPeriodEnd: "2026-11-10",
      idempotencyKey: "key-1",
    });
    expect(api.post.mock.calls[0][0]).toContain(`/configurations/${CONFIG_ID}/batches`);
    expect(api.post.mock.calls[0][1]).toEqual({
      billingPeriodStart: "2026-11-04",
      billingPeriodEnd: "2026-11-10",
      idempotencyKey: "key-1",
    });
    expect(result).toMatchObject({ success: false, noNewItems: true, snapshot: null });
  });

  it("marks a network failure as an unknown outcome", async () => {
    api.post.mockRejectedValueOnce(new Error("Network Error"));
    const err = await createIncrementalBatch(CONFIG_ID, {
      billingPeriodStart: "2026-11-04",
      billingPeriodEnd: "2026-11-10",
      idempotencyKey: "k",
    }).catch((e) => e);
    expect(err.outcomeUnknown).toBe(true);
  });
});

describe("IncrementalBillingPanel", () => {
  const renderPanel = (periods, props = {}) =>
    render(
      <IncrementalBillingPanel
        discovery={normalizeBillingPeriodDiscovery(discoveryResponse(periods).data.data)}
        currency="USD"
        onRefresh={vi.fn()}
        onCreateBatch={vi.fn()}
        onOpenBatch={vi.fn()}
        onBatchInvoice={vi.fn()}
        {...props}
      />
    );

  it("enables Create Batch only for READY and shows each readiness state", () => {
    renderPanel([
      period({ billingPeriodStart: "2026-10-28", billingPeriodEnd: "2026-11-03", readiness: "NO_NEW_ITEMS", hasNewItems: false, newTimesheetCount: 0, previouslyAcquired: true, batches: [batch(1)] }),
      period(),
      period({ billingPeriodStart: "2026-11-11", billingPeriodEnd: "2026-11-17", readiness: "BLOCKED", blockingReasons: ["No active hourly rate for timesheet [T9] on 2026-11-12."] }),
    ]);
    const buttons = screen.getAllByRole("button", { name: /create batch/i });
    // newest first: BLOCKED, READY, NO_NEW_ITEMS
    expect(buttons.map((b) => b.disabled)).toEqual([true, false, true]);
    expect(screen.getByText(/No active hourly rate for timesheet \[T9\]/)).toBeInTheDocument();
    expect(screen.getByText(/No new approved records since the last batch/)).toBeInTheDocument();
  });

  it("shows the source integration error for SOURCE_UNAVAILABLE", () => {
    renderPanel(
      [period({ readiness: "SOURCE_UNAVAILABLE", newTimesheetCount: null, blockingReasons: ["Timesheets could not be read from TMS: timeout"] })],
      {}
    );
    expect(screen.getAllByText(/Timesheets could not be read from TMS: timeout/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /create batch/i })).toBeDisabled();
  });

  it("lists multiple batches of one period with per-batch invoice actions", () => {
    renderPanel([
      period({
        previouslyAcquired: true,
        batches: [
          batch(1, { snapshotStatus: "INVOICED", invoiceId: "inv-1", invoiceNumber: "INV-001", invoiceStatus: "APPROVED" }),
          batch(2, { snapshotStatus: "TAX_COMPLETED" }),
          batch(3),
        ],
      }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: /show 3 batches/i }));
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
    expect(within(rows[1]).getByRole("button", { name: /generate invoice/i })).toBeInTheDocument();
    expect(within(rows[2]).getByRole("button", { name: /calculate tax/i })).toBeInTheDocument();
  });

  it("shows overlapping snapshots separately from batches and keeps them out of the batch count", () => {
    renderPanel([
      period({
        previouslyAcquired: true,
        batches: [batch(1, { billingPeriodStart: "2026-11-04", billingPeriodEnd: "2026-11-10", periodAligned: true })],
        overlappingSnapshots: [
          batch(7, {
            snapshotNumber: "BS-0007",
            billingPeriodStart: "2026-11-01",
            billingPeriodEnd: "2026-11-30",
            periodAligned: false,
            snapshotStatus: "INVOICED",
            invoiceId: "inv-7",
            invoiceNumber: "INV-0007",
          }),
          batch(8, { snapshotNumber: "BS-0008", billingPeriodStart: "2026-10-01", billingPeriodEnd: "2026-11-05", periodAligned: false }),
        ],
      }),
    ]);

    const overlap = screen.getByLabelText("Overlapping snapshots");
    expect(overlap).toHaveTextContent(/not batches of this period/i);
    expect(within(overlap).getByText("BS-0007")).toBeInTheDocument();
    expect(within(overlap).getByText("01 Nov 2026 - 30 Nov 2026")).toBeInTheDocument();
    expect(within(overlap).getByText("INV-0007")).toBeInTheDocument();
    expect(within(overlap).getByText("No invoice")).toBeInTheDocument();
    expect(within(overlap).getAllByText("Non-aligned period")).toHaveLength(2);
    expect(within(overlap).queryByRole("button")).not.toBeInTheDocument();

    // Batch metric and toggle count only the real batch.
    expect(screen.getByText("Batches").nextSibling).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: /show 1 batch$/i }));
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(1);
    expect(screen.queryByRole("cell", { name: /BS-0007/ })).not.toBeInTheDocument();
  });

  it("handles a backend that sends no overlappingSnapshots field", () => {
    const raw = period();
    delete raw.overlappingSnapshots;
    const normalized = normalizeBillingPeriodDiscovery(discoveryResponse([raw]).data.data);
    expect(normalized.periods[0].overlappingSnapshots).toEqual([]);
    renderPanel([raw]);
    expect(screen.queryByLabelText("Overlapping snapshots")).not.toBeInTheDocument();
  });

  it("offers no invoice action for a cancelled batch", () => {
    expect(getBatchInvoiceAction(batch(1, { snapshotStatus: "CANCELLED" }))).toBeNull();
  });
});

describe("AcquisitionDetail — create a batch", () => {
  const config = {
    projectId: 101,
    projectName: "Atlas",
    client: "Acme",
    currency: "USD",
    billingConfigurationId: CONFIG_ID,
    billingTypeCode: "TIME_MATERIAL",
    billingType: "TIME_MATERIAL",
    billingStatus: "NOT_ACQUIRED",
    expenseBillingEligible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("creates one batch per action, shows it, and refreshes the periods", async () => {
    let discoveryCalls = 0;
    api.get.mockImplementation((url) => {
      if (String(url).includes("/periods")) {
        discoveryCalls += 1;
        return Promise.resolve(
          discoveryResponse([
            discoveryCalls === 1
              ? period({ batches: [batch(1)], previouslyAcquired: true })
              : period({ readiness: "NO_NEW_ITEMS", hasNewItems: false, newTimesheetCount: 0, newBillableHours: 0, newExpenseCount: 0, newExpenseAmount: 0, estimatedTimesheetAmount: null, previouslyAcquired: true, batches: [batch(1), batch(2)] }),
          ])
        );
      }
      if (String(url).includes("/next-period")) {
        return Promise.resolve({ data: { success: true, data: { billingConfigurationId: CONFIG_ID, acquisitionAllowed: false, reason: "n/a" } } });
      }
      return Promise.resolve({ data: { success: true, data: null } });
    });
    let resolvePost;
    api.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );

    render(
      <MemoryRouter initialEntries={[{ pathname: "/ar/101", state: { config } }]}>
        <Routes>
          <Route path="/ar/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const create = await screen.findByRole("button", { name: /create batch/i });
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    fireEvent.click(create);
    fireEvent.click(create);

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url, body] = api.post.mock.calls[0];
    expect(url).toContain(`/configurations/${CONFIG_ID}/batches`);
    expect(body.billingPeriodStart).toBe("2026-11-04");
    expect(body.billingPeriodEnd).toBe("2026-11-10");
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);

    resolvePost({
      data: {
        success: true,
        message: "Billing batch 2 created for billing period 2026-11-04 to 2026-11-10.",
        data: {
          snapshotId: "00000000-0000-4000-8000-000000000002",
          snapshotNumber: "BS-0002",
          projectId: 101,
          billingConfigurationId: CONFIG_ID,
          billingPeriodStart: "2026-11-04",
          billingPeriodEnd: "2026-11-10",
          status: "READY_FOR_TAX",
          batchSequence: 2,
          currencyCode: "USD",
          subtotal: 1600,
          expenseAmount: 0,
          totalAmount: 1600,
          timesheets: [{ sourceReferenceId: "T4", employee: "A", workDate: "2026-11-06", hours: 8, rate: 100, amount: 800 }],
          expenses: [],
        },
      },
    });

    expect(await screen.findByText("BS-0002")).toBeInTheDocument();
    await waitFor(() => expect(discoveryCalls).toBe(2));
    expect(showStatusToast).toHaveBeenCalledWith(expect.stringMatching(/Billing batch 2 created/), "success");
    expect(await screen.findByText(/No new approved records since the last batch/)).toBeInTheDocument();
  });
});

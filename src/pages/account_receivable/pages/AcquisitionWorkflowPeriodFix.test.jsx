import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcquisitionDetail from "./AcquisitionDetail";
import * as acquisitionService from "../services/billingDataAcquisitionService";
import api from "../../../api/axiosInstance";

// Mock axios instance
vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import { showStatusToast } from "../../../components/toastfy/toast";

// Mock toast notifications
vi.mock("../../../components/toastfy/toast", () => ({
  showStatusToast: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Acquisition Workflow Restoration & Clean Configuration Isolation", () => {
  const mockCleanConfig = {
    id: 55,
    projectId: 55,
    billingConfigurationId: 301,
    projectName: "NexGen ERP",
    client: "Global Enterprises",
    billingType: "TIME_MATERIAL",
    billingTypeCode: "TIME_MATERIAL",
    billingFrequency: "MONTHLY",
    billingPeriodStart: "2026-10-01",
    billingPeriodEnd: "2026-10-31",
    billingPeriod: "01 Oct 2026 - 31 Oct 2026",
    currency: "USD",
    paymentTerms: "Net 30",
    billingStatus: "NOT_ACQUIRED",
    invoiceGeneration: "AUTOMATIC",
  };

  const mockInvoicedPeriodSnapshot = {
    snapshotId: "snap-inv-202609",
    snapshotNumber: "BS-20260930154115",
    status: "INVOICED",
    acquisitionStatus: "ALREADY_BILLED",
    projectId: 55,
    billingPeriodStart: "2026-09-01",
    billingPeriodEnd: "2026-09-30",
    billingPeriod: "01 Sep 2026 - 30 Sep 2026",
    subtotal: 1200.0,
    totalAmount: 1200.0,
    timesheets: [
      {
        id: "ts-sept-1",
        employee: "Senior Architect",
        workDate: "2026-09-15",
        hours: 10,
        rate: 120,
        amount: 1200,
        approvalStatus: "Approved",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockReset();
    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: [] });
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Scenario 1: New configuration with no snapshot in backend displays the initial acquisition UI
  // even if stale localStorage had an old INVOICED snapshot for that projectId
  it("Scenario 1: Newly activated billing configuration with no backend snapshot displays initial acquisition workflow, clearing stale localStorage", async () => {
    // Seed stale localStorage from an old database state
    acquisitionService.saveAcquiredSnapshotMetadata(55, {
      projectId: 55,
      billingConfigurationId: 99, // Mismatched old config ID
      snapshotId: "stale-snap-id",
      snapshotNumber: "BS-20260930154115",
      status: "INVOICED",
      billingPeriodStart: "2026-09-30",
      billingPeriodEnd: "2026-10-30",
      subtotal: 0,
      totalAmount: 0,
    });

    // Backend returns null because DB was cleaned
    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/account-receivable/billing-data-acquisition/55",
            state: { config: mockCleanConfig },
          },
        ]}
      >
        <Routes>
          <Route
            path="/account-receivable/billing-data-acquisition/:projectId"
            element={<AcquisitionDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Initial acquisition header displays "Not Yet Acquired" and NOT_ACQUIRED badge
    await waitFor(() => {
      expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
    });

    // Stale snapshot BS-20260930154115 and View Invoice must NOT appear
    expect(screen.queryByText("BS-20260930154115")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view invoice/i })).not.toBeInTheDocument();

    // The Acquire Snapshot button must be visible as the single primary action in the header
    const acquireButtons = screen.getAllByRole("button", { name: /acquire snapshot/i });
    expect(acquireButtons.length).toBe(1);

    // Duplicate controls (Billing Period Selection and Start Acquisition) must NOT be present
    expect(screen.queryByText("Billing Period Selection")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start acquisition/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/initiate source data acquisition/i)).not.toBeInTheDocument();

    // Project and Client details must be visible in the summary
    expect(screen.getAllByText("NexGen ERP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Global Enterprises")).toBeInTheDocument();

    // Billing Readiness panel displays Snapshot Not Acquired
    expect(screen.getByText("Snapshot Not Acquired")).toBeInTheDocument();
    expect(
      screen.getByText("Billing data has not been acquired for this billing period yet.")
    ).toBeInTheDocument();

    // Verify localStorage stale metadata was cleared
    const meta = acquisitionService.getAcquiredSnapshotMetadata(55, 301);
    expect(meta).toBeNull();
  });

  // Scenario 2: Existing invoiced snapshot displays View Invoice action
  it("Scenario 2: Existing invoiced snapshots remain accessible and display View Invoice action", async () => {
    // Backend returns invoiced snapshot for this configuration
    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({
          data: { success: true, data: mockInvoicedPeriodSnapshot },
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/account-receivable/billing-data-acquisition/55",
            state: {
              config: {
                ...mockCleanConfig,
                billingStatus: "INVOICED",
                snapshotNumber: "BS-20260930154115",
                snapshotId: "snap-inv-202609",
              },
            },
          },
        ]}
      >
        <Routes>
          <Route
            path="/account-receivable/billing-data-acquisition/:projectId"
            element={<AcquisitionDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Invoiced snapshot loads: BS-20260930154115 and View Invoice appear
    await waitFor(() => {
      expect(screen.getByText("BS-20260930154115")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
    expect(screen.getByText("Billing Period Invoiced")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /acquire snapshot/i })).not.toBeInTheDocument();
  });

  // Scenario 3: Performing acquisition transitions cleanly to acquired snapshot with Calculate Tax action
  it("Scenario 3: Executing Acquire Snapshot transitions to acquired state and allows proceeding to tax calculation", async () => {
    const mockCreatedSnapshot = {
      snapshotId: "snap-new-oct",
      snapshotNumber: "BS-20261031-001",
      status: "READY_FOR_TAX",
      acquisitionStatus: "READY",
      projectId: 55,
      billingPeriodStart: "2026-10-01",
      billingPeriodEnd: "2026-10-31",
      subtotal: 5000.0,
      totalAmount: 5000.0,
      timesheets: [
        {
          id: "ts-oct-1",
          employee: "Jane Engineer",
          workDate: "2026-10-15",
          hours: 40,
          rate: 125,
          amount: 5000,
          approvalStatus: "Approved",
          role: "Lead Developer",
        },
      ],
      readiness: {
        requiredCount: 1,
        approvedCount: 1,
        pendingCount: 0,
        approvedHours: 40,
        pendingHours: 0,
        pendingTimesheets: [],
      },
    };

    api.post.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots")) {
        return Promise.resolve({ data: mockCreatedSnapshot });
      }
      if (url.includes("/api/billing-data-acquisition/acquire")) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.reject(new Error(`Unhandled POST URL: ${url}`));
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/account-receivable/billing-data-acquisition/55",
            state: { config: mockCleanConfig },
          },
        ]}
      >
        <Routes>
          <Route
            path="/account-receivable/billing-data-acquisition/:projectId"
            element={<AcquisitionDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    const acquireBtn = screen.getByRole("button", { name: /acquire snapshot/i });
    fireEvent.click(acquireBtn);

    // After acquisition, snapshot number appears
    await waitFor(() => {
      expect(screen.getByText("BS-20261031-001")).toBeInTheDocument();
    });

    // Calculate Tax button appears
    const calcTaxBtn = screen.getByRole("button", { name: /calculate tax/i });
    expect(calcTaxBtn).toBeInTheDocument();

    // Clicking Calculate Tax navigates to the tax calculation view
    fireEvent.click(calcTaxBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      "/account-receivable/tax-calculation/snap-new-oct",
      expect.objectContaining({
        state: expect.objectContaining({
          config: expect.objectContaining({
            snapshotId: "snap-new-oct",
          }),
        }),
      })
    );
  });

  // Scenario 4: Configuration-scoped lookup passes billingConfigurationId and rejects snapshots belonging to other configurations
  it("Scenario 4: Configuration-scoped lookup passes billingConfigurationId in API request and rejects snapshots from other configurations", async () => {
    let capturedParams = null;
    api.get.mockImplementation((url, options) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        capturedParams = options?.params;
        // Backend returns a snapshot that belongs to a different billingConfigurationId (e.g., 999)
        return Promise.resolve({
          data: {
            success: true,
            data: {
              snapshotId: "snap-other-config",
              snapshotNumber: "BS-OTHER-001",
              status: "READY_FOR_TAX",
              projectId: 55,
              billingConfigurationId: 999, // Mismatched configuration ID
              billingPeriodStart: "2026-10-01",
              billingPeriodEnd: "2026-10-31",
              subtotal: 3000,
              totalAmount: 3000,
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/account-receivable/billing-data-acquisition/55",
            state: { config: mockCleanConfig },
          },
        ]}
      >
        <Routes>
          <Route
            path="/account-receivable/billing-data-acquisition/:projectId"
            element={<AcquisitionDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Verify billingConfigurationId was propagated to the API
    await waitFor(() => {
      expect(capturedParams).not.toBeNull();
    });
    expect(capturedParams).toEqual(
      expect.objectContaining({
        projectId: 55,
        billingConfigurationId: 301,
        billingPeriodStart: "2026-10-01",
        billingPeriodEnd: "2026-10-31",
      })
    );

    // The mismatched snapshot belonging to config 999 must NOT be displayed
    await waitFor(() => {
      expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
    });
    expect(screen.queryByText("BS-OTHER-001")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /acquire snapshot/i })).toBeInTheDocument();
  });

  // Scenario 5: Backend conflict response (409) surfaces explanatory message and preserves selected dates
  it("Scenario 5: Backend conflict response (409) displays explanatory message, does not generate false snapshot, preserves dates, and allows re-selection", async () => {
    const conflictMessage =
      "A billing snapshot for this project and period already exists under another billing configuration (BS-20261001-EXT).";

    api.post.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots")) {
        const conflictErr = new Error(conflictMessage);
        conflictErr.response = {
          status: 409,
          data: {
            message: conflictMessage,
            conflictType: "CROSS_CONFIGURATION",
          },
        };
        return Promise.reject(conflictErr);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/account-receivable/billing-data-acquisition/55",
            state: { config: mockCleanConfig },
          },
        ]}
      >
        <Routes>
          <Route
            path="/account-receivable/billing-data-acquisition/:projectId"
            element={<AcquisitionDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    const acquireBtn = screen.getByRole("button", { name: /acquire snapshot/i });
    fireEvent.click(acquireBtn);

    // Explanatory conflict message must be displayed to user
    await waitFor(() => {
      expect(showStatusToast).toHaveBeenCalledWith(conflictMessage, "error");
    });

    // False snapshot numbers must NOT be rendered
    expect(screen.queryByText("BS-20261001-EXT")).not.toBeInTheDocument();

    // No navigation to tax calculation
    expect(mockNavigate).not.toHaveBeenCalled();

    // The single header action switches to Retry Acquisition and remains interactive
    expect(screen.getByRole("button", { name: /retry acquisition/i })).toBeInTheDocument();
  });

  // Scenario 6: Verify duplicate acquisition controls are completely removed and only one Acquire Snapshot button remains
  it("Scenario 6: Exactly one Acquire Snapshot action exists and duplicate acquisition controls are removed", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/account-receivable/billing-data-acquisition/55",
            state: { config: mockCleanConfig },
          },
        ]}
      >
        <Routes>
          <Route
            path="/account-receivable/billing-data-acquisition/:projectId"
            element={<AcquisitionDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
    });

    // 1. Only one Acquire Snapshot button is displayed on the entire page
    const acquireButtons = screen.getAllByRole("button", { name: /acquire snapshot/i });
    expect(acquireButtons).toHaveLength(1);

    // 2. The additional Billing Period Selection card is removed
    expect(screen.queryByText("Billing Period Selection")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/predefined period schedule/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/billing period start date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/billing period end date/i)).not.toBeInTheDocument();

    // 3. The bottom Initiate Source Data Acquisition card is removed
    expect(screen.queryByText(/initiate source data acquisition/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start acquisition/i })).not.toBeInTheDocument();

    // 4. Restored reference layout: Snapshot Overview, Billing Items, Billing Readiness, and Commercial Value
    expect(screen.getByText("Snapshot Overview")).toBeInTheDocument();
    expect(screen.getByText("Billing Items")).toBeInTheDocument();
    expect(screen.getByText("Source Timesheets")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search employee \/ role\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText("Snapshot Not Acquired")).toBeInTheDocument();
    expect(screen.getByText("Commercial Value")).toBeInTheDocument();
    expect(screen.getByText("Total Amount")).toBeInTheDocument();
  });

  // Scenario 7: Network failure (500) during snapshot lookup does not wipe localStorage or falsely set NOT_ACQUIRED
  it("Scenario 7: Network failure during snapshot lookup does not wipe valid cached metadata", async () => {
    // Save valid metadata in localStorage
    acquisitionService.saveAcquiredSnapshotMetadata(55, {
      projectId: 55,
      billingConfigurationId: 301,
      snapshotId: "valid-snap-id",
      snapshotNumber: "BS-20261031-VALID",
      status: "READY_FOR_TAX",
      billingPeriodStart: "2026-10-01",
      billingPeriodEnd: "2026-10-31",
      subtotal: 4000,
      totalAmount: 4000,
    });

    // Backend network failure
    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        const netErr = new Error("Network Error");
        netErr.response = { status: 500 };
        return Promise.reject(netErr);
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/account-receivable/billing-data-acquisition/55",
            state: { config: mockCleanConfig },
          },
        ]}
      >
        <Routes>
          <Route
            path="/account-receivable/billing-data-acquisition/:projectId"
            element={<AcquisitionDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Toast warning should be shown indicating network error
    await waitFor(() => {
      expect(showStatusToast).toHaveBeenCalledWith(
        expect.stringMatching(/network error/i),
        "warning"
      );
    });

    // The metadata in localStorage was NOT wiped
    const meta = acquisitionService.getAcquiredSnapshotMetadata(55, 301);
    expect(meta).not.toBeNull();
    expect(meta.snapshotNumber).toBe("BS-20261031-VALID");
  });

  // Scenario 8: Refresh sends correct configuration ID and updates snapshot details
  it("Scenario 8: Refresh button sends billingConfigurationId and refreshes snapshot data", async () => {
    let refreshParams = null;
    const existingSnapshot = {
      snapshotId: "snap-oct-ready",
      snapshotNumber: "BS-20261031-999",
      status: "READY_FOR_TAX",
      billingConfigurationId: 301,
      billingPeriodStart: "2026-10-01",
      billingPeriodEnd: "2026-10-31",
      subtotal: 6000,
      totalAmount: 6000,
      timesheets: [],
    };

    api.get.mockImplementation((url, options) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        refreshParams = options?.params;
        return Promise.resolve({
          data: {
            success: true,
            data: existingSnapshot,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/account-receivable/billing-data-acquisition/55",
            state: {
              config: {
                ...mockCleanConfig,
                snapshotId: "snap-oct-ready",
                snapshotNumber: "BS-20261031-999",
                billingStatus: "READY_FOR_TAX",
              },
            },
          },
        ]}
      >
        <Routes>
          <Route
            path="/account-receivable/billing-data-acquisition/:projectId"
            element={<AcquisitionDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("BS-20261031-999")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(refreshParams).toEqual(
        expect.objectContaining({
          projectId: 55,
          billingConfigurationId: 301,
          billingPeriodStart: "2026-10-01",
          billingPeriodEnd: "2026-10-31",
        })
      );
    });
  });

  describe("Section 5: Required Tests for Unacquired Billing Period and Date Selection Workflow", () => {
    const unacquiredConfig = {
      id: 77,
      projectId: 77,
      billingConfigurationId: 401,
      projectName: "Cloud Migration Platform",
      client: "Acme Global",
      billingType: "TIME_MATERIAL",
      billingTypeCode: "TIME_MATERIAL",
      billingFrequency: "MONTHLY",
      projectStartDate: "2026-01-01",
      projectEndDate: "2026-12-31",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      projectDuration: "01 Jan 2026 - 31 Dec 2026",
      currency: "USD",
      paymentTerms: "Net 30",
      billingStatus: "NOT_ACQUIRED",
      invoiceGeneration: "MANUAL",
    };

    // 1. New configuration with no snapshot displays Billing Period: —
    it("1. New configuration with no snapshot displays Billing Period: —", async () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: unacquiredConfig },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
      });

      const periodField = screen.getByText("Billing Period").closest("div");
      expect(periodField).toHaveTextContent("—");
      expect(screen.getByText("Snapshot Not Acquired")).toBeInTheDocument();
    });

    // 2. Project start/end dates do not automatically populate the billing period
    it("2. Project start/end dates do not automatically populate the billing period", async () => {
      const configWithProjectDates = {
        ...unacquiredConfig,
        projectStartDate: "2026-01-01",
        projectEndDate: "2026-12-31",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
      };

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: configWithProjectDates },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
      });

      const periodField = screen.getByText("Billing Period").closest("div");
      expect(periodField).toHaveTextContent("—");
      expect(periodField).not.toHaveTextContent("2026-01-01");
      expect(periodField).not.toHaveTextContent("01 Jan 2026");
    });

    // 3. Billing frequency does not automatically populate the billing period
    it("3. Billing frequency does not automatically populate the billing period", async () => {
      const configWithFrequency = {
        ...unacquiredConfig,
        billingFrequency: "MONTHLY",
      };

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: configWithFrequency },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
      });

      const periodField = screen.getByText("Billing Period").closest("div");
      expect(periodField).toHaveTextContent("—");
      // Monthly duration calculation must not become the billing period
      expect(periodField).not.toHaveTextContent("31 Jan 2026");
      expect(periodField).not.toHaveTextContent("30 Sep 2026");
    });

    // 4. Clicking Acquire Snapshot opens the existing date-selection interaction
    it("4. Clicking Acquire Snapshot opens the existing date-selection interaction", async () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: unacquiredConfig },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
      });

      const acquireBtn = screen.getByRole("button", { name: /^acquire snapshot$/i });
      fireEvent.click(acquireBtn);

      // Date-selection modal opens with inputs
      expect(screen.getByText("Select Billing Period")).toBeInTheDocument();
      expect(screen.getByLabelText(/billing period start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/billing period end date/i)).toBeInTheDocument();
    });

    // 5. Cancelling date selection leaves the period empty
    it("5. Cancelling date selection leaves the period empty", async () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: unacquiredConfig },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      const acquireBtn = screen.getByRole("button", { name: /^acquire snapshot$/i });
      fireEvent.click(acquireBtn);

      expect(screen.getByText("Select Billing Period")).toBeInTheDocument();

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelBtn);

      // Modal closed, period remains empty and status remains NOT_ACQUIRED
      await waitFor(() => {
        expect(screen.queryByText("Select Billing Period")).not.toBeInTheDocument();
      });
      const periodField = screen.getByText("Billing Period").closest("div");
      expect(periodField).toHaveTextContent("—");
      expect(screen.getByText("Snapshot Not Acquired")).toBeInTheDocument();
    });

    // 6. Selecting dates displays the selected period in the acquisition interaction
    it("6. Selecting dates displays the selected period in the acquisition interaction", async () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: unacquiredConfig },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      const acquireBtn = screen.getByRole("button", { name: /^acquire snapshot$/i });
      fireEvent.click(acquireBtn);

      const startInput = screen.getByLabelText(/billing period start date/i);
      const endInput = screen.getByLabelText(/billing period end date/i);

      fireEvent.change(startInput, { target: { value: "2026-10-01" } });
      fireEvent.change(endInput, { target: { value: "2026-10-31" } });

      expect(startInput).toHaveValue("2026-10-01");
      expect(endInput).toHaveValue("2026-10-31");
    });

    // 7. Successful acquisition displays the persisted snapshot period
    it("7. Successful acquisition displays the persisted snapshot period", async () => {
      api.post.mockImplementation((url) => {
        if (url.includes("/api/v1/billing-snapshots")) {
          return Promise.resolve({
            data: {
              snapshotId: "snap-acquired-77",
              snapshotNumber: "BS-202610-077",
              status: "READY_FOR_TAX",
              acquisitionStatus: "READY",
              projectId: 77,
              billingConfigurationId: 401,
              billingPeriodStart: "2026-10-01",
              billingPeriodEnd: "2026-10-31",
              billingPeriod: "01 Oct 2026 - 31 Oct 2026",
              subtotal: 7500,
              totalAmount: 7500,
              timesheets: [],
            },
          });
        }
        if (url.includes("/api/billing-data-acquisition/acquire")) {
          return Promise.resolve({ data: { success: true } });
        }
        return Promise.reject(new Error(`Unhandled POST URL: ${url}`));
      });

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: unacquiredConfig },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      const acquireBtn = screen.getByRole("button", { name: /^acquire snapshot$/i });
      fireEvent.click(acquireBtn);

      fireEvent.change(screen.getByLabelText(/billing period start date/i), {
        target: { value: "2026-10-01" },
      });
      fireEvent.change(screen.getByLabelText(/billing period end date/i), {
        target: { value: "2026-10-31" },
      });

      // Click proceed in modal
      const modalAcquireBtn = screen.getAllByRole("button", { name: /^acquire snapshot$/i });
      fireEvent.click(modalAcquireBtn[modalAcquireBtn.length - 1]);

      // Acquired snapshot number and persisted billing period are displayed
      await waitFor(() => {
        expect(screen.getByText("BS-202610-077")).toBeInTheDocument();
      });

      const periodField = screen.getByText("Billing Period").closest("div");
      expect(periodField).toHaveTextContent("01 Oct 2026 - 31 Oct 2026");
    });

    // 8. Refreshing the page preserves the correct state
    it("8. Refreshing the page preserves the correct state", async () => {
      // Backend returns null for unacquired configuration
      api.get.mockImplementation((url) => {
        if (url.includes("/api/v1/billing-snapshots/by-period")) {
          return Promise.resolve({ data: null });
        }
        return Promise.resolve({ data: [] });
      });

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: unacquiredConfig },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
      });

      const periodField = screen.getByText("Billing Period").closest("div");
      expect(periodField).toHaveTextContent("—");
      expect(screen.getByText("Snapshot Not Acquired")).toBeInTheDocument();
    });

    // 9. Existing acquired and invoiced snapshots continue displaying their actual billing periods
    it("9. Existing acquired and invoiced snapshots continue displaying their actual billing periods", async () => {
      const existingInvoicedConfig = {
        ...unacquiredConfig,
        snapshotId: "snap-inv-88",
        snapshotNumber: "BS-20260930154115",
        billingStatus: "INVOICED",
        snapshotLifecycleStatus: "INVOICED",
        billingPeriodStart: "2026-09-01",
        billingPeriodEnd: "2026-09-30",
        billingPeriod: "01 Sep 2026 - 30 Sep 2026",
      };

      api.get.mockImplementation((url) => {
        if (url.includes("/api/v1/billing-snapshots/by-period")) {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                snapshotId: "snap-inv-88",
                snapshotNumber: "BS-20260930154115",
                status: "INVOICED",
                billingPeriodStart: "2026-09-01",
                billingPeriodEnd: "2026-09-30",
                billingPeriod: "01 Sep 2026 - 30 Sep 2026",
                subtotal: 5000,
                totalAmount: 5000,
                timesheets: [],
              },
            },
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: existingInvoicedConfig },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("BS-20260930154115")).toBeInTheDocument();
      });

      const periodField = screen.getByText("Billing Period").closest("div");
      expect(periodField).toHaveTextContent("01 Sep 2026 - 30 Sep 2026");
      expect(screen.getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
    });

    // 10. Stale localStorage cannot populate an unacquired billing period
    it("10. Stale localStorage cannot populate an unacquired billing period", async () => {
      // Seed stale metadata
      acquisitionService.saveAcquiredSnapshotMetadata(77, {
        projectId: 77,
        billingConfigurationId: 999, // Mismatched config
        snapshotId: "stale-snap-999",
        snapshotNumber: "BS-STALE-999",
        status: "INVOICED",
        billingPeriodStart: "2026-08-01",
        billingPeriodEnd: "2026-08-31",
        billingPeriod: "01 Aug 2026 - 31 Aug 2026",
      });

      // Backend returns null
      api.get.mockImplementation((url) => {
        if (url.includes("/api/v1/billing-snapshots/by-period")) {
          return Promise.resolve({ data: null });
        }
        return Promise.resolve({ data: [] });
      });

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/account-receivable/billing-data-acquisition/77",
              state: { config: unacquiredConfig },
            },
          ]}
        >
          <Routes>
            <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Not Yet Acquired")).toBeInTheDocument();
      });

      // Stale dates must not populate the period
      const periodField = screen.getByText("Billing Period").closest("div");
      expect(periodField).toHaveTextContent("—");
      expect(periodField).not.toHaveTextContent("01 Aug 2026");
      expect(screen.queryByText("BS-STALE-999")).not.toBeInTheDocument();
    });
  });
});

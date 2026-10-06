import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcquisitionDetail from "./AcquisitionDetail";
import * as acquisitionService from "../services/billingDataAcquisitionService";
import * as toastModule from "../../../components/toastfy/toast";
import api from "../../../api/axiosInstance";

// Mock axios instance
vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock toast notifications
vi.mock("../../../components/toastfy/toast", () => ({
  showStatusToast: vi.fn(),
}));

describe("Billing Data Acquisition Refresh Workflow & Existing Snapshot Status Handling (Tests 1 - 10)", () => {
  const mockConfig = {
    id: 101,
    projectId: 101,
    billingConfigurationId: 201,
    projectName: "Alpha Project",
    billingType: "TIME_MATERIAL",
    billingTypeCode: "TIME_MATERIAL",
    billingPeriodStart: "2026-03-01",
    billingPeriodEnd: "2026-03-31",
    billingPeriod: "01 Mar 2026 - 31 Mar 2026",
    currency: "USD",
    billingStatus: "NOT_ACQUIRED",
    invoiceGeneration: "AUTOMATIC",
  };

  const mockLaborTimesheets = [
    {
      id: "ts-1",
      employee: "Alice Smith",
      workDate: "2026-03-10",
      hours: 40,
      rate: 100,
      amount: 4000,
      approvalStatus: "Approved",
      role: "Lead Engineer",
    },
    {
      id: "ts-2",
      employee: "Bob Jones",
      workDate: "2026-03-15",
      hours: 20,
      rate: 100,
      amount: 2000,
      approvalStatus: "Approved",
      role: "Senior Consultant",
    },
  ];

  const mockSuccessfulSnapshot = {
    snapshotId: "SNAP-101-202603",
    snapshotNumber: "BS-2026-00101",
    status: "READY_FOR_TAX",
    acquisitionStatus: "READY",
    billingPeriodStart: "2026-03-01",
    billingPeriodEnd: "2026-03-31",
    subtotal: 6000,
    totalAmount: 6000,
    timesheets: mockLaborTimesheets,
    readiness: {
      requiredCount: 2,
      approvedCount: 2,
      pendingCount: 0,
      approvedHours: 60,
      pendingHours: 0,
      pendingTimesheets: [],
      approvedTimesheets: mockLaborTimesheets,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // By default, GET /by-period returns null unless overridden
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

  // --- TEST 1: Clicking Refresh calls the appropriate GET APIs ---
  it("Test 1: Clicking Refresh calls the appropriate GET APIs and reloads existing snapshot", async () => {
    // Render with existing snapshot
    const acquiredConfig = {
      ...mockConfig,
      billingStatus: "READY_FOR_TAX",
      snapshotId: "SNAP-101-202603",
      snapshotNumber: "BS-2026-00101",
    };

    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              ...mockSuccessfulSnapshot,
              subtotal: 7500,
              totalAmount: 7500,
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: acquiredConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const refreshBtn = screen.getByRole("button", { name: /refresh/i });
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/billing-snapshots/by-period"),
        expect.any(Object)
      );
    });

    expect(toastModule.showStatusToast).toHaveBeenCalledWith(
      expect.stringMatching(/snapshot details refreshed from backend/i),
      "success"
    );
  });

  // --- TEST 2: Clicking Refresh does not call either acquisition POST endpoint ---
  it("Test 2: Clicking Refresh does not call either acquisition POST endpoint", async () => {
    const acquiredConfig = {
      ...mockConfig,
      billingStatus: "READY_FOR_TAX",
      snapshotId: "SNAP-101-202603",
      snapshotNumber: "BS-2026-00101",
    };

    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({ data: { success: true, data: mockSuccessfulSnapshot } });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: acquiredConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const refreshBtn = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/billing-snapshots/by-period"),
        expect.any(Object)
      );
    });

    // Verify POST was NEVER called for snapshots or acquisition records
    const snapshotPostCalls = api.post.mock.calls.filter(([url]) =>
      url.includes("/api/v1/billing-snapshots") || url.includes("/api/billing-data-acquisition/acquire")
    );
    expect(snapshotPostCalls.length).toBe(0);
  });

  // --- TEST 3: Explicit Acquire still invokes the existing acquisition workflow ---
  it("Test 3: Explicit Acquire still invokes the existing acquisition workflow", async () => {
    api.post.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots")) {
        return Promise.resolve({ data: mockSuccessfulSnapshot });
      }
      if (url.includes("/api/billing-data-acquisition/acquire")) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const acquireBtn = screen.getByRole("button", { name: /acquire snapshot/i });
    fireEvent.click(acquireBtn);

    await waitFor(() => {
      expect(screen.getByText("BS-2026-00101")).toBeInTheDocument();
    });

    // Check POST endpoints were invoked
    expect(api.post).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/billing-snapshots"),
      expect.any(Object)
    );
    expect(api.post).toHaveBeenCalledWith(
      expect.stringContaining("/api/billing-data-acquisition/acquire"),
      expect.any(Object)
    );

    expect(screen.getByRole("button", { name: /calculate tax/i })).toBeInTheDocument();
  });

  // --- TEST 4: An existing snapshot response with existingSnapshot: true is handled successfully ---
  it("Test 4: An existing snapshot response with existingSnapshot: true is handled successfully", async () => {
    // Mock backend returning the exact existing snapshot format from the task description
    api.post.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots")) {
        return Promise.resolve({
          data: {
            success: true,
            message: "Billing Snapshot already exists for the selected project and billing period.",
            data: {
              snapshotId: "dd593e4c-e4b0-4ea7-b914-2af332f423cf",
              acquisitionStatus: "ALREADY_BILLED",
              snapshotNumber: "BS-20260930154115",
              projectId: 101,
              billingPeriodStart: [2026, 9, 30],
              billingPeriodEnd: [2026, 10, 30],
              subtotal: 900.0,
              totalAmount: 900.0,
              status: "INVOICED",
              existingSnapshot: true,
            },
          },
        });
      }
      if (url.includes("/api/billing-data-acquisition/acquire")) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const acquireBtn = screen.getByRole("button", { name: /acquire snapshot/i });
    fireEvent.click(acquireBtn);

    await waitFor(() => {
      expect(screen.getByText("BS-20260930154115")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /retry acquisition/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
  });

  // --- TEST 5: ALREADY_BILLED combined with snapshot status INVOICED does not show Retry Acquisition ---
  it("Test 5: ALREADY_BILLED combined with snapshot status INVOICED does not show Retry Acquisition and displays View Invoice", async () => {
    const invoicedConfig = {
      ...mockConfig,
      billingStatus: "ALREADY_BILLED",
      snapshotLifecycleStatus: "INVOICED",
      snapshotNumber: "BS-20260930154115",
      snapshotId: "dd593e4c-e4b0-4ea7-b914-2af332f423cf",
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: invoicedConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify Retry Acquisition is NOT shown
    expect(screen.queryByRole("button", { name: /retry acquisition/i })).not.toBeInTheDocument();

    // Verify View Invoice is shown
    expect(screen.getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
    expect(screen.getByText("BS-20260930154115")).toBeInTheDocument();
  });

  // --- TEST 6: The existing snapshot ID and snapshot number are preserved ---
  it("Test 6: The existing snapshot ID and snapshot number are preserved across secondary request errors", async () => {
    api.post.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots")) {
        return Promise.resolve({ data: mockSuccessfulSnapshot });
      }
      if (url.includes("/api/billing-data-acquisition/acquire")) {
        const error = new Error("Secondary tracking network failure");
        error.response = { status: 500 };
        return Promise.reject(error);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const acquireBtn = screen.getByRole("button", { name: /acquire snapshot/i });
    fireEvent.click(acquireBtn);

    // Snapshot identity remains intact in header
    await waitFor(() => {
      expect(screen.getByText("BS-2026-00101")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /calculate tax/i })).toBeInTheDocument();
  });

  // --- TEST 7: Navigation away and back restores the existing snapshot ---
  it("Test 7: Navigation away and back restores the existing snapshot without changing status to ACQUISITION_FAILED", async () => {
    acquisitionService.saveAcquiredSnapshotMetadata(101, {
      projectId: 101,
      snapshotId: "SNAP-101-202603",
      snapshotNumber: "BS-2026-00101",
      status: "READY_FOR_TAX",
      billingPeriodStart: "2026-03-01",
      billingPeriodEnd: "2026-03-31",
      subtotal: 6000,
      totalAmount: 6000,
    });

    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({ data: { success: true, data: mockSuccessfulSnapshot } });
      }
      return Promise.resolve({ data: [] });
    });

    const returningConfig = {
      ...mockConfig,
      billingStatus: "NOT_ACQUIRED",
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: returningConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("BS-2026-00101")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /retry acquisition/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /calculate tax/i })).toBeInTheDocument();
  });

  // --- TEST 8: Browser refresh restores the existing snapshot ---
  it("Test 8: Browser refresh restores the existing snapshot", async () => {
    acquisitionService.saveAcquiredSnapshotMetadata(101, {
      projectId: 101,
      snapshotId: "SNAP-101-202603",
      snapshotNumber: "BS-2026-00101",
      status: "READY_FOR_TAX",
      billingPeriodStart: "2026-03-01",
      billingPeriodEnd: "2026-03-31",
      subtotal: 6000,
      totalAmount: 6000,
    });

    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({ data: mockSuccessfulSnapshot });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("BS-2026-00101")).toBeInTheDocument();
    });
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  // --- TEST 9: Genuine retryable acquisition failures still expose Retry Acquisition ---
  it("Test 9: Genuine retryable acquisition failures still expose Retry Acquisition", async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 500,
        data: { message: "Internal server error: TMS database unreachable." },
      },
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const acquireBtn = screen.getByRole("button", { name: /acquire snapshot/i });
    fireEvent.click(acquireBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry acquisition/i })).toBeInTheDocument();
    });

    expect(toastModule.showStatusToast).toHaveBeenCalledWith(
      expect.stringMatching(/Internal server error: TMS database unreachable/i),
      "error"
    );
  });

  // --- TEST 10: Existing READY_FOR_TAX, TAX_COMPLETED, and INVOICED navigation remains functional ---
  it("Test 10: Existing READY_FOR_TAX, TAX_COMPLETED, and INVOICED navigation actions are properly mapped", async () => {
    // 10a: READY_FOR_TAX shows Calculate Tax
    const readyConfig = {
      ...mockConfig,
      billingStatus: "READY_FOR_TAX",
      snapshotId: "SNAP-READY",
      snapshotNumber: "BS-READY",
    };

    const { unmount: unmount1 } = render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: readyConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /calculate tax/i })).toBeInTheDocument();
    unmount1();

    // 10b: TAX_COMPLETED shows View Tax Calculation
    const taxCompletedConfig = {
      ...mockConfig,
      billingStatus: "TAX_COMPLETED",
      snapshotId: "SNAP-TAX",
      snapshotNumber: "BS-TAX",
    };

    const { unmount: unmount2 } = render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: taxCompletedConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /view tax calculation/i })).toBeInTheDocument();
    unmount2();

    // 10c: INVOICED shows View Invoice
    const invoicedConfig = {
      ...mockConfig,
      billingStatus: "INVOICED",
      snapshotId: "SNAP-INV",
      snapshotNumber: "BS-INV",
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/101", state: { config: invoicedConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
  });
});

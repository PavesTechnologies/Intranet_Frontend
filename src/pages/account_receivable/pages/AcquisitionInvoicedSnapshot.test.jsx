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

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Regression Tests: Existing INVOICED Snapshot and Billing Readiness Handling", () => {
  const mockConfig = {
    id: 37,
    projectId: 37,
    billingConfigurationId: 201,
    projectName: "Cloud Migration",
    billingType: "TIME_MATERIAL",
    billingTypeCode: "TIME_MATERIAL",
    billingPeriodStart: "2026-09-30",
    billingPeriodEnd: "2026-10-30",
    billingPeriod: "30 Sep 2026 - 30 Oct 2026",
    currency: "USD",
    billingStatus: "NOT_ACQUIRED",
    invoiceGeneration: "AUTOMATIC",
  };

  const mockInvoicedLaborTimesheets = [
    {
      id: "ts-10",
      employee: "Dev Lead",
      workDate: "2026-10-05",
      hours: 9,
      rate: 100,
      amount: 900,
      approvalStatus: "Approved",
      role: "Architect",
    },
  ];

  const mockExistingInvoicedSnapshot = {
    snapshotId: "dd593e4c-e4b0-4ea7-b914-2af332f423cf",
    snapshotNumber: "BS-20260930154115",
    status: "INVOICED",
    acquisitionStatus: "ALREADY_BILLED",
    projectId: 37,
    billingPeriodStart: "2026-09-30",
    billingPeriodEnd: "2026-10-30",
    subtotal: 900.0,
    totalAmount: 900.0,
    timesheets: mockInvoicedLaborTimesheets,
    existingSnapshot: true,
    readiness: {
      requiredCount: 1,
      approvedCount: 1,
      pendingCount: 0,
      approvedHours: 9,
      pendingHours: 0,
      pendingTimesheets: [],
      approvedTimesheets: mockInvoicedLaborTimesheets,
    },
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

  // 1. Successful acquisition followed by reopening the same project does not show Acquisition Failed
  it("Requirement 1: Reopening the same project after acquisition does not show Acquisition Failed in Billing Readiness", async () => {
    // Setup existing snapshot returned by GET /by-period
    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockExistingInvoicedSnapshot,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/37", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Hydration should load existing invoiced snapshot
    await waitFor(() => {
      expect(screen.getByText("BS-20260930154115")).toBeInTheDocument();
    });

    // Billing Readiness panel must display "Billing Period Invoiced"
    expect(screen.getByText("Billing Period Invoiced")).toBeInTheDocument();
    expect(screen.getByText("This billing period has already been invoiced.")).toBeInTheDocument();

    // Must NOT show Acquisition Failed
    expect(screen.queryByText("Acquisition Failed")).not.toBeInTheDocument();
    expect(screen.queryByText(/We couldn't retrieve billing data at this time/i)).not.toBeInTheDocument();
  });

  // 2. Existing INVOICED snapshot with ALREADY_BILLED displays Invoiced and View Invoice
  it("Requirement 2: Existing INVOICED snapshot with ALREADY_BILLED displays Invoiced badge and View Invoice action", async () => {
    const invoicedConfig = {
      ...mockConfig,
      billingStatus: "INVOICED",
      snapshotLifecycleStatus: "INVOICED",
      acquisitionStatus: "ALREADY_BILLED",
      snapshotNumber: "BS-20260930154115",
      snapshotId: "dd593e4c-e4b0-4ea7-b914-2af332f423cf",
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/37", state: { config: invoicedConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry acquisition/i })).not.toBeInTheDocument();
    expect(screen.getByText("Billing Period Invoiced")).toBeInTheDocument();
    expect(screen.queryByText("Acquisition Failed")).not.toBeInTheDocument();
  });

  // 3. Successful snapshot hydration clears stale acquisition error state
  it("Requirement 3: Successful snapshot hydration clears stale acquisition error state in localStorage and UI", async () => {
    // Seed stale error in localStorage
    acquisitionService.saveAcquiredSnapshotMetadata(37, {
      projectId: 37,
      snapshotId: "dd593e4c-e4b0-4ea7-b914-2af332f423cf",
      snapshotNumber: "BS-20260930154115",
      status: "ACQUISITION_FAILED",
      billingPeriodStart: "2026-09-30",
      billingPeriodEnd: "2026-10-30",
      subtotal: 0,
      totalAmount: 0,
    });

    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockExistingInvoicedSnapshot,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/37", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("BS-20260930154115")).toBeInTheDocument();
    });

    // Verify readiness shows Billing Period Invoiced, NOT Acquisition Failed
    expect(screen.getByText("Billing Period Invoiced")).toBeInTheDocument();
    expect(screen.queryByText("Acquisition Failed")).not.toBeInTheDocument();

    // Verify localStorage was updated to INVOICED
    const meta = acquisitionService.getAcquiredSnapshotMetadata(37);
    expect(meta.status).toBe("INVOICED");
  });

  // 4. Retry/recovery returning an existing invoiced snapshot does not show Acquisition Failed
  it("Requirement 4: Retry returning an existing invoiced snapshot handles recovery and does not show Acquisition Failed", async () => {
    // Start with a failed config state
    const failedConfig = {
      ...mockConfig,
      billingStatus: "ACQUISITION_FAILED",
      snapshotLifecycleStatus: "ACQUISITION_FAILED",
    };

    // When Retry is clicked, backend returns existing snapshot 200 with INVOICED
    api.post.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots")) {
        return Promise.resolve({
          data: {
            success: true,
            message: "Billing Snapshot already exists for the selected project and billing period.",
            data: mockExistingInvoicedSnapshot,
          },
        });
      }
      if (url.includes("/api/billing-data-acquisition/acquire")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: "00822aae-f41a-4fd6-b36e-50a5b5a3ec65",
              projectId: 37,
              snapshotId: "dd593e4c-e4b0-4ea7-b914-2af332f423cf",
              status: "ALREADY_BILLED",
            },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/37", state: { config: failedConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const retryBtn = screen.getByRole("button", { name: /retry acquisition/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("BS-20260930154115")).toBeInTheDocument();
    });

    // After retry recovery, View Invoice is shown and Acquisition Failed is absent
    expect(screen.getByRole("button", { name: /view invoice/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry acquisition/i })).not.toBeInTheDocument();
    expect(screen.getByText("Billing Period Invoiced")).toBeInTheDocument();
    expect(screen.queryByText("Acquisition Failed")).not.toBeInTheDocument();
  });

  // 5. Genuine acquisition failures still show an appropriate error and Retry Acquisition
  it("Requirement 5: Genuine acquisition failures display error banner and Retry Acquisition button", async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 500,
        data: { message: "Internal server error: TMS database unreachable." },
      },
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/37", state: { config: mockConfig } }]}>
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

    expect(screen.getByText("Acquisition Failed")).toBeInTheDocument();
    expect(screen.getByText(/TMS database unreachable/i)).toBeInTheDocument();
  });

  // 6. A failed GET request is distinguishable from a successful snapshot with an already-billed status
  it("Requirement 6: Failed GET request does not masquerade as an invoiced snapshot", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        const error = new Error("Network Error");
        error.response = { status: 500 };
        return Promise.reject(error);
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/37", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial state remains NOT_ACQUIRED
    expect(screen.getByRole("button", { name: /acquire snapshot/i })).toBeInTheDocument();
    expect(screen.queryByText("Billing Period Invoiced")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view invoice/i })).not.toBeInTheDocument();
  });

  // 7. Snapshot ID, snapshot number, timesheet data, and financial totals remain intact
  it("Requirement 7: Snapshot ID, snapshot number, timesheet records, and commercial totals remain intact", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/api/v1/billing-snapshots/by-period")) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockExistingInvoicedSnapshot,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/37", state: { config: mockConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("BS-20260930154115")).toBeInTheDocument();
    });

    // Timesheet employee should be visible
    expect(screen.getByText("Dev Lead")).toBeInTheDocument();

    // Financial totals should reflect 900.00
    expect(screen.getAllByText(/900\.00/).length).toBeGreaterThan(0);
  });

  // 8. Existing tax and invoice navigation remains functional
  it("Requirement 8: Navigates to invoice view when View Invoice is clicked for an INVOICED snapshot", async () => {
    const invoicedConfig = {
      ...mockConfig,
      billingStatus: "INVOICED",
      snapshotLifecycleStatus: "INVOICED",
      acquisitionStatus: "ALREADY_BILLED",
      snapshotNumber: "BS-20260930154115",
      snapshotId: "dd593e4c-e4b0-4ea7-b914-2af332f423cf",
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: "/account-receivable/billing-data-acquisition/37", state: { config: invoicedConfig } }]}>
        <Routes>
          <Route path="/account-receivable/billing-data-acquisition/:projectId" element={<AcquisitionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const viewInvoiceBtn = screen.getByRole("button", { name: /view invoice/i });
    fireEvent.click(viewInvoiceBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/account-receivable/invoices/dd593e4c-e4b0-4ea7-b914-2af332f423cf",
      expect.objectContaining({
        state: expect.objectContaining({
          config: expect.objectContaining({
            snapshotId: "dd593e4c-e4b0-4ea7-b914-2af332f423cf",
            snapshotLifecycleStatus: "INVOICED",
          }),
        }),
      })
    );
  });
});

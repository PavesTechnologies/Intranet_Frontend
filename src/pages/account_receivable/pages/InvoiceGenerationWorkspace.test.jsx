import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import InvoiceGeneration from "./InvoiceGeneration";
import * as invoiceService from "../services/invoiceService";
import { showStatusToast } from "../../../components/toastfy/toast";

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

describe("InvoiceGeneration Workspace Integration", () => {
  const mockWorkspaceData = {
    summary: {
      readyForInvoiceCount: 1,
      readyForInvoiceAmount: 31152.00,
      generatedCount: 1,
      pendingApprovalCount: 1,
      approvedCount: 1,
      rejectedCount: 1,
      invoicedCount: 1,
      totalInvoicedAmount: 70850.00,
    },
    rows: [
      {
        workspaceStatus: "READY_FOR_INVOICE",
        snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
        snapshotNumber: "BS-20261007115805-E6CE665A",
        snapshotStatus: "TAX_COMPLETED",
        clientName: "Account Management",
        projectName: "Website Redesign",
        projectCode: "W-342",
        billingType: "Timesheet Based",
        billingPeriodStart: "2026-08-05",
        billingPeriodEnd: "2026-09-05",
        currencyCode: "USD",
        currency: "USD",
        amount: 26400.00,
        totalTaxAmount: 4752.00,
        grandTotal: 31152.00,
        invoiceId: null,
        invoiceNumber: null,
        invoiceStatus: null,
        invoiceDate: null,
        dueDate: null,
      },
      {
        workspaceStatus: "GENERATED",
        snapshotId: "bs-generated-123",
        snapshotNumber: "BS-GEN-001",
        snapshotStatus: "INVOICED",
        clientName: "Acme Corp",
        projectName: "Platform Migration",
        projectCode: "PM-101",
        billingType: "Fixed Price",
        billingPeriodStart: "2026-09-01",
        billingPeriodEnd: "2026-09-30",
        currencyCode: "USD",
        currency: "USD",
        amount: 50000.00,
        totalTaxAmount: 5000.00,
        grandTotal: 55000.00,
        invoiceId: "inv-gen-001",
        invoiceNumber: "INV-2026-0001",
        invoiceStatus: "GENERATED",
        invoiceDate: "2026-10-01",
        dueDate: "2026-10-15",
      },
      {
        workspaceStatus: "PENDING_APPROVAL",
        snapshotId: "bs-pending-456",
        snapshotNumber: "BS-PEN-002",
        snapshotStatus: "INVOICED",
        clientName: "Beta LLC",
        projectName: "Cloud Audit",
        projectCode: "CA-202",
        billingType: "Timesheet Based",
        billingPeriodStart: "2026-08-01",
        billingPeriodEnd: "2026-08-31",
        currencyCode: "USD",
        currency: "USD",
        amount: 10000.00,
        totalTaxAmount: 1000.00,
        grandTotal: 11000.00,
        invoiceId: "inv-pen-002",
        invoiceNumber: "INV-2026-0002",
        invoiceStatus: "PENDING_APPROVAL",
        invoiceDate: "2026-09-05",
        dueDate: "2026-09-20",
      },
      {
        workspaceStatus: "APPROVED",
        snapshotId: "bs-approved-789",
        snapshotNumber: "BS-APP-003",
        snapshotStatus: "INVOICED",
        clientName: "Gamma Inc",
        projectName: "Data Pipeline",
        projectCode: "DP-303",
        billingType: "Timesheet Based",
        billingPeriodStart: "2026-07-01",
        billingPeriodEnd: "2026-07-31",
        currencyCode: "USD",
        currency: "USD",
        amount: 4000.00,
        totalTaxAmount: 400.00,
        grandTotal: 4400.00,
        invoiceId: "inv-app-003",
        invoiceNumber: "INV-2026-0003",
        invoiceStatus: "APPROVED",
        invoiceDate: "2026-08-02",
        dueDate: "2026-08-17",
      },
      {
        workspaceStatus: "REJECTED",
        snapshotId: "bs-rejected-101",
        snapshotNumber: "BS-REJ-004",
        snapshotStatus: "INVOICED",
        clientName: "Delta Co",
        projectName: "Security Review",
        projectCode: "SR-404",
        billingType: "Fixed Price",
        billingPeriodStart: "2026-06-01",
        billingPeriodEnd: "2026-06-30",
        currencyCode: "USD",
        currency: "USD",
        amount: 15000.00,
        totalTaxAmount: 1500.00,
        grandTotal: 16500.00,
        invoiceId: "inv-rej-004",
        invoiceNumber: "INV-2026-0004",
        invoiceStatus: "REJECTED",
        invoiceDate: "2026-07-05",
        dueDate: "2026-07-20",
      },
      {
        workspaceStatus: "INVOICED",
        snapshotId: "bs-invoiced-202",
        snapshotNumber: "BS-INV-005",
        snapshotStatus: "INVOICED",
        clientName: "Epsilon Tech",
        projectName: "API Integration",
        projectCode: "AI-505",
        billingType: "Fixed Price",
        billingPeriodStart: "2026-05-01",
        billingPeriodEnd: "2026-05-31",
        currencyCode: "USD",
        currency: "USD",
        amount: 8000.00,
        totalTaxAmount: 800.00,
        grandTotal: 8800.00,
        invoiceId: "inv-inv-005",
        invoiceNumber: "INV-2026-0005",
        invoiceStatus: "INVOICED",
        invoiceDate: "2026-06-01",
        dueDate: "2026-06-15",
      },
    ],
  };

  let getWorkspaceSpy;
  let generateInvoiceSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();

    getWorkspaceSpy = vi
      .spyOn(invoiceService, "getInvoiceGenerationWorkspace")
      .mockResolvedValue(mockWorkspaceData);

    generateInvoiceSpy = vi
      .spyOn(invoiceService, "generateInvoice")
      .mockResolvedValue({ invoiceId: "mock-inv" });
  });

  it("1 & 16. calls getInvoiceGenerationWorkspace on load and NEVER calls invoice-generation POST API", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getWorkspaceSpy).toHaveBeenCalledTimes(1);
    });

    // Ensure generateInvoice POST was never called during dashboard load
    expect(generateInvoiceSpy).not.toHaveBeenCalled();
  });

  it("2 & 5. displays TAX_COMPLETED snapshot row with Ready for Invoice status and candidate details", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Account Management")).toBeInTheDocument();
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
      expect(screen.getByText("BS-20261007115805-E6CE665A")).toBeInTheDocument();
      expect(screen.getAllByText("Ready for Invoice").length).toBeGreaterThan(0);
    });
  });

  it("3 & 4. renders grouped KPI sections (Approval Status and Invoice Status) matching Project Billing Setup Overview and Invoice Pipeline with stage tabs", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Section 1: Approval Status
      expect(screen.getByRole("heading", { name: "Approval Status" })).toBeInTheDocument();
      expect(screen.getByText("Total Invoices")).toBeInTheDocument();
      expect(screen.getAllByText("Generated").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Pending Approval").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Rejected").length).toBeGreaterThan(0);

      // Section 2: Invoice Status
      expect(screen.getByRole("heading", { name: "Invoice Status" })).toBeInTheDocument();
      expect(screen.getAllByText("Ready for Invoice").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Invoiced").length).toBeGreaterThan(0);

      // Total Invoiced Amount KPI must NOT be present
      expect(screen.queryByText("Total Invoiced Amount")).not.toBeInTheDocument();

      // Invoice Pipeline header
      expect(screen.getByText("Invoice Pipeline")).toBeInTheDocument();
      expect(screen.getByText(/Track invoice candidates and approval status/i)).toBeInTheDocument();

      // Pipeline tabs
      expect(screen.getByRole("tab", { name: /^All/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Ready for Invoice/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Generated/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Pending Approval/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Approved/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Rejected/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Invoiced/i })).toBeInTheDocument();
    });
  });

  it("6. Generate Invoice action navigates to dedicated workflow using snapshotId", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    });

    const generateBtn = screen.getByRole("button", { name: /Generate Invoice/i });
    expect(generateBtn).toBeInTheDocument();
    fireEvent.click(generateBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/account-receivable/invoice-generation/f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
      expect.objectContaining({
        state: expect.objectContaining({
          from: "invoice-generation",
          source: "invoice-generation",
        }),
      })
    );
  });

  it("7 - 11. displays existing GENERATED, PENDING_APPROVAL, APPROVED, REJECTED, and INVOICED rows", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Beta LLC")).toBeInTheDocument();
      expect(screen.getByText("Gamma Inc")).toBeInTheDocument();
      expect(screen.getByText("Delta Co")).toBeInTheDocument();
      expect(screen.getByText("Epsilon Tech")).toBeInTheDocument();
    });
  });

  it("12. clicking on an existing invoice row navigates to invoice detail", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    // Click on Acme Corp row
    fireEvent.click(screen.getByText("Acme Corp"));

    expect(mockNavigate).toHaveBeenCalledWith(
      "/account-receivable/invoices/inv-gen-001",
      expect.objectContaining({
        state: expect.objectContaining({
          from: "invoice-generation",
          source: "invoice-generation",
        }),
      })
    );
  });

  it("13. search filters by project, client, or snapshot number", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
      expect(screen.getByText("Platform Migration")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by invoice number/i);

    // Search by client "Account Management"
    fireEvent.change(searchInput, { target: { value: "Account Management" } });
    expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    expect(screen.queryByText("Platform Migration")).not.toBeInTheDocument();

    // Search by snapshot number "BS-20261007115805-E6CE665A"
    fireEvent.change(searchInput, { target: { value: "E6CE665A" } });
    expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    expect(screen.queryByText("Platform Migration")).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("Platform Migration")).toBeInTheDocument();
  });

  it("14. pipeline tabs act as the primary status filter and no duplicate status dropdown exists", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
      expect(screen.getByText("Platform Migration")).toBeInTheDocument();
    });

    // Ensure status dropdown combobox is removed
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    // Click "Ready for Invoice" pipeline tab
    const readyTab = screen.getByRole("tab", { name: /Ready for Invoice/i });
    fireEvent.click(readyTab);

    expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    expect(screen.queryByText("Platform Migration")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta LLC")).not.toBeInTheDocument();

    // Click "Generated" pipeline tab
    const genTab = screen.getByRole("tab", { name: /Generated/i });
    fireEvent.click(genTab);

    expect(screen.getByText("Platform Migration")).toBeInTheDocument();
    expect(screen.queryByText("Website Redesign")).not.toBeInTheDocument();

    // Click "All" tab to view all records again
    const allTab = screen.getByRole("tab", { name: /^All/i });
    fireEvent.click(allTab);

    expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    expect(screen.getByText("Platform Migration")).toBeInTheDocument();
  });

  it("15. Refresh button reloads the workspace API without calling POST", async () => {
    render(
      <MemoryRouter>
        <InvoiceGeneration />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getWorkspaceSpy).toHaveBeenCalledTimes(1);
    });

    const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(getWorkspaceSpy).toHaveBeenCalledTimes(2);
    });

    expect(generateInvoiceSpy).not.toHaveBeenCalled();
  });
});

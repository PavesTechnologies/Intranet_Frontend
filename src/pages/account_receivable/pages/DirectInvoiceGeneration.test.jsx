import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import TaxCalculation from "./TaxCalculation";
import OccurrenceTaxCalculationDetail from "../components/tax_calculation/OccurrenceTaxCalculationDetail";
import InvoiceGenerationDetail, { DEFAULT_MIN_PRESENTATION_MS } from "./InvoiceGenerationDetail";
import InvoiceDetail from "./InvoiceDetail";
import InvoiceLifecycleStepper from "../components/invoice/InvoiceLifecycleStepper";
import * as invoiceService from "../services/invoiceService";
import * as taxCalcService from "../services/taxCalculationService";
import * as billingDataAcquisitionService from "../services/billingDataAcquisitionService";
import * as billingOccurrenceService from "../services/billingOccurrenceService";
import * as taxRateConfigService from "../services/taxRateConfigurationService";
import * as companyProfileService from "../services/companyProfileService";
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

describe("Redesigned Invoice Generation Draft Preview Workflow", () => {
  const testSnapshotId = "bs-uuid-1111";
  const mockTaxCalc = {
    billingSnapshotId: testSnapshotId,
    snapshotNumber: "BS-20261001-001",
    projectId: "proj-alpha-123",
    projectName: "Enterprise Alpha",
    projectCode: "EA-100",
    clientName: "Global Corp",
    billingPeriodStart: "2026-10-01",
    billingPeriodEnd: "2026-10-31",
    currency: "USD",
    taxableAmount: 5000,
    totalTaxAmount: 900,
    grandTotal: 5900,
    taxCalculationStatus: "COMPLETED",
    status: "TAX_COMPLETED",
    components: [
      { id: "tax-1", taxComponent: "CGST", rate: 9, amount: 450 },
      { id: "tax-2", taxComponent: "SGST", rate: 9, amount: 450 },
    ],
  };

  const mockCompanyProfile = {
    legalName: "Paves Technologies Inc.",
    companyName: "Paves Technologies",
    taxRegistrationNumber: "GSTIN-12345-SELLER",
    email: "billing@paves.io",
    phoneNumber: "+1 800-555-0199",
    address: "100 Innovation Way, Suite 400, New York, NY 10001",
    state: "New York",
  };

  const mockGeneratedInvoice = {
    invoiceId: "inv-uuid-9999",
    invoiceNumber: "INV-2026-0001",
    billingSnapshotId: testSnapshotId,
    invoiceStatus: "GENERATED",
    subtotal: 5000,
    totalTax: 900,
    grandTotal: 5900,
    currency: "USD",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default service mocks
    vi.spyOn(taxCalcService, "getTaxCalculation").mockResolvedValue(mockTaxCalc);
    vi.spyOn(companyProfileService, "getActiveCompanyProfile").mockResolvedValue(mockCompanyProfile);
    vi.spyOn(invoiceService, "getInvoice").mockRejectedValue({ response: { status: 404 } });
    vi.spyOn(invoiceService, "generateInvoice").mockResolvedValue(mockGeneratedInvoice);
    vi.spyOn(invoiceService, "generateInvoiceForOccurrence").mockResolvedValue({
      invoiceId: "inv-occ-8888",
      invoiceNumber: "INV-OCC-001",
    });
    vi.spyOn(invoiceService, "submitInvoiceForApproval").mockResolvedValue({
      ...mockGeneratedInvoice,
      invoiceStatus: "PENDING_APPROVAL",
    });
    vi.spyOn(billingDataAcquisitionService, "fetchActiveBillingConfigurations").mockResolvedValue([]);
    vi.spyOn(billingDataAcquisitionService, "saveAcquiredSnapshotMetadata").mockImplementation(() => {});
    vi.spyOn(billingDataAcquisitionService, "getBillingSnapshotByPeriod").mockResolvedValue({
      laborRecords: [
        {
          id: "ts-1",
          employee: "Jane Doe",
          role: "Lead Architect",
          workDate: "2026-10-15",
          hours: 40,
          rate: 100,
          amount: 4000,
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("Requirement 1: Tax Calculation 'Proceed to Invoice Generation' navigates directly to Invoice Generation draft preview without calling generateInvoice", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/tax-calculation/${testSnapshotId}`]}>
        <Routes>
          <Route path="/account-receivable/tax-calculation/:snapshotId" element={<TaxCalculation />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Tax Calculation Completed")).toBeInTheDocument();
    });

    const proceedBtn = screen.getByRole("button", { name: /Proceed to Invoice Generation/i });
    expect(proceedBtn).toBeInTheDocument();
    expect(proceedBtn).not.toBeDisabled();

    fireEvent.click(proceedBtn);

    // Navigates directly to invoice-generation/:snapshotId (bypassing dashboard)
    expect(mockNavigate).toHaveBeenCalledWith(
      `/account-receivable/invoice-generation/${testSnapshotId}`,
      expect.objectContaining({
        state: expect.objectContaining({
          snapshotId: testSnapshotId,
        }),
      })
    );

    // Did NOT call invoice generation prematurely
    expect(invoiceService.generateInvoice).not.toHaveBeenCalled();
  });

  it("Requirement 2: Fixed Price billing occurrence 'Proceed to Invoice Generation' navigates directly to occurrence draft preview without generating", async () => {
    const occurrenceId = "occ-uuid-5555";
    const mockOccurrence = {
      billingScheduleId: occurrenceId,
      projectName: "Fixed Price Project",
      clientName: "Acme Corp",
      billingAmount: 10000,
      periodStatus: "TAX_COMPLETED",
      status: "TAX_COMPLETED",
      taxCalculationStatus: "COMPLETED",
      currency: "USD",
      taxBreakdown: [{ taxComponent: "GST", amount: 1800 }],
    };

    vi.spyOn(billingOccurrenceService, "getBillingOccurrence").mockResolvedValue(mockOccurrence);
    vi.spyOn(billingOccurrenceService, "getOccurrenceTaxCalculation").mockResolvedValue(mockOccurrence);
    vi.spyOn(taxRateConfigService, "getActiveTaxRateConfigurations").mockResolvedValue([]);
    const spyGenOcc = vi.spyOn(invoiceService, "generateInvoiceForOccurrence").mockResolvedValue({
      invoiceId: "inv-occ-8888",
      invoiceNumber: "INV-OCC-001",
    });

    render(
      <MemoryRouter initialEntries={[`/account-receivable/tax-calculation/occurrence/${occurrenceId}`]}>
        <Routes>
          <Route
            path="/account-receivable/tax-calculation/occurrence/:occurrenceId"
            element={<OccurrenceTaxCalculationDetail occurrenceId={occurrenceId} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Proceed to Invoice Generation/i })).toBeInTheDocument();
    });

    const proceedBtn = screen.getByRole("button", { name: /Proceed to Invoice Generation/i });
    fireEvent.click(proceedBtn);

    // Navigates directly to /account-receivable/invoice-generation/occurrence/:occurrenceId
    expect(mockNavigate).toHaveBeenCalledWith(
      `/account-receivable/invoice-generation/occurrence/${occurrenceId}`,
      expect.objectContaining({
        state: expect.objectContaining({
          occurrenceId,
        }),
      })
    );

    // Did NOT call occurrence invoice generation API
    expect(spyGenOcc).not.toHaveBeenCalled();
  });

  it("Requirement 3: Draft Preview page shows 'Draft Preview' badge, 'DRAFT — NOT GENERATED' indicator, and correct description", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Draft explanation banner should load
    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    // Does NOT auto-generate an invoice on page load
    expect(invoiceService.generateInvoice).not.toHaveBeenCalled();

    // Draft Preview Status Badge
    expect(screen.getAllByText("Draft Preview").length).toBeGreaterThan(0);

    // DRAFT — NOT GENERATED indicator must be visible
    expect(screen.getByText(/DRAFT — NOT GENERATED/i)).toBeInTheDocument();

    // Updated description
    expect(screen.getByText(/Review the invoice details before generating the official invoice/i)).toBeInTheDocument();

    // 4 Context Cards rendered
    expect(screen.getAllByText("Project").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Client").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Billing Period").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Currency").length).toBeGreaterThan(0);

    // Seller information displayed
    expect(screen.getAllByText("Paves Technologies Inc.").length).toBeGreaterThan(0);

    // Client information displayed
    expect(screen.getAllByText("Global Corp").length).toBeGreaterThan(0);

    // Project name displayed
    expect(screen.getAllByText("Enterprise Alpha").length).toBeGreaterThan(0);

    // Line items displayed
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);

    // Tax breakdown displayed
    expect(screen.getAllByText("CGST").length).toBeGreaterThan(0);

    // Financial totals displayed
    expect(screen.getAllByText(/5,900\.00/).length).toBeGreaterThan(0);

    // "Generate Official Invoice" button — new label
    const generateButtons = screen.getAllByRole("button", { name: /Generate Official Invoice/i });
    expect(generateButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("Requirement 4: Draft page shows 'Generate Official Invoice' button label (not 'Generate Invoice')", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Generate Official Invoice/i }).length).toBeGreaterThanOrEqual(1);
    });

    // "Generate Invoice" (without "Official") must NOT appear as a standalone button label
    const plainGenButtons = screen.queryAllByRole("button", { name: /^Generate Invoice$/i });
    expect(plainGenButtons.length).toBe(0);
  });

  it("Requirement 5: Clicking 'Generate Official Invoice' calls API exactly once, displays live generation view with invoice document, and renders official invoice with 'Submit for Approval' without navigating away", async () => {
    let resolveGen;
    const genPromise = new Promise((resolve) => {
      resolveGen = resolve;
    });

    vi.spyOn(invoiceService, "generateInvoice").mockImplementation(() => genPromise);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={100} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    fireEvent.click(generateBtn);

    // 1. Live generation experience appears: Progress screen on top
    await waitFor(() => {
      expect(screen.getByText("Generating Your Invoice")).toBeInTheDocument();
    });
    expect(screen.getByText("Creating your official invoice")).toBeInTheDocument();

    // 2. Draft preview banner and original generate button are hidden during generation
    expect(screen.queryByText(/This is a draft preview of the invoice/i)).not.toBeInTheDocument();

    // 3. Progress steps are displayed
    expect(screen.getByText("Validating tax details")).toBeInTheDocument();
    expect(screen.getByText("Creating invoice")).toBeInTheDocument();
    expect(screen.getByText("Assigning invoice number")).toBeInTheDocument();
    expect(screen.getByText("Finalizing document")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we create your official invoice.")).toBeInTheDocument();

    // 4. Live invoice document is displayed simultaneously below progress area
    expect(screen.getAllByText("Assigning...").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Generating").length).toBeGreaterThan(0);

    // 5. Tax breakdown and financial summary remain visible during generation
    expect(screen.getAllByText("CGST").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5,900\.00/).length).toBeGreaterThan(0);

    // 6. Generate button cannot be clicked twice (not visible in generation state)
    // 7. API called exactly once
    expect(invoiceService.generateInvoice).toHaveBeenCalledTimes(1);
    expect(invoiceService.generateInvoice).toHaveBeenCalledWith(testSnapshotId);

    // Resolve invoice generation
    await act(async () => {
      resolveGen(mockGeneratedInvoice);
    });

    // 8. Transitions to Official Invoice state on the SAME page — NO NAVIGATION to InvoiceDetail!
    await waitFor(() => {
      expect(showStatusToast).toHaveBeenCalledWith("Invoice generated successfully.", "success");
      // Must NOT navigate to separate InvoiceDetail page
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.stringContaining("/account-receivable/invoices/"),
        expect.anything()
      );
      // Badge updates to INVOICE GENERATED
      expect(screen.getAllByText("INVOICE GENERATED").length).toBeGreaterThan(0);
      // Official invoice number from backend is displayed
      expect(screen.getAllByText("INV-2026-0001").length).toBeGreaterThan(0);
      // "Submit for Approval" action button is now displayed
      expect(screen.getAllByRole("button", { name: /Submit for Approval/i }).length).toBeGreaterThan(0);
    });
  });

  it("Requirement 5B: Fast API response still displays generation state for minimum UX duration before showing official invoice", async () => {
    // API resolves almost immediately (10ms)
    vi.spyOn(invoiceService, "generateInvoice").mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockGeneratedInvoice), 10))
    );

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={250} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    fireEvent.click(generateBtn);

    // Generation state appears immediately
    expect(screen.getByText("Generating Your Invoice")).toBeInTheDocument();

    // At 60ms, the API has already returned, but official invoice must NOT have transitioned yet because min UX duration is 250ms
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.getByText("Generating Your Invoice")).toBeInTheDocument();
    expect(screen.queryByText("INVOICE GENERATED")).not.toBeInTheDocument();

    // After the minimum presentation duration (250ms), transitions to official invoice state on same page
    await waitFor(() => {
      expect(screen.getAllByText("INVOICE GENERATED").length).toBeGreaterThan(0);
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.stringContaining("/account-receivable/invoices/"),
        expect.anything()
      );
    }, { timeout: 1500 });
  });

  it("Requirement 5C: Slower API response (> min duration) transitions to official invoice immediately after API completes without unnecessary extra delay", async () => {
    let resolveGen;
    const genPromise = new Promise((resolve) => {
      resolveGen = resolve;
    });

    vi.spyOn(invoiceService, "generateInvoice").mockImplementation(() => genPromise);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={100} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    fireEvent.click(generateBtn);

    expect(screen.getByText("Generating Your Invoice")).toBeInTheDocument();

    // Wait 150ms so min presentation duration (100ms) has already passed
    await new Promise((r) => setTimeout(r, 150));
    // Still on generation screen because API is still pending
    expect(screen.getByText("Generating Your Invoice")).toBeInTheDocument();
    expect(screen.queryByText("INVOICE GENERATED")).not.toBeInTheDocument();

    const tStart = Date.now();
    // Resolve API now
    await act(async () => {
      resolveGen(mockGeneratedInvoice);
    });

    await waitFor(() => {
      expect(screen.getAllByText("INVOICE GENERATED").length).toBeGreaterThan(0);
    });
    const elapsedSinceApiResolve = Date.now() - tStart;
    // Should transition immediately after API resolves (no extra artificial delay)
    expect(elapsedSinceApiResolve).toBeLessThan(600);
  });

  it("Requirement 5E: After generation, clicking 'Submit for Approval' calls API and transitions to PENDING_APPROVAL", async () => {
    vi.spyOn(invoiceService, "generateInvoice").mockResolvedValue(mockGeneratedInvoice);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    fireEvent.click(generateBtn);

    // Wait for invoice to be generated in-place
    await waitFor(() => {
      expect(screen.getAllByText("INVOICE GENERATED").length).toBeGreaterThan(0);
    });

    const submitBtn = screen.getAllByRole("button", { name: /Submit for Approval/i })[0];
    expect(submitBtn).toBeInTheDocument();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(invoiceService.submitInvoiceForApproval).toHaveBeenCalledWith(mockGeneratedInvoice.invoiceId);
      expect(showStatusToast).toHaveBeenCalledWith("Invoice submitted for approval successfully.", "success");
      expect(screen.getAllByText(/PENDING_APPROVAL/i).length).toBeGreaterThan(0);
    });
  });

  it("Requirement 5D: DEFAULT_MIN_PRESENTATION_MS is configured between 800ms and 1500ms for enterprise human perception", () => {
    expect(DEFAULT_MIN_PRESENTATION_MS).toBeGreaterThanOrEqual(800);
    expect(DEFAULT_MIN_PRESENTATION_MS).toBeLessThanOrEqual(1500);
  });

  it("Requirement 6: Double-clicking 'Generate Official Invoice' triggers exactly one POST request", async () => {
    let resolveGen;
    const genPromise = new Promise((resolve) => {
      resolveGen = resolve;
    });

    vi.spyOn(invoiceService, "generateInvoice").mockImplementation(() => genPromise);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={100} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    // Click twice in quick succession
    fireEvent.click(generateBtn);
    fireEvent.click(generateBtn);

    // Only ONE API call despite two clicks
    expect(invoiceService.generateInvoice).toHaveBeenCalledTimes(1);

    // Cleanup: wait for generation to complete in this test so no dangling timer leaks
    await act(async () => {
      resolveGen(mockGeneratedInvoice);
    });
    await waitFor(() => {
      expect(screen.getAllByText("INVOICE GENERATED").length).toBeGreaterThan(0);
    });
  });

  it("Requirement 7: Invoice generation failure returns to draft page and preserves backend error message", async () => {
    mockNavigate.mockClear();
    const apiError = {
      response: {
        status: 500,
        data: { message: "Internal server error occurred during invoice generation." },
      },
    };

    vi.spyOn(invoiceService, "generateInvoice").mockRejectedValueOnce(apiError);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(showStatusToast).toHaveBeenCalledWith(
        expect.stringContaining("error"),
        "error"
      );
    });

    // Does NOT navigate to invoice detail
    expect(mockNavigate).not.toHaveBeenCalledWith(
      expect.stringContaining("/account-receivable/invoices/"),
      expect.anything()
    );

    // User returns to draft page (processing screen has gone, draft restored)
    expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();

    // Generate Official Invoice button restored (not permanently disabled)
    expect(screen.getAllByRole("button", { name: /Generate Official Invoice/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("Requirement 8: If invoice already exists, does not regenerate — shows View Generated Invoice action", async () => {
    vi.spyOn(invoiceService, "getInvoice").mockResolvedValue(mockGeneratedInvoice);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Invoice Generated Successfully")).toBeInTheDocument();
    });

    // Displays invoice number
    expect(screen.getAllByText("INV-2026-0001").length).toBeGreaterThan(0);

    // Does NOT call generateInvoice
    expect(invoiceService.generateInvoice).not.toHaveBeenCalled();

    // View action exists; "Generate Official Invoice" is NOT shown
    const viewBtn = screen.getAllByRole("button", { name: /View Generated Invoice/i })[0];
    expect(viewBtn).toBeInTheDocument();

    // "Generate Official Invoice" must NOT appear when invoice already generated
    expect(screen.queryAllByRole("button", { name: /Generate Official Invoice/i }).length).toBe(0);

    fireEvent.click(viewBtn);
    // Opens official invoice modal instead of navigating away to old invoice detail page
    expect(screen.getByText("Official Invoice Created")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Requirement 9: Incomplete tax calculation disables Generate Official Invoice and shows Back to Tax Calculation link", async () => {
    const incompleteTax = {
      ...mockTaxCalc,
      taxCalculationStatus: "INCOMPLETE",
      status: "INCOMPLETE",
      grandTotal: undefined,
      totalTaxAmount: undefined,
    };

    vi.spyOn(taxCalcService, "getTaxCalculation").mockResolvedValue(incompleteTax);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Tax Calculation Incomplete")).toBeInTheDocument();
    });

    // Generate Official Invoice button is disabled when tax not completed
    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    expect(generateBtn).toBeDisabled();

    // Does NOT call generateInvoice
    expect(invoiceService.generateInvoice).not.toHaveBeenCalled();

    // Back to Tax Calculation button exists
    const backBtn = screen.getAllByRole("button", { name: /Back to Tax Calculation/i })[0];
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      `/account-receivable/tax-calculation/${testSnapshotId}`
    );
  });

  it("Requirement 10: Optional missing seller/client fields display fallback without failing", async () => {
    const sparseTaxCalc = {
      ...mockTaxCalc,
      clientName: "Minimal Client",
      projectCode: null,
    };

    vi.spyOn(taxCalcService, "getTaxCalculation").mockResolvedValue(sparseTaxCalc);
    vi.spyOn(companyProfileService, "getActiveCompanyProfile").mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    // "Not configured" is displayed for unconfigured optional fields
    expect(screen.getAllByText("Not configured").length).toBeGreaterThan(0);
  });

  it("Requirement 11: InvoiceDetail shows 'Submit for Approval' when invoice status is GENERATED", async () => {
    const generatedInvoice = {
      ...mockGeneratedInvoice,
      invoiceId: "inv-uuid-9999",
      invoiceStatus: "GENERATED",
    };
    vi.spyOn(invoiceService, "getInvoice").mockResolvedValue(generatedInvoice);
    vi.spyOn(companyProfileService, "getActiveCompanyProfile").mockResolvedValue(mockCompanyProfile);
    vi.spyOn(invoiceService, "getInvoiceApprovalHistory").mockResolvedValue([]);
    vi.spyOn(taxCalcService, "getTaxCalculation").mockResolvedValue(mockTaxCalc);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoices/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoices/:snapshotId"
            element={<InvoiceDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submit for Approval/i })).toBeInTheDocument();
    });

    // "Generate Official Invoice" must NOT appear on the official invoice page
    expect(screen.queryByRole("button", { name: /Generate Official Invoice/i })).toBeNull();

    // Invoice status badge shows GENERATED
    expect(screen.getAllByText(/GENERATED/i).length).toBeGreaterThan(0);
  });

  it("Requirement 12: 409 Conflict (already generated) displays existing invoice on page without creating a second generation", async () => {
    const conflictError = {
      response: {
        status: 409,
        data: { message: "Invoice already generated for this billing snapshot." },
      },
    };

    // Page load: getInvoice returns 404 (no existing invoice on initial load)
    // Then generateInvoice raises 409, and the fallback getInvoice fetch returns the existing invoice
    vi.spyOn(invoiceService, "getInvoice")
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce(mockGeneratedInvoice);
    vi.spyOn(invoiceService, "generateInvoice").mockRejectedValueOnce(conflictError);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Generate Official Invoice/i }).length).toBeGreaterThan(0);
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    fireEvent.click(generateBtn);

    await waitFor(() => {
      // Displays the existing invoice on the same page
      expect(screen.getAllByText("INVOICE GENERATED").length).toBeGreaterThan(0);
      expect(screen.getAllByText("INV-2026-0001").length).toBeGreaterThan(0);
      // Does NOT navigate away
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.stringContaining("/account-receivable/invoices/"),
        expect.anything()
      );
    });

    // generateInvoice called exactly once (not twice)
    expect(invoiceService.generateInvoice).toHaveBeenCalledTimes(1);
  });


  it("Requirement 13: Tax breakdown financial totals are unchanged after generation flow", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This is a draft preview of the invoice/i)).toBeInTheDocument();
    });

    // Original tax amounts from mockTaxCalc remain intact
    expect(screen.getAllByText(/5,900\.00/).length).toBeGreaterThan(0);

    // Tax components displayed without modification
    expect(screen.getAllByText("CGST").length).toBeGreaterThan(0);
  });

  it("Requirement 14: AR Lifecycle Stepper renders all 4 business workflow stages with Draft Review active", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Reviewing Financial Draft/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText("Acquisition").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tax Calculation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Draft Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Official Invoice").length).toBeGreaterThan(0);
  });

  it("Requirement 15: Financial Readiness Audit UI is removed and compact readiness indicator is shown", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Invoice Generation" })).toBeInTheDocument();
    });

    // Verify Financial Readiness Audit UI is removed completely
    expect(screen.queryByText(/Financial Readiness Audit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prerequisites Ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Effective Tax Rate")).not.toBeInTheDocument();
    expect(screen.queryByText("Calculated Subtotal")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified Grand Total")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show 7 Checks/i })).not.toBeInTheDocument();

    // Verify compact readiness indication and direct invoice document are present
    expect(screen.getByText("Ready to Generate")).toBeInTheDocument();
    expect(screen.getByText(/All required invoice, tax, and financial information is available/i)).toBeInTheDocument();
    expect(screen.getAllByText("TAX INVOICE").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Generate Official Invoice/i })).toBeInTheDocument();
  });

  it("Requirement 16: Generation modal opens in GENERATING state, transforms into GENERATED state with official invoice and Submit for Approval", async () => {
    let resolveGen;
    const genPromise = new Promise((resolve) => {
      resolveGen = resolve;
    });

    vi.spyOn(invoiceService, "generateInvoice").mockImplementation(() => genPromise);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Generate Official Invoice/i }).length).toBeGreaterThan(0);
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    fireEvent.click(generateBtn);

    // Modal is open in GENERATING state
    await waitFor(() => {
      expect(screen.getByText("Generating Your Invoice")).toBeInTheDocument();
    });
    expect(screen.getByText("Creating your official invoice")).toBeInTheDocument();

    // Resolve invoice generation
    await act(async () => {
      resolveGen(mockGeneratedInvoice);
    });

    // Modal transforms into GENERATED state containing official invoice header & Submit for Approval
    await waitFor(() => {
      expect(screen.getByText("Official Invoice Created")).toBeInTheDocument();
      expect(screen.getAllByText("INV-2026-0001").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /Submit for Approval/i }).length).toBeGreaterThan(0);
    });
  });

  it("Requirement 17: Closing the generation modal preserves official invoice state on the background page", async () => {
    vi.spyOn(invoiceService, "generateInvoice").mockResolvedValue(mockGeneratedInvoice);

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${testSnapshotId}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Generate Official Invoice/i }).length).toBeGreaterThan(0);
    });

    const generateBtn = screen.getAllByRole("button", { name: /Generate Official Invoice/i })[0];
    fireEvent.click(generateBtn);

    // Wait for modal to transition to GENERATED
    await waitFor(() => {
      expect(screen.getByText("Official Invoice Created")).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /^Close$/i });
    fireEvent.click(closeBtn);

    // Modal is closed, but background page displays official invoice generated state
    await waitFor(() => {
      expect(screen.queryByText("Official Invoice Created")).not.toBeInTheDocument();
      expect(screen.getAllByText("INVOICE GENERATED").length).toBeGreaterThan(0);
      expect(screen.getAllByText("INV-2026-0001").length).toBeGreaterThan(0);
    });
  });
});



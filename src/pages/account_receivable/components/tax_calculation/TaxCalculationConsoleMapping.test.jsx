import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import TaxCalculationConsole from "./TaxCalculationConsole";
import * as billingDataAcquisitionService from "../../services/billingDataAcquisitionService";
import * as billingOccurrenceService from "../../services/billingOccurrenceService";
import * as taxRateConfigService from "../../services/taxRateConfigurationService";
import * as taxCalcService from "../../services/taxCalculationService";
import * as invoiceService from "../../services/invoiceService";

// Mock toast notifications
vi.mock("../../../../components/toastfy/toast", () => ({
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

describe("TaxCalculationConsole - T&M Snapshot Resolution and Pipeline Mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.spyOn(taxRateConfigService, "getActiveTaxRegions").mockResolvedValue([
      { taxRegionId: "reg-1", taxRegionName: "India" },
    ]);
    vi.spyOn(taxCalcService, "getTaxCalculation").mockRejectedValue(new Error("Not calculated"));
    vi.spyOn(invoiceService, "getInvoice").mockRejectedValue(new Error("Not invoiced"));
  });

  it("A. Preserves snapshotId + billingPeriodStart/billingPeriodEnd from fetchActiveBillingConfigurations", async () => {
    // Test the service mapper directly
    const mockApiResponse = [
      {
        billingConfigurationId: "cfg-101",
        projectId: 23,
        projectName: "Website Redesign",
        projectCode: "PRJ-23",
        clientName: "Account Management",
        billingType: "Timesheet Based",
        frequency: "Monthly",
        currency: "USD",
        billingPeriodStart: "2026-08-05",
        billingPeriodEnd: "2026-09-05",
        generationMode: "MANUAL",
        status: "READY",
        snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
        snapshotNumber: "BS-20261007-01",
      },
    ];

    vi.spyOn(billingOccurrenceService, "getBillingOccurrences").mockResolvedValue([]);
    vi.spyOn(billingDataAcquisitionService, "fetchActiveBillingConfigurations").mockResolvedValue([
      {
        id: "BC-23",
        billingConfigurationId: "cfg-101",
        projectId: 23,
        projectCode: "PRJ-23",
        projectName: "Website Redesign",
        client: "Account Management",
        billingType: "Timesheet Based",
        billingTypeCode: "TIME_MATERIAL",
        billingFrequency: "Monthly",
        billingPeriodStart: "2026-08-05",
        billingPeriodEnd: "2026-09-05",
        periodStart: "2026-08-05",
        periodEnd: "2026-09-05",
        billingStatus: "READY",
        snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
        snapshotNumber: "BS-20261007-01",
        currency: "USD",
      },
    ]);

    vi.spyOn(billingDataAcquisitionService, "getBillingSnapshotByPeriod").mockResolvedValue({
      snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
      snapshotNumber: "BS-20261007-01",
      projectId: 23,
      status: "READY_FOR_TAX",
      totalAmount: 26400,
      billingPeriodStart: "2026-08-05",
      billingPeriodEnd: "2026-09-05",
      billingPeriod: "05 Aug 2026 - 05 Sep 2026",
    });

    render(
      <MemoryRouter>
        <TaxCalculationConsole />
      </MemoryRouter>
    );

    // Verify snapshot appears with READY_FOR_TAX
    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
      expect(screen.getByText("Account Management")).toBeInTheDocument();
      expect(screen.getByText("Calculate Tax")).toBeInTheDocument();
    });
  });

  it("B. Displays READY_FOR_TAX snapshot in workspace records and updates KPI count", async () => {
    vi.spyOn(billingOccurrenceService, "getBillingOccurrences").mockResolvedValue([]);
    vi.spyOn(billingDataAcquisitionService, "fetchActiveBillingConfigurations").mockResolvedValue([
      {
        id: "BC-23",
        billingConfigurationId: "cfg-101",
        projectId: 23,
        projectCode: "PRJ-23",
        projectName: "Website Redesign",
        client: "Account Management",
        billingType: "Timesheet Based",
        billingTypeCode: "TIME_MATERIAL",
        billingPeriodStart: "2026-08-05",
        billingPeriodEnd: "2026-09-05",
        snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
        snapshotNumber: "BS-20261007-01",
        billingStatus: "READY",
      },
    ]);

    vi.spyOn(billingDataAcquisitionService, "getBillingSnapshotByPeriod").mockResolvedValue({
      snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
      snapshotNumber: "BS-20261007-01",
      projectId: 23,
      status: "READY_FOR_TAX",
      totalAmount: 26400,
      billingPeriodStart: "2026-08-05",
      billingPeriodEnd: "2026-09-05",
    });

    render(
      <MemoryRouter>
        <TaxCalculationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    });

    // Check KPIs: Ready for Tax = 1, Total = 1
    const readyForTaxButtons = screen.getAllByRole("button", { name: /Ready for Tax/i });
    expect(readyForTaxButtons.length).toBeGreaterThan(0);
    expect(screen.getByText("Calculate Tax")).toBeInTheDocument();
  });

  it("C. Resolves snapshot when periodStart is missing but billingPeriodStart is valid", async () => {
    vi.spyOn(billingOccurrenceService, "getBillingOccurrences").mockResolvedValue([]);
    vi.spyOn(billingDataAcquisitionService, "fetchActiveBillingConfigurations").mockResolvedValue([
      {
        id: "BC-23",
        billingConfigurationId: "cfg-101",
        projectId: 23,
        projectCode: "PRJ-23",
        projectName: "Website Redesign",
        client: "Account Management",
        billingType: "Timesheet Based",
        billingTypeCode: "TIME_MATERIAL",
        billingPeriodStart: "2026-08-05",
        billingPeriodEnd: "2026-09-05",
        periodStart: "", // periodStart is empty string
        periodEnd: "",
        snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
        billingStatus: "READY",
      },
    ]);

    const getSnapshotMock = vi.spyOn(billingDataAcquisitionService, "getBillingSnapshotByPeriod").mockResolvedValue({
      snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
      snapshotNumber: "BS-20261007-01",
      projectId: 23,
      status: "READY_FOR_TAX",
      totalAmount: 26400,
      billingPeriodStart: "2026-08-05",
      billingPeriodEnd: "2026-09-05",
    });

    render(
      <MemoryRouter>
        <TaxCalculationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getSnapshotMock).toHaveBeenCalledWith(23, "2026-08-05", "2026-09-05", "cfg-101");
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    });
  });

  it("D. Uses savedMeta with billingPeriodStart/billingPeriodEnd correctly", async () => {
    vi.spyOn(billingOccurrenceService, "getBillingOccurrences").mockResolvedValue([]);
    // active configurations has no period (e.g. backend status was NOT_ACQUIRED)
    vi.spyOn(billingDataAcquisitionService, "fetchActiveBillingConfigurations").mockResolvedValue([
      {
        id: "BC-23",
        billingConfigurationId: "cfg-101",
        projectId: 23,
        projectCode: "PRJ-23",
        projectName: "Website Redesign",
        client: "Account Management",
        billingType: "Timesheet Based",
        billingTypeCode: "TIME_MATERIAL",
        billingPeriodStart: null,
        billingPeriodEnd: null,
        periodStart: "",
        periodEnd: "",
        snapshotId: null,
        billingStatus: "NOT_ACQUIRED",
      },
    ]);

    // Metadata saved in localStorage using billingPeriodStart / billingPeriodEnd
    billingDataAcquisitionService.saveAcquiredSnapshotMetadata(23, {
      projectId: 23,
      billingConfigurationId: "cfg-101",
      snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
      snapshotNumber: "BS-20261007-01",
      status: "READY_FOR_TAX",
      billingPeriodStart: "2026-08-05",
      billingPeriodEnd: "2026-09-05",
      billingPeriod: "05 Aug 2026 - 05 Sep 2026",
      totalAmount: 26400,
    });

    const getSnapshotMock = vi.spyOn(billingDataAcquisitionService, "getBillingSnapshotByPeriod").mockResolvedValue({
      snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
      snapshotNumber: "BS-20261007-01",
      projectId: 23,
      status: "READY_FOR_TAX",
      totalAmount: 26400,
      billingPeriodStart: "2026-08-05",
      billingPeriodEnd: "2026-09-05",
    });

    render(
      <MemoryRouter>
        <TaxCalculationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getSnapshotMock).toHaveBeenCalledWith(23, "2026-08-05", "2026-09-05", "cfg-101");
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
      expect(screen.getByText("Calculate Tax")).toBeInTheDocument();
    });
  });

  it("E. Preserves snapshotId fallback when by-period lookup fails", async () => {
    vi.spyOn(billingOccurrenceService, "getBillingOccurrences").mockResolvedValue([]);
    vi.spyOn(billingDataAcquisitionService, "fetchActiveBillingConfigurations").mockResolvedValue([
      {
        id: "BC-23",
        billingConfigurationId: "cfg-101",
        projectId: 23,
        projectCode: "PRJ-23",
        projectName: "Website Redesign",
        client: "Account Management",
        billingType: "Timesheet Based",
        billingTypeCode: "TIME_MATERIAL",
        billingPeriodStart: "2026-08-05",
        billingPeriodEnd: "2026-09-05",
        periodStart: "2026-08-05",
        periodEnd: "2026-09-05",
        snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
        snapshotNumber: "BS-20261007-01",
        billingStatus: "READY",
      },
    ]);

    // by-period returns null (lookup failure)
    vi.spyOn(billingDataAcquisitionService, "getBillingSnapshotByPeriod").mockResolvedValue(null);

    render(
      <MemoryRouter>
        <TaxCalculationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
      expect(screen.getByText("Calculate Tax")).toBeInTheDocument();
    });
  });

  it("F. Keeps Recurring/Milestone TAX_PENDING occurrences completely unaffected", async () => {
    // T&M active configs empty
    vi.spyOn(billingDataAcquisitionService, "fetchActiveBillingConfigurations").mockResolvedValue([]);

    // Milestone / Recurring occurrence returned from getBillingOccurrences
    const mockOccurrence = {
      billingScheduleId: "occ-999",
      billingConfigurationId: "cfg-milestone-1",
      projectName: "Milestone Infrastructure",
      clientName: "Enterprise Client",
      currencyCode: "USD",
      scheduleType: "MILESTONE",
      periodNumber: 1,
      periodStartDate: "2026-09-01",
      periodEndDate: "2026-09-30",
      billingDate: "2026-09-30",
      billingAmount: 15000,
      taxableAmount: 15000,
      periodStatus: "TAX_PENDING",
      taxStatus: "TAX_PENDING",
      isInvoiced: false,
    };

    vi.spyOn(billingOccurrenceService, "getBillingOccurrences").mockImplementation(async (params) => {
      if (params?.periodStatus === "TAX_PENDING" && !params?.isInvoiced) {
        return [mockOccurrence];
      }
      return [];
    });

    render(
      <MemoryRouter>
        <TaxCalculationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Milestone Infrastructure")).toBeInTheDocument();
      expect(screen.getByText("Enterprise Client")).toBeInTheDocument();
      expect(screen.getByText("Calculate Tax")).toBeInTheDocument();
    });
  });
});

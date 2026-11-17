import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  getApplicableChargeTypes,
  normalizeExpenseRecord,
  sumCostBasis,
  fetchEligibleExpenses,
  acquireBillingData,
  getBillingSnapshotByPeriod,
  createBillingSnapshot,
  getSafeBackendErrorMessage,
  isValidUuid,
  deduplicateExpenseRecords,
} from "../services/billingDataAcquisitionService";
import {
  buildBillingConfigurationRequestPayload,
  normalizeBillingConfiguration,
  normalizeControls,
} from "../services/billingConfigurationService";
import ExpenseDataTable from "../components/acquisition/ExpenseDataTable";
import CommercialCalculationCard from "../components/acquisition/CommercialCalculationCard";
import BillingSummaryGrid from "../components/acquisition/BillingSummaryGrid";
import SnapshotWorkspace from "../components/acquisition/SnapshotWorkspace";

// Mock axios instance used in billingDataAcquisitionService
vi.mock("../../../api/axiosInstance", () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

import api from "../../../api/axiosInstance";

describe("Expense Management Integration — AR Frontend (Phase 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Project Billing Setup: Expense Management Eligibility Control", () => {
    it("preserves expenseBillingEligible flag across wizard request payload building", () => {
      const wizardData = {
        projectId: "101",
        billingTypeId: "1",
        billingFrequencyId: "2",
        currency: "USD",
        controls: {
          expenseBillingEligible: true,
          invoiceGenerationType: "MANUAL",
        },
      };

      const payload = buildBillingConfigurationRequestPayload(wizardData);
      expect(payload.expenseBillingEligible).toBe(true);

      const wizardDataDisabled = {
        ...wizardData,
        controls: { expenseBillingEligible: false },
      };
      const payloadDisabled = buildBillingConfigurationRequestPayload(wizardDataDisabled);
      expect(payloadDisabled.expenseBillingEligible).toBe(false);
    });

    it("normalizes expenseBillingEligible in normalizeControls and normalizeBillingConfiguration", () => {
      const controls = normalizeControls({
        expenseBillingEligible: true,
      });
      expect(controls.expenseBillingEligible).toBe(true);

      const controlsFalse = normalizeControls({
        expenseBillingEligible: false,
      });
      expect(controlsFalse.expenseBillingEligible).toBe(false);

      const config = normalizeBillingConfiguration({
        expenseBillingEligible: true,
      });
      expect(config.expenseBillingEligible).toBe(true);
    });

    it("determines applicable charge types based on expenseBillingEligible flag", () => {
      const applicableEligible = getApplicableChargeTypes("TIME_MATERIAL", false, true);
      expect(applicableEligible.labor).toBe(true);
      expect(applicableEligible.expense).toBe(true);

      const applicableDisabled = getApplicableChargeTypes("TIME_MATERIAL", false, false);
      expect(applicableDisabled.labor).toBe(true);
      expect(applicableDisabled.expense).toBe(false);
    });
  });

  describe("2. Snapshot Overview: Expense Billing Eligibility Indicator", () => {
    it("displays Expense Billing: Enabled when project is expense eligible", () => {
      const config = {
        projectName: "Apex Cloud Migration",
        client: "Acme Corp",
        billingType: "TIME_MATERIAL",
        billingFrequency: "Monthly",
        currency: "USD",
        expenseBillingEligible: true,
      };

      render(<BillingSummaryGrid config={config} />);
      const statusBadge = screen.getByTestId("expense-billing-status");
      expect(statusBadge).toHaveTextContent("Enabled");
    });

    it("displays Expense Billing: Disabled when project is not expense eligible", () => {
      const config = {
        projectName: "Apex Cloud Migration",
        client: "Acme Corp",
        billingType: "TIME_MATERIAL",
        billingFrequency: "Monthly",
        currency: "USD",
        expenseBillingEligible: false,
      };

      render(<BillingSummaryGrid config={config} />);
      const statusBadge = screen.getByTestId("expense-billing-status");
      expect(statusBadge).toHaveTextContent("Disabled");
    });
  });

  describe("3. Expense Record Normalization and Cost Basis Integrity", () => {
    it("maps costBasis directly as the billable amount without React recalculation", () => {
      const rawExpense = {
        id: "exp-101",
        expenseDate: "2026-07-15",
        reportNumber: "EXP-2026-881",
        categoryName: "Airfare",
        description: "Flight to client HQ",
        merchant: "Delta",
        employeeName: "John Doe",
        costBasis: 450.75,
        grossAmount: 500.0,
        recoverableTaxAmount: 49.25,
        currency: "USD",
        receiptCount: 1,
      };

      const normalized = normalizeExpenseRecord(rawExpense, "USD");

      expect(normalized.costBasis).toBe(450.75);
      expect(normalized.amount).toBe(450.75);
      expect(normalized.reportNumber).toBe("EXP-2026-881");
      expect(normalized.category).toBe("Airfare");
      expect(normalized.merchant).toBe("Delta");
      expect(normalized.employee).toBe("John Doe");
      expect(normalized.receiptCount).toBe(1);
    });

    it("sums cost basis accurately across expense records", () => {
      const records = [
        { costBasis: 100.5 },
        { costBasis: 250.0 },
        { costBasis: 40.5 },
      ];
      expect(sumCostBasis(records)).toBe(391.0);
    });
  });

  describe("4. AR Backend Supported Endpoints Integration", () => {
    it("retrieves snapshot expense records using supported AR endpoint", async () => {
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            snapshotId: "SNAP-999",
            status: "READY_FOR_TAX",
            expenseRecords: [
              {
                id: "EXP-101",
                expenseDate: "2026-07-10",
                reportNumber: "REP-01",
                costBasis: 500.0,
                categoryName: "Meals",
                merchant: "Bistro",
                employeeName: "Alice",
              },
            ],
            expenseAmount: 500.0,
          },
        },
      });

      const res = await fetchEligibleExpenses(15, "2026-07-01", "2026-07-31", 88);

      expect(api.get).toHaveBeenCalled();
      const calledUrl = api.get.mock.calls[0][0];
      const calledConfig = api.get.mock.calls[0][1];

      expect(calledUrl).toContain("/billing-snapshots/by-period");
      expect(calledConfig.params).toEqual({
        projectId: 15,
        billingPeriodStart: "2026-07-01",
        billingPeriodEnd: "2026-07-31",
        billingConfigurationId: 88,
      });

      expect(res.records.length).toBe(1);
      expect(res.amount).toBe(500.0);
      expect(res.status).toBe("success");
    });

    it("handles empty state when no eligible expenses exist", async () => {
      api.get.mockResolvedValueOnce({ data: { data: { expenseRecords: [], expenseAmount: 0 } } });

      const res = await fetchEligibleExpenses(999, "2026-08-01", "2026-08-31", 12);
      expect(res.records.length).toBe(0);
      expect(res.amount).toBe(0);
      expect(res.status).toBe("empty");
    });

    it("acquires both labor and expenses when project is expense-eligible", async () => {
      const context = {
        projectId: 10,
        billingConfigurationId: 20,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      api.post
        .mockResolvedValueOnce({
          data: {
            snapshotId: "SNAP-100",
            status: "READY_FOR_TAX",
            timesheets: [
              { id: "T1", employee: "Bob", hours: 10, rate: 100, amount: 1000, approvalStatus: "Approved" },
            ],
            expenseRecords: [
              { id: "E1", costBasis: 300, categoryName: "Software", description: "IDE license" },
            ],
            expenseAmount: 300,
          },
        })
        .mockResolvedValue({ data: { success: true } });

      const results = await acquireBillingData(context, "2026-07-01", "2026-07-31");

      expect(results.labor.applicable).toBe(true);
      expect(results.labor.amount).toBe(1000);
      expect(results.expense.applicable).toBe(true);
      expect(results.expense.status).toBe("success");
      expect(results.expense.amount).toBe(300);
      expect(results.subtotal).toBe(1300); // 1000 labor + 300 expenses
    });

    it("consumes actual backend BillingSnapshotResponseDto with expenses: List<ExpenseLineItemDto>", async () => {
      const context = {
        projectId: 10,
        billingConfigurationId: 20,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      // Actual backend DTO contract matching BillingSnapshotResponseDto and ExpenseLineItemDto
      api.post
        .mockResolvedValueOnce({
          data: {
            snapshotId: 55,
            snapshotNumber: "SNAP-2026-0055",
            projectId: 10,
            billingConfigurationId: 20,
            billingPeriodStart: "2026-07-01",
            billingPeriodEnd: "2026-07-31",
            subtotal: 2500.0,
            expenseAmount: 450.5,
            totalAmount: 2950.5,
            status: "READY_FOR_TAX",
            timesheets: [
              {
                sourceReferenceId: "TS-101",
                employee: "Sarah Connor",
                workDate: "2026-07-15",
                hours: 25,
                rate: 100,
                amount: 2500,
                approvalStatus: "Approved",
              },
            ],
            expenses: [
              {
                sourceReferenceId: "XMS-EXP-8891",
                expenseDate: "2026-07-20",
                category: "Travel - Airfare",
                description: "Client on-site consulting",
                reportNumber: "EXP-2026-441",
                currency: "USD",
                costBasis: 450.5,
                sourceSystem: "XMS",
              },
            ],
          },
        })
        .mockResolvedValue({ data: { success: true } });

      const results = await acquireBillingData(context, "2026-07-01", "2026-07-31");

      expect(results.success).toBe(true);
      expect(results.labor.records.length).toBe(1);
      expect(results.expense.applicable).toBe(true);
      expect(results.expense.status).toBe("success");
      expect(results.expense.records.length).toBe(1);
      expect(results.expense.records[0].sourceReferenceId).toBe("XMS-EXP-8891");
      expect(results.expense.records[0].category).toBe("Travel - Airfare");
      expect(results.expense.records[0].reportNumber).toBe("EXP-2026-441");
      expect(results.expense.records[0].costBasis).toBe(450.5);
      expect(results.expense.records[0].sourceSystem).toBe("XMS");
      expect(results.expense.amount).toBe(450.5);
    });

    it("distinguishes missing expense collection from legitimately empty collection", async () => {
      // Snapshot has NO expenses field at all (missing from response)
      const snapshotWithoutExpenses = {
        snapshotId: 60,
        status: "READY_FOR_TAX",
        timesheets: [{ id: "T1", amount: 1000 }],
      };

      const resMissing = await fetchEligibleExpenses(10, "2026-07-01", "2026-07-31", 20, snapshotWithoutExpenses);
      expect(resMissing.status).toBe("incomplete");
      expect(resMissing.error).toMatch(/not provided/i);

      // Snapshot explicitly has expenses: []
      const snapshotWithEmptyExpenses = {
        snapshotId: 61,
        status: "READY_FOR_TAX",
        timesheets: [{ id: "T1", amount: 1000 }],
        expenses: [],
      };

      const resEmpty = await fetchEligibleExpenses(10, "2026-07-01", "2026-07-31", 20, snapshotWithEmptyExpenses);
      expect(resEmpty.status).toBe("empty");
      expect(resEmpty.records.length).toBe(0);
      expect(resEmpty.amount).toBe(0);
    });
  });

  describe("5. Expenses Section States (ExpenseDataTable)", () => {
    it("State 1: renders Expense Billing Disabled state when isExpenseEligible is false", () => {
      render(
        <ExpenseDataTable
          isExpenseEligible={false}
          billingStatus="READY_FOR_TAX"
        />
      );

      expect(screen.getByTestId("expenses-disabled-state")).toBeInTheDocument();
      expect(screen.getByText("Expense Billing Disabled")).toBeInTheDocument();
    });

    it("State 2: renders Not Yet Acquired state when snapshot is not acquired", () => {
      render(
        <ExpenseDataTable
          isExpenseEligible={true}
          billingStatus="NOT_ACQUIRED"
          records={[]}
          amount={0}
        />
      );

      expect(screen.getByTestId("expenses-not-acquired-state")).toBeInTheDocument();
      expect(screen.getByText("Expenses Not Yet Acquired")).toBeInTheDocument();
    });

    it("State 3: renders Acquisition Failed state with retry button when error occurs", () => {
      const onRetry = vi.fn();
      render(
        <ExpenseDataTable
          isExpenseEligible={true}
          billingStatus="ACQUISITION_FAILED"
          error="Network timeout reaching backend"
          onRetry={onRetry}
        />
      );

      expect(screen.getByTestId("expenses-failed-state")).toBeInTheDocument();
      expect(screen.getByText("Expense Acquisition Failed")).toBeInTheDocument();
      expect(screen.getByText("Network timeout reaching backend")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /retry acquisition/i });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("State 3b: renders Incomplete Data state when backend omitted expense data", () => {
      render(
        <ExpenseDataTable
          isExpenseEligible={true}
          billingStatus="ACQUISITION_FAILED"
          error="Expense data was not provided in the billing snapshot response."
        />
      );

      expect(screen.getByTestId("expenses-incomplete-state")).toBeInTheDocument();
      expect(screen.getByText("Expense Data Incomplete")).toBeInTheDocument();
      expect(screen.getByText(/was not provided/i)).toBeInTheDocument();
    });

    it("State 4: renders Successfully Acquired With No Eligible Expenses state", () => {
      render(
        <ExpenseDataTable
          isExpenseEligible={true}
          billingStatus="READY_FOR_TAX"
          records={[]}
          amount={0}
        />
      );

      expect(screen.getByTestId("expenses-empty-state")).toBeInTheDocument();
      expect(screen.getByText("No Eligible Expenses Found")).toBeInTheDocument();
    });

    it("State 5: renders Acquired Expense Records table with all required fields", () => {
      const records = [
        {
          id: "exp-1",
          expenseDate: "2026-07-12",
          reportNumber: "REP-2026-01",
          category: "Client Travel",
          description: "Flight to client site",
          merchant: "Delta Airlines",
          employee: "Jane Doe",
          costBasis: 680.5,
          currency: "USD",
          receiptCount: 2,
          approvalStatus: "Approved",
        },
      ];

      render(
        <ExpenseDataTable
          isExpenseEligible={true}
          billingStatus="READY_FOR_TAX"
          records={records}
          currency="USD"
        />
      );

      expect(screen.getByTestId("expenses-table-section")).toBeInTheDocument();
      expect(screen.getByText("2026-07-12")).toBeInTheDocument();
      expect(screen.getByText("REP-2026-01")).toBeInTheDocument();
      expect(screen.getByText("Client Travel")).toBeInTheDocument();
      expect(screen.getByText("Flight to client site")).toBeInTheDocument();
      expect(screen.getByText("Delta Airlines")).toBeInTheDocument();
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("USD 680.50")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("renders loading state indicator", () => {
      render(<ExpenseDataTable loading={true} />);
      expect(screen.getByTestId("expenses-loading-state")).toBeInTheDocument();
      expect(
        screen.getByText("Retrieving eligible expenses from Expense Management integration...")
      ).toBeInTheDocument();
    });
  });

  describe("6. Commercial Value Calculation Integration", () => {
    it("combines labor subtotal and expense costBasis correctly without double-counting", () => {
      render(
        <CommercialCalculationCard
          laborAmount={5000}
          expenseAmount={1200}
          adjustments={0}
          currency="USD"
        />
      );

      expect(screen.getByText("USD 5,000.00")).toBeInTheDocument();
      expect(screen.getByText("USD 1,200.00")).toBeInTheDocument();
      expect(screen.getByText("USD 6,200.00")).toBeInTheDocument(); // 5000 + 1200
    });
  });

  describe("7. Workspace Coexistence of Timesheets and Expenses", () => {
    it("renders both Source Timesheets and Expenses sections in Billing Items", () => {
      const config = {
        projectName: "Mobile Banking App",
        client: "FinTech Corp",
        billingType: "TIME_MATERIAL",
        currency: "USD",
        expenseBillingEligible: true,
        billingStatus: "READY_FOR_TAX",
      };

      const acquisitionResults = {
        labor: {
          applicable: true,
          records: [
            { id: "T1", employee: "Alice", hours: 40, rate: 100, amount: 4000, approvalStatus: "Approved" },
          ],
          amount: 4000,
        },
        expense: {
          applicable: true,
          records: [
            { id: "E1", costBasis: 500, category: "Travel", description: "Train", merchant: "Amtrak" },
          ],
          amount: 500,
        },
      };

      render(
        <SnapshotWorkspace
          config={config}
          acquisitionResults={acquisitionResults}
          acquiring={false}
        />
      );

      expect(screen.getByText("Source Timesheets")).toBeInTheDocument();
      expect(screen.getByTestId("expenses-table-section")).toBeInTheDocument();
      expect(screen.getAllByText("USD 4,000.00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("USD 500.00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("USD 4,500.00")).toBeInTheDocument(); // 4000 + 500
    });
  });

  describe("8. Page Reload and Existing Snapshot Reopening with Expenses", () => {
    it("hydrates persisted expenses collection on getBillingSnapshotByPeriod", async () => {
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            snapshotId: 77,
            snapshotNumber: "SNAP-2026-0077",
            projectId: 15,
            billingConfigurationId: 44,
            billingPeriodStart: "2026-06-01",
            billingPeriodEnd: "2026-06-30",
            status: "READY_FOR_TAX",
            timesheets: [
              { id: "T1", employee: "Dev User", hours: 40, rate: 100, amount: 4000, approvalStatus: "Approved" },
            ],
            expenses: [
              {
                sourceReferenceId: "XMS-909",
                expenseDate: "2026-06-15",
                category: "Travel",
                description: "Onsite Visit",
                reportNumber: "EXP-77",
                currency: "USD",
                costBasis: 650.0,
                sourceSystem: "XMS",
              },
            ],
            expenseAmount: 650.0,
            subtotal: 4000.0,
            totalAmount: 4650.0,
          },
        },
      });

      const snapshot = await getBillingSnapshotByPeriod(15, "2026-06-01", "2026-06-30", 44);

      expect(snapshot).not.toBeNull();
      expect(snapshot.snapshotId).toBe(77);
      expect(snapshot.expenseRecords.length).toBe(1);
      expect(snapshot.expenseRecords[0].sourceReferenceId).toBe("XMS-909");
      expect(snapshot.expenseRecords[0].costBasis).toBe(650.0);
      expect(snapshot.expenseAmount).toBe(650.0);
      expect(snapshot.subtotal).toBe(4000.0);
      expect(snapshot.totalAmount).toBe(4650.0);
    });

    it("SnapshotWorkspace displays existingSnapshot expenses when revisiting the page", () => {
      const config = {
        projectName: "Cloud Migration",
        billingType: "TIME_MATERIAL",
        currency: "USD",
        expenseBillingEligible: true,
        billingStatus: "READY_FOR_TAX",
        existingSnapshot: {
          snapshotId: 77,
          timesheets: [
            { id: "T1", employee: "Dev User", hours: 40, rate: 100, amount: 4000, approvalStatus: "Approved" },
          ],
          laborAmount: 4000,
          expenses: [
            {
              id: "XMS-909",
              expenseDate: "2026-06-15",
              category: "Travel",
              description: "Onsite Visit",
              reportNumber: "EXP-77",
              currency: "USD",
              costBasis: 650.0,
              approvalStatus: "Approved",
            },
          ],
          expenseAmount: 650.0,
        },
      };

      // When reloading, acquisitionResults might initially be null until resolved
      render(
        <SnapshotWorkspace
          config={config}
          acquisitionResults={null}
          acquiring={false}
        />
      );

      expect(screen.getByTestId("expenses-table-section")).toBeInTheDocument();
      expect(screen.getByText("EXP-77")).toBeInTheDocument();
      expect(screen.getByText("Onsite Visit")).toBeInTheDocument();
      expect(screen.getAllByText("USD 650.00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("USD 4,650.00")).toBeInTheDocument(); // 4000 + 650
    });
  });

  describe("9. Distinguishing XMS / Network Failures from Empty Data", () => {
    it("displays failure alert and retry button when snapshot acquisition fails", () => {
      const onRetry = vi.fn();
      render(
        <ExpenseDataTable
          isExpenseEligible={true}
          billingStatus="ACQUISITION_FAILED"
          error="XMS service unavailable: HTTP 503 Bad Gateway"
          onRetry={onRetry}
        />
      );

      expect(screen.queryByTestId("expenses-empty-state")).not.toBeInTheDocument();
      expect(screen.queryByText("No Eligible Expenses Found")).not.toBeInTheDocument();
      expect(screen.getByTestId("expenses-failed-state")).toBeInTheDocument();
      expect(screen.getByText("Expense Acquisition Failed")).toBeInTheDocument();
      expect(screen.getByText(/XMS service unavailable/i)).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /retry acquisition/i });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("displays incomplete state when backend omits expense information", () => {
      render(
        <ExpenseDataTable
          isExpenseEligible={true}
          billingStatus="READY_FOR_TAX"
          error="Expense data was not provided in the billing snapshot response."
        />
      );

      expect(screen.queryByTestId("expenses-empty-state")).not.toBeInTheDocument();
      expect(screen.queryByText("No Eligible Expenses Found")).not.toBeInTheDocument();
      expect(screen.getByTestId("expenses-incomplete-state")).toBeInTheDocument();
      expect(screen.getByText("Expense Data Incomplete")).toBeInTheDocument();
    });
  });

  describe("10. Handling XMS Acquisition Failures and Preserving Workspace State", () => {
    it("preserves previously loaded timesheet records when snapshot creation fails due to XMS error", async () => {
      api.post.mockRejectedValueOnce(
        new Error("XMS acquisition failed: expense integration service timed out")
      );

      const context = {
        projectId: 15,
        billingConfigurationId: 44,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
        existingLaborRecords: [
          { id: "TS-PREV-1", employee: "Dev Specialist", hours: 20, rate: 100, amount: 2000, approvalStatus: "Approved" },
        ],
        existingLaborAmount: 2000,
      };

      const results = await acquireBillingData(context, "2026-07-01", "2026-07-31");

      expect(results.success).toBe(false);
      expect(results.billingStatus).toBe("ACQUISITION_FAILED");
      expect(results.message).toContain("XMS acquisition failed");
      // Preserves timesheets from previous workspace state
      expect(results.labor.records.length).toBe(1);
      expect(results.labor.records[0].id).toBe("TS-PREV-1");
      expect(results.labor.amount).toBe(2000);
      expect(results.labor.status).toBe("error");
      // Expense acquisition is explicitly marked as failed, NOT empty
      expect(results.expense.status).toBe("error");
      expect(results.expense.error).toContain("XMS acquisition failed");
      expect(results.expense.status).not.toBe("empty");
    });

    it("does not call speculative endpoint fallbacks when snapshot creation fails", async () => {
      api.post.mockRejectedValueOnce(
        new Error("XMS service unavailable")
      );

      const context = {
        projectId: 22,
        billingConfigurationId: 55,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      await acquireBillingData(context, "2026-07-01", "2026-07-31");

      // Verify only authorized AR POST was attempted, no fallback or direct XMS URLs
      expect(api.post).toHaveBeenCalledTimes(1);
      const postUrl = api.post.mock.calls[0][0];
      expect(postUrl).toContain("/api/v1/billing-snapshots");
      expect(postUrl).not.toContain("/xms");
      // getBillingSnapshotByPeriod should NOT be called after failure to avoid false empty state
      expect(api.get).not.toHaveBeenCalled();
    });

    it("does not produce false success state after a failed snapshot request", async () => {
      api.post.mockRejectedValueOnce(
        new Error("Snapshot creation aborted: XMS acquisition failed")
      );

      const context = {
        projectId: 30,
        billingConfigurationId: 80,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      const results = await acquireBillingData(context, "2026-07-01", "2026-07-31");

      expect(results.success).toBe(false);
      expect(results.snapshotId).toBeUndefined();
      expect(results.billingStatus).toBe("ACQUISITION_FAILED");
      expect(results.expense.status).toBe("error");
      expect(results.expense.error).toBe("Snapshot creation aborted: XMS acquisition failed");
    });

    it("calculates combined totals accurately without double-counting expenses", () => {
      render(
        <CommercialCalculationCard
          laborAmount={4500}
          expenseAmount={750}
          adjustments={0}
          currency="USD"
        />
      );

      // Subtotal should be strictly labor (4500), expenses is 750, Total Amount is 5250
      expect(screen.getByText("USD 4,500.00")).toBeInTheDocument();
      expect(screen.getByText("USD 750.00")).toBeInTheDocument();
      expect(screen.getByText("USD 5,250.00")).toBeInTheDocument();
      // Should not add 750 twice (which would be 6,000.00)
      expect(screen.queryByText("USD 6,000.00")).not.toBeInTheDocument();
    });

    it("Workspace renders error state and retry action while preserving existing timesheets upon failure", () => {
      const onAcquire = vi.fn();
      const config = {
        projectName: "Global Core Platform",
        client: "Enterprise Global",
        billingType: "TIME_MATERIAL",
        currency: "USD",
        expenseBillingEligible: true,
        billingStatus: "ACQUISITION_FAILED",
      };

      const acquisitionResults = {
        labor: {
          applicable: true,
          status: "error",
          records: [
            { id: "T1", employee: "Senior Engineer", hours: 30, rate: 150, amount: 4500, approvalStatus: "Approved" },
          ],
          amount: 4500,
        },
        expense: {
          applicable: true,
          status: "error",
          records: [],
          amount: 0,
          error: "XMS gateway timeout: could not acquire expenses",
        },
        success: false,
        billingStatus: "ACQUISITION_FAILED",
        message: "XMS gateway timeout: could not acquire expenses",
      };

      render(
        <SnapshotWorkspace
          config={config}
          acquisitionResults={acquisitionResults}
          acquiring={false}
          onAcquire={onAcquire}
        />
      );

      // Timesheets remain visible in the workspace table
      expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
      expect(screen.getAllByText("USD 4,500.00").length).toBeGreaterThanOrEqual(1);

      // Expenses section shows failure state with explicit retry option
      expect(screen.getByTestId("expenses-failed-state")).toBeInTheDocument();
      expect(screen.getByText("Expense Acquisition Failed")).toBeInTheDocument();
      expect(screen.getAllByText(/XMS gateway timeout/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByTestId("expenses-empty-state")).not.toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /retry acquisition/i });
      fireEvent.click(retryBtn);
      expect(onAcquire).toHaveBeenCalledTimes(1);
    });
  });

  describe("11. XMS Handed-Off Queue Expenses Integration", () => {
    it("normalizes handed-off expense record preserving lineItemId idempotency key, handoff metadata, and costBasis", () => {
      const rawHandedOff = {
        lineItemId: "XMS-HO-9901",
        reportNumber: "EXP-REP-2026-44",
        employeeId: "EMP-108",
        employeeName: "Alice Cooper",
        expenseDate: "2026-08-14",
        handedOffDate: "2026-08-16",
        handedOffAt: "2026-08-16T10:30:00Z",
        categoryName: "Client Entertainment",
        description: "Dinner with client executive sponsor",
        merchantName: "The Capital Grille",
        costBasis: 320.50,
        grossAmount: 378.19,
        currency: "USD",
        receiptIds: ["rcpt-1", "rcpt-2"],
        handoffStatus: "HANDED_OFF",
        handoffReference: "HO-BATCH-882",
      };

      const normalized = normalizeExpenseRecord(rawHandedOff, "USD", 0);

      expect(normalized.id).toBe("XMS-HO-9901");
      expect(normalized.lineItemId).toBe("XMS-HO-9901");
      expect(normalized.reportNumber).toBe("EXP-REP-2026-44");
      expect(normalized.employee).toBe("Alice Cooper");
      expect(normalized.expenseDate).toBe("2026-08-14");
      expect(normalized.handedOffDate).toBe("2026-08-16");
      expect(normalized.category).toBe("Client Entertainment");
      expect(normalized.merchant).toBe("The Capital Grille");
      expect(normalized.costBasis).toBe(320.50);
      expect(normalized.amount).toBe(320.50);
      expect(normalized.grossAmount).toBe(378.19);
      expect(normalized.receiptCount).toBe(2);
      expect(normalized.isHandedOff).toBe(true);
      expect(normalized.handoffStatus).toBe("HANDED_OFF");
      expect(normalized.handoffReference).toBe("HO-BATCH-882");
      expect(normalized.approvalStatus).toBe("Handed Off");
      expect(normalized.sourceSystem).toBe("XMS");
    });

    it("prevents duplicate-counting in sumCostBasis when duplicate lineItemIds exist", () => {
      const duplicateRecords = [
        { lineItemId: "HO-001", costBasis: 250.00 },
        { lineItemId: "HO-001", costBasis: 250.00 }, // Duplicate of HO-001
        { lineItemId: "HO-002", costBasis: 150.00 },
      ];

      const total = sumCostBasis(duplicateRecords);
      // Must be 250 + 150 = 400.00 (NOT 650.00)
      expect(total).toBe(400.00);
    });

    it("consumes AR backend response containing handedOffExpenses and deduplicates records", async () => {
      const mockSnapshot = {
        snapshotId: 900,
        projectId: 45,
        billingPeriodStart: "2026-08-01",
        billingPeriodEnd: "2026-08-31",
        currency: "USD",
        timesheets: [
          { sourceReferenceId: "TS-1", employee: "Dev Lead", hours: 40, rate: 100, amount: 4000, approvalStatus: "Approved" },
        ],
        handedOffExpenses: [
          { lineItemId: "HO-101", expenseDate: "2026-08-05", costBasis: 300, category: "Lodging", status: "HANDED_OFF" },
          { lineItemId: "HO-101", expenseDate: "2026-08-05", costBasis: 300, category: "Lodging", status: "HANDED_OFF" }, // Duplicated in payload
          { lineItemId: "HO-102", expenseDate: "2026-08-12", costBasis: 200, category: "Airfare", status: "HANDED_OFF" },
        ],
        subtotal: 4000,
        totalAmount: 4500,
      };

      api.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockSnapshot,
        },
      });

      const result = await getBillingSnapshotByPeriod(45, "2026-08-01", "2026-08-31", 101);

      expect(result.success).toBe(true);
      expect(result.expenseRecords.length).toBe(2); // Deduplicated from 3 to 2
      expect(result.expenseAmount).toBe(500); // 300 + 200
      expect(result.expenseRecords[0].lineItemId).toBe("HO-101");
      expect(result.expenseRecords[1].lineItemId).toBe("HO-102");
    });

    it("fetchEligibleExpenses safely processes snapshot with handedOffExpenses field", async () => {
      const mockSnapshot = {
        snapshotId: 901,
        handedOffExpenses: [
          { lineItemId: "HO-201", expenseDate: "2026-08-10", costBasis: 450, categoryName: "Meals" },
        ],
        currency: "USD",
      };

      const result = await fetchEligibleExpenses(50, "2026-08-01", "2026-08-31", 102, mockSnapshot);

      expect(result.status).toBe("success");
      expect(result.count).toBe(1);
      expect(result.amount).toBe(450);
      expect(result.records[0].lineItemId).toBe("HO-201");
    });

    it("does not label handed-off expenses as newly eligible without confirmed business rule", () => {
      const handedOffRecord = {
        lineItemId: "HO-303",
        costBasis: 600,
        isHandedOff: true,
        handoffStatus: "HANDED_OFF",
        handedOffDate: "2026-08-20",
      };

      const normalized = normalizeExpenseRecord(handedOffRecord, "USD", 0);
      expect(normalized.isHandedOff).toBe(true);
      expect(normalized.handoffStatus).toBe("HANDED_OFF");
      expect(normalized.approvalStatus).toBe("Handed Off");
      expect(normalized.approvalStatus).not.toBe("Newly Eligible");
    });
  });

  describe("12. AR-XMS Expense Management Integration Investigation & Snapshot Request Contract", () => {
    it("verifies request correctness: POST /api/v1/billing-snapshots with valid payload contract", async () => {
      api.post.mockResolvedValueOnce({
        data: {
          snapshotId: "SNAP-2026-0099",
          snapshotNumber: "SNAP-2026-0099",
          status: "READY_FOR_TAX",
          timesheets: [
            { id: "T1", employee: "Dev Specialist", hours: 40, rate: 120, amount: 4800, approvalStatus: "Approved" },
          ],
          expenseRecords: [
            { lineItemId: "EXP-801", costBasis: 650.0, categoryName: "Cloud Infrastructure", isHandedOff: true },
          ],
          expenseAmount: 650.0,
        },
      });

      const validUuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
      const result = await createBillingSnapshot(101, "2026-09-01", "2026-09-30", validUuid);

      expect(api.post).toHaveBeenCalledTimes(1);
      const [url, payload] = api.post.mock.calls[0];

      // 1. Endpoint and base URL correctness
      expect(url).toContain("/api/v1/billing-snapshots");
      expect(url).not.toContain("/xms"); // Frontend must never call XMS directly

      // 2. Payload contract verification
      expect(payload.projectId).toBe(101);
      expect(typeof payload.projectId).toBe("number");
      expect(payload.billingConfigurationId).toBe(validUuid);
      expect(payload.billingPeriodStart).toBe("2026-09-01");
      expect(payload.billingPeriodEnd).toBe("2026-09-30");

      expect(result.snapshotNumber).toBe("SNAP-2026-0099");
      expect(result.status).toBe("READY_FOR_TAX");
    });

    it("sanitizes non-UUID billingConfigurationId to null so Spring Jackson deserialization succeeds", async () => {
      api.post.mockResolvedValueOnce({
        data: {
          snapshotId: "SNAP-2026-0100",
          status: "READY",
          timesheets: [],
          existingSnapshot: true,
        },
      });

      // Pass non-UUID numeric or mock string ID
      await createBillingSnapshot(105, "2026-09-01", "2026-09-30", "config-123");

      const [, payload] = api.post.mock.calls[0];
      expect(payload.billingConfigurationId).toBeNull();
    });

    it("handles HTTP 400 Bad Request with a safe backend validation error message and sets ACQUISITION_FAILED", async () => {
      const backendValidationError = {
        response: {
          status: 400,
          data: {
            success: false,
            message: "XMS returned 3 expense(s) for the period, but none matched project 101 or were eligible for billing; snapshot was not created.",
            data: null,
          },
        },
      };

      api.post.mockRejectedValueOnce(backendValidationError);

      const context = {
        projectId: 101,
        billingConfigurationId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      const results = await acquireBillingData(context, "2026-09-01", "2026-09-30");

      // Verify failure state is set consistently and correctly
      expect(results.success).toBe(false);
      expect(results.billingStatus).toBe("ACQUISITION_FAILED");
      expect(results.snapshotId).toBeUndefined();

      // Backend error message must be preserved and surfaced to the UI
      expect(results.message).toBe(
        "XMS returned 3 expense(s) for the period, but none matched project 101 or were eligible for billing; snapshot was not created."
      );
      expect(results.labor.status).toBe("error");
      expect(results.labor.error).toBe(results.message);
      expect(results.expense.status).toBe("error");
      expect(results.expense.error).toBe(results.message);
    });

    it("sanitizes unsafe error content (stack trace, internal localhost URL, credentials) without leaking server internals", () => {
      const unsafeErrorWithStackTrace = {
        response: {
          status: 400,
          data: {
            message: "java.lang.NullPointerException at com.paves.BillingService.createSnapshot(BillingService.java:182)",
          },
        },
      };

      const safeMsg = getSafeBackendErrorMessage(unsafeErrorWithStackTrace);
      expect(safeMsg).not.toContain("java.lang");
      expect(safeMsg).not.toContain("BillingService.java");
      expect(safeMsg).toBe("Billing snapshot creation could not be completed. Please review project billing parameters and try again.");

      const unsafeErrorWithUrlAndToken = {
        response: {
          status: 400,
          data: {
            message: "Connection failed to http://localhost:8080/xms/internal with bearer eyJhbGciOi...",
          },
        },
      };

      const safeUrlMsg = getSafeBackendErrorMessage(unsafeErrorWithUrlAndToken);
      expect(safeUrlMsg).not.toContain("localhost");
      expect(safeUrlMsg).not.toContain("bearer");
      expect(safeUrlMsg).toBe("Billing snapshot creation could not be completed. Please review project billing parameters and try again.");
    });

    it("handles HTTP 503 Service Unavailable with a useful fallback message", async () => {
      const server503Error = {
        response: {
          status: 503,
          data: null,
        },
      };

      api.post.mockRejectedValueOnce(server503Error);

      const context = {
        projectId: 202,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      const results = await acquireBillingData(context, "2026-09-01", "2026-09-30");

      expect(results.success).toBe(false);
      expect(results.billingStatus).toBe("ACQUISITION_FAILED");
      expect(results.message).toBe("The billing acquisition service is temporarily unavailable. Please try again later.");
      expect(results.expense.status).toBe("error");
      expect(results.expense.error).toBe("The billing acquisition service is temporarily unavailable. Please try again later.");
    });

    it("handles Retry Acquisition failure and subsequent success accurately", async () => {
      // 1st attempt: fails with 400 validation error
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            success: false,
            message: "Cannot create snapshot: duplicate billing detected for expense EXP-1003.",
          },
        },
      });

      const context = {
        projectId: 303,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      const failedResult = await acquireBillingData(context, "2026-09-01", "2026-09-30");
      expect(failedResult.success).toBe(false);
      expect(failedResult.billingStatus).toBe("ACQUISITION_FAILED");
      expect(failedResult.message).toContain("duplicate billing detected");

      // 2nd attempt (Retry): succeeds after issue resolved on backend
      api.post.mockResolvedValueOnce({
        data: {
          snapshotId: "SNAP-RETRY-SUCCESS",
          snapshotNumber: "SNAP-RETRY-SUCCESS",
          status: "READY_FOR_TAX",
          timesheets: [
            { id: "T1", employee: "Dev Specialist", hours: 10, rate: 100, amount: 1000, approvalStatus: "Approved" },
          ],
          expenseRecords: [
            { lineItemId: "EXP-1004", costBasis: 250, categoryName: "Supplies" },
          ],
          expenseAmount: 250,
        },
      });

      const successResult = await acquireBillingData(context, "2026-09-01", "2026-09-30");
      expect(successResult.success).toBe(true);
      expect(successResult.snapshotId).toBe("SNAP-RETRY-SUCCESS");
      expect(successResult.billingStatus).toBe("READY_FOR_TAX");
      expect(successResult.labor.amount).toBe(1000);
      expect(successResult.expense.amount).toBe(250);
      expect(successResult.totalAmount).toBe(1250);
    });

    it("prevents unsafe acquisition attempt when authoritative PMS project mapping is missing or invalid", async () => {
      const contextMissingPms = {
        projectId: 101,
        pmsProjectId: null,
        hasPmsProjectMapping: false,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
        existingLaborRecords: [{ id: "TS-1", employee: "Dev Specialist", hours: 10, rate: 100, amount: 1000, approvalStatus: "Approved" }],
        existingLaborAmount: 1000,
      };

      const result = await acquireBillingData(contextMissingPms, "2026-09-01", "2026-09-30");

      expect(result.success).toBe(false);
      expect(result.billingStatus).toBe("ACQUISITION_FAILED");
      expect(result.message).toContain("PMS project mapping");
      // Must NOT have dispatched unsafe POST /api/v1/billing-snapshots
      expect(api.post).not.toHaveBeenCalled();
      // Must preserve existing labor records in partial-result state
      expect(result.labor.records.length).toBe(1);
      expect(result.labor.amount).toBe(1000);
      expect(result.expense.status).toBe("error");
    });

    it("displays meaningful backend errors for currency mismatch or missing approved exchange rate", async () => {
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            success: false,
            message: "Currency mismatch: expense currency EUR does not match billing currency USD, and no approved exchange rate exists for the billing period.",
          },
        },
      });

      const context = {
        projectId: 102,
        pmsProjectId: 550,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      const result = await acquireBillingData(context, "2026-09-01", "2026-09-30");

      expect(result.success).toBe(false);
      expect(result.billingStatus).toBe("ACQUISITION_FAILED");
      expect(result.message).toContain("Currency mismatch: expense currency EUR does not match billing currency USD");
      expect(result.expense.status).toBe("error");
      expect(result.expense.error).toContain("Currency mismatch");
    });

    it("safely surfaces XMS authorization and service-unavailable errors without exposing raw JWTs or credentials", async () => {
      api.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            message: "XMS authorization failure with bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz while accessing handoff queue",
          },
        },
      });

      const context = {
        projectId: 103,
        pmsProjectId: 551,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      const result = await acquireBillingData(context, "2026-09-01", "2026-09-30");

      expect(result.success).toBe(false);
      expect(result.billingStatus).toBe("ACQUISITION_FAILED");
      // Raw JWT must be redacted/stripped
      expect(result.message).not.toContain("eyJhbGciOi");
      expect(result.message).toContain("XMS authorization failure");

      // Test 504 Gateway / Service timeout
      api.post.mockRejectedValueOnce({
        response: {
          status: 504,
          data: null,
        },
      });

      const resultTimeout = await acquireBillingData(context, "2026-09-01", "2026-09-30");
      expect(resultTimeout.success).toBe(false);
      expect(resultTimeout.message).toContain("timed out");
    });

    it("preserves successfully acquired labor data when expense acquisition fails in partial-result workflow", async () => {
      // Primary snapshot call succeeds with labor items
      api.post.mockResolvedValueOnce({
        data: {
          snapshotId: "SNAP-LABOR-SUCCESS",
          snapshotNumber: "SNAP-LABOR-SUCCESS",
          status: "READY_FOR_TAX",
          timesheets: [
            { id: "T-LABOR-1", employee: "Alice", hours: 25, rate: 150, amount: 3750, approvalStatus: "Approved" },
          ],
          laborAmount: 3750,
        },
      });

      // Subsequent expense acquisition check from AR backend reports error
      api.get.mockRejectedValueOnce({
        response: {
          status: 503,
          data: { message: "Expense service unavailable: XMS connection dropped" },
        },
      });

      const context = {
        projectId: 104,
        pmsProjectId: 552,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      const result = await acquireBillingData(context, "2026-09-01", "2026-09-30");

      // Primary acquisition succeeded for labor
      expect(result.success).toBe(true);
      expect(result.labor.status).toBe("success");
      expect(result.labor.amount).toBe(3750);
      expect(result.labor.records.length).toBe(1);
      // Expense acquisition is flagged with error without erasing labor
      expect(result.expense.status).toBe("error");
      expect(result.expense.error).toContain("Expense service unavailable");
      // Subtotal matches labor
      expect(result.subtotal).toBe(3750);
    });

    it("displays billed vs original amounts and optional Fx conversion and correction metadata in ExpenseDataTable", () => {
      const recordsWithMetadata = [
        normalizeExpenseRecord({
          lineItemId: "EXP-CONV-1",
          syncId: "SYNC-101",
          expenseDate: "2026-09-12",
          reportNumber: "EXP-RPT-001",
          category: "International Travel",
          description: "Client on-site flight",
          costBasis: 1200.0, // Authoritative billable amount
          currency: "USD",
          originalAmount: 1100.0,
          originalCurrency: "EUR",
          conversionApplied: true,
          exchangeRate: 1.0909,
          exchangeRateDate: "2026-09-12",
          exchangeRateSource: "ECB Official",
          sourceAmount: 1100.0,
          sourceCurrency: "EUR",
          receiptCount: 2,
        }),
        normalizeExpenseRecord({
          lineItemId: "EXP-CORR-2",
          syncId: "SYNC-102",
          expenseDate: "2026-09-15",
          reportNumber: "EXP-RPT-002",
          category: "Supplies",
          description: "Office equipment",
          costBasis: 350.0,
          currency: "USD",
          supersededSyncIds: ["SYNC-100"],
          handoffRemarks: "Adjusted tax recoverable amount per revised invoice",
          conversionApplied: false,
          receiptCount: 1,
        }),
      ];

      render(
        <ExpenseDataTable
          records={recordsWithMetadata}
          amount={1550.0}
          currency="USD"
          billingStatus="READY_FOR_TAX"
          isExpenseEligible={true}
        />
      );

      // Verify authoritative billable amounts are displayed
      expect(screen.getByText(/1,200\.00/)).toBeInTheDocument();
      expect(screen.getByText(/350\.00/)).toBeInTheDocument();

      // Verify original employee-paid amounts are clearly distinguished
      expect(screen.getByText(/Orig: EUR 1,100\.00/)).toBeInTheDocument();

      // Verify exchange rate metadata displayed only when conversionApplied is true
      expect(screen.getByText(/Fx: 1\.0909/)).toBeInTheDocument();
      expect(screen.getByText(/ECB Official/)).toBeInTheDocument();

      // Verify correction remarks and superseded syncIds
      expect(screen.getByText(/Adjusted tax recoverable amount per revised invoice/)).toBeInTheDocument();
      expect(screen.getByText(/Superseded: SYNC-100/)).toBeInTheDocument();

      // Verify syncId and lineItemId are distinctly surfaced
      expect(screen.getByText("Sync: SYNC-101")).toBeInTheDocument();
      expect(screen.getByText("Line: EXP-CONV-1")).toBeInTheDocument();

      // Verify status badge
      expect(screen.getByText("Corrected")).toBeInTheDocument();
    });

    it("handles deduplicateExpenseRecords for presentation safety without modifying totals", () => {
      const rawRecords = [
        {
          lineItemId: "EXP-REPEAT-1",
          costBasis: 500,
          syncId: "SYNC-BATCH-002",
          supersededSyncIds: ["SYNC-BATCH-001"],
          handoffRemarks: "Updated category allocation per backend selection",
        },
        {
          lineItemId: "EXP-REPEAT-1",
          costBasis: 500,
          syncId: "SYNC-BATCH-002",
          supersededSyncIds: ["SYNC-BATCH-001"],
          handoffRemarks: "Updated category allocation per backend selection",
        },
        {
          lineItemId: "EXP-NEW-2",
          costBasis: 200,
          syncId: "SYNC-BATCH-002",
        },
      ];

      const deduplicated = deduplicateExpenseRecords(rawRecords);

      expect(deduplicated.length).toBe(2); // EXP-REPEAT-1 and EXP-NEW-2
      const repeatRecord = deduplicated.find((r) => r.lineItemId === "EXP-REPEAT-1");
      expect(repeatRecord.syncId).toBe("SYNC-BATCH-002");
      expect(repeatRecord.supersededSyncIds).toEqual(["SYNC-BATCH-001"]);
      expect(repeatRecord.handoffRemarks).toBe("Updated category allocation per backend selection");

      // sumCostBasis must not double-count
      const total = sumCostBasis(deduplicated);
      expect(total).toBe(700); // 500 + 200
    });

    it("preserves labor acquisition without requiring pmsProjectId when expenseBillingEligible is false", async () => {
      api.post.mockResolvedValueOnce({
        data: {
          snapshotId: "SNAP-LABOR-ONLY",
          status: "READY_FOR_TAX",
          timesheets: [
            { id: "T1", employee: "Bob", hours: 10, rate: 100, amount: 1000, approvalStatus: "Approved" },
          ],
          laborAmount: 1000,
          expenses: [],
          expenseAmount: 0,
        },
      });

      const contextLaborOnly = {
        projectId: 999,
        pmsProjectId: null, // missing PMS project id
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: false, // expenses disabled
      };

      const result = await acquireBillingData(contextLaborOnly, "2026-09-01", "2026-09-30");

      expect(result.success).toBe(true);
      expect(result.labor.status).toBe("success");
      expect(result.labor.amount).toBe(1000);
      expect(result.expense.applicable).toBe(false);
      expect(api.post).toHaveBeenCalled();
    });

    it("surfaces backend rejection of ambiguous or conflicting corrections safely", async () => {
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: "Validation failed for lineItemId=EXP-AMB-1: its latest handoff events share the same handedOffAt, so the correction order is ambiguous.",
          },
        },
      });

      const context = {
        projectId: 105,
        pmsProjectId: 555,
        billingType: "TIME_MATERIAL",
        expenseBillingEligible: true,
      };

      const result = await acquireBillingData(context, "2026-09-01", "2026-09-30");

      expect(result.success).toBe(false);
      expect(result.billingStatus).toBe("ACQUISITION_FAILED");
      expect(result.message).toContain("Validation failed for lineItemId=EXP-AMB-1");
      expect(result.message).toContain("correction order is ambiguous");
    });
  });

  describe("13. Currency Conversion Error Handling and UI Safety", () => {
    it("1. handles INR expense with USD billing and missing FX policy error accurately", async () => {
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            success: false,
            message: "Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale, ar.expense-fx.rounding-mode, ar.expense-fx.rate-date-basis",
          },
        },
      });

      const context = {
        projectId: 37,
        billingConfigurationId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        billingType: "TIME_MATERIAL",
        currency: "USD",
        expenseBillingEligible: true,
      };

      const results = await acquireBillingData(context, "2026-09-01", "2026-09-30");

      expect(results.success).toBe(false);
      expect(results.billingStatus).toBe("ACQUISITION_FAILED");
      expect(results.isFxPolicyError).toBe(true);
      expect(results.message).toContain("ar.expense-fx.scale");
      expect(results.message).toContain("ar.expense-fx.rounding-mode");
      expect(results.message).toContain("ar.expense-fx.rate-date-basis");
      expect(results.expense.status).toBe("error");
      expect(results.expense.error).toContain("Currency-conversion policy");
      expect(results.expense.records).toEqual([]);
      expect(results.expense.amount).toBe(0);
    });

    it("2. safely preserves actionable FX error details while sanitizing stack traces and credentials", () => {
      // Clean backend error with settings
      const cleanError = {
        response: {
          status: 400,
          data: {
            message: "Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale, ar.expense-fx.rounding-mode, ar.expense-fx.rate-date-basis",
          },
        },
      };
      const safeClean = getSafeBackendErrorMessage(cleanError);
      expect(safeClean).toBe("Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale, ar.expense-fx.rounding-mode, ar.expense-fx.rate-date-basis");

      // Wrapped in Spring ResponseStatusException
      const wrappedError = {
        response: {
          status: 400,
          data: {
            message: 'org.springframework.web.server.ResponseStatusException: 400 BAD_REQUEST "Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale, ar.expense-fx.rounding-mode, ar.expense-fx.rate-date-basis"',
          },
        },
      };
      const safeWrapped = getSafeBackendErrorMessage(wrappedError);
      expect(safeWrapped).toContain("ar.expense-fx.scale");
      expect(safeWrapped).not.toContain("ResponseStatusException");

      // Structured error DTO
      const structuredError = {
        response: {
          status: 400,
          data: {
            errorCode: "FX_POLICY_NOT_CONFIGURED",
            message: "Currency-conversion policy has not been approved/configured.",
            missingSettings: ["ar.expense-fx.scale", "ar.expense-fx.rounding-mode", "ar.expense-fx.rate-date-basis"],
          },
        },
      };
      const safeStructured = getSafeBackendErrorMessage(structuredError);
      expect(safeStructured).toContain("ar.expense-fx.scale");
      expect(safeStructured).toContain("ar.expense-fx.rounding-mode");

      // Real stack trace with credentials must still be sanitized
      const unsafeError = {
        response: {
          status: 400,
          data: {
            message: "Exception at com.ar.fx.CurrencyConverter.convert(CurrencyConverter.java:45) with jdbc:postgresql://db:5432/ar",
          },
        },
      };
      const sanitized = getSafeBackendErrorMessage(unsafeError);
      expect(sanitized).toBe("Billing snapshot creation could not be completed. Please review project billing parameters and try again.");
    });

    it("3. classifies FX error as Currency Conversion Policy Required rather than incomplete expense data", () => {
      const fxErrorMessage = "Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale, ar.expense-fx.rounding-mode, ar.expense-fx.rate-date-basis";

      render(
        <ExpenseDataTable
          records={[]}
          amount={0}
          currency="USD"
          billingStatus="ACQUISITION_FAILED"
          isExpenseEligible={true}
          error={fxErrorMessage}
          onRetry={vi.fn()}
        />
      );

      // Must NOT render as incomplete source data
      expect(screen.queryByTestId("expenses-incomplete-state")).not.toBeInTheDocument();
      expect(screen.queryByText("Expense Data Incomplete")).not.toBeInTheDocument();

      // Must render as FX policy required
      expect(screen.getByTestId("expenses-fx-error-state")).toBeInTheDocument();
      expect(screen.getByText("Currency Conversion Policy Required")).toBeInTheDocument();
      expect(screen.getByText("Configuration Required")).toBeInTheDocument();
      expect(screen.getByText(/Missing backend settings: ar\.expense-fx\.scale/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry Acquisition/i })).toBeInTheDocument();
    });

    it("4. never displays an unconverted source amount (INR) as target currency (USD)", () => {
      const unconvertedRaw = {
        lineItemId: "EXP-UNCONV-1",
        costBasis: 50000.0,
        currency: null,
        sourceAmount: 50000.0,
        sourceCurrency: "INR",
        originalAmount: 50000.0,
        originalCurrency: "INR",
        conversionApplied: false,
      };

      const normalized = normalizeExpenseRecord(unconvertedRaw, "USD", 0);

      // Must flag conversion as missing and preserve INR currency
      expect(normalized.isConversionMissing).toBe(true);
      expect(normalized.currency).toBe("INR");
      expect(normalized.sourceCurrency).toBe("INR");

      // sumCostBasis must NOT add unconverted amounts to USD total
      expect(sumCostBasis([normalized])).toBe(0);

      render(
        <ExpenseDataTable
          records={[normalized]}
          amount={0}
          currency="USD"
          billingStatus="READY_FOR_TAX"
          isExpenseEligible={true}
        />
      );

      // Must NOT render as USD 50,000.00
      expect(screen.queryByText(/USD 50,000/i)).not.toBeInTheDocument();
      // Must render source currency INR and unconverted badge
      expect(screen.getAllByText(/INR 50,000\.00/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/\(Unconverted • INR → USD\)/i)).toBeInTheDocument();
    });

    it("5. correctly displays successfully converted persisted amounts with full FX metadata", () => {
      const convertedRaw = {
        lineItemId: "EXP-CONV-OK",
        costBasis: 598.80, // Post-conversion authoritative amount in USD
        currency: "USD",
        sourceAmount: 50000.0,
        sourceCurrency: "INR",
        originalAmount: 50000.0,
        originalCurrency: "INR",
        conversionApplied: true,
        exchangeRate: 0.011976,
        exchangeRateDate: "2026-09-01",
        exchangeRateSource: "RBI Official",
      };

      const normalized = normalizeExpenseRecord(convertedRaw, "USD", 0);

      expect(normalized.isConversionMissing).toBe(false);
      expect(normalized.currency).toBe("USD");
      expect(normalized.costBasis).toBe(598.80);
      expect(sumCostBasis([normalized])).toBe(598.80);

      render(
        <ExpenseDataTable
          records={[normalized]}
          amount={598.80}
          currency="USD"
          billingStatus="READY_FOR_TAX"
          isExpenseEligible={true}
        />
      );

      // Billable amount rendered in USD
      expect(screen.getAllByText(/USD 598\.80/i).length).toBeGreaterThanOrEqual(1);
      // Audit original amount rendered in INR
      expect(screen.getByText(/Orig: INR 50,000\.00/i)).toBeInTheDocument();
      // FX rate and authority source rendered
      expect(screen.getByText(/Fx: 0\.011976/i)).toBeInTheDocument();
      expect(screen.getByText(/RBI Official/i)).toBeInTheDocument();
    });

    it("6. renders same-currency expenses cleanly without conversion warnings or FX tags", () => {
      const sameCurrencyRaw = {
        lineItemId: "EXP-SAME-1",
        costBasis: 250.0,
        currency: "USD",
        sourceAmount: 250.0,
        sourceCurrency: "USD",
        conversionApplied: false,
      };

      const normalized = normalizeExpenseRecord(sameCurrencyRaw, "USD", 0);
      expect(normalized.isConversionMissing).toBe(false);
      expect(normalized.currency).toBe("USD");
      expect(sumCostBasis([normalized])).toBe(250.0);

      render(
        <ExpenseDataTable
          records={[normalized]}
          amount={250.0}
          currency="USD"
          billingStatus="READY_FOR_TAX"
          isExpenseEligible={true}
        />
      );

      expect(screen.getAllByText(/USD 250\.00/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/Unconverted/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Fx:/i)).not.toBeInTheDocument();
    });

    it("7. keeps expense conversion failures separate from labor/timesheet error status", async () => {
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: "Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale, ar.expense-fx.rounding-mode, ar.expense-fx.rate-date-basis",
          },
        },
      });

      const contextWithTimesheets = {
        projectId: 37,
        billingType: "TIME_MATERIAL",
        currency: "USD",
        expenseBillingEligible: true,
        existingLaborRecords: [
          { id: "TS-101", employee: "Senior Engineer", hours: 40, rate: 100, amount: 4000, approvalStatus: "Approved" },
        ],
        existingLaborAmount: 4000,
      };

      const result = await acquireBillingData(contextWithTimesheets, "2026-09-01", "2026-09-30");

      expect(result.success).toBe(false);
      expect(result.billingStatus).toBe("ACQUISITION_FAILED");
      // Labor must NOT be marked with an error
      expect(result.labor.status).toBe("unpersisted");
      expect(result.labor.error).toBeNull();
      expect(result.labor.records.length).toBe(1);
      expect(result.labor.amount).toBe(4000);

      // Expense must bear the error
      expect(result.expense.status).toBe("error");
      expect(result.expense.error).toContain("Currency-conversion policy");
    });

    it("8. prevents stale or failed expense amounts from contributing to commercial totals", async () => {
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: "Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale",
          },
        },
      });

      const contextWithStaleExpenses = {
        projectId: 37,
        billingType: "TIME_MATERIAL",
        currency: "USD",
        expenseBillingEligible: true,
        existingExpenseRecords: [{ lineItemId: "EXP-STALE", costBasis: 99999 }],
        existingExpenseAmount: 99999,
        existingLaborRecords: [{ id: "TS-1", hours: 10, rate: 100, amount: 1000 }],
        existingLaborAmount: 1000,
      };

      const result = await acquireBillingData(contextWithStaleExpenses, "2026-09-01", "2026-09-30");

      // Expense amounts must be zeroed out
      expect(result.expense.amount).toBe(0);
      expect(result.expense.records).toEqual([]);
      expect(result.expenseAmount).toBe(0);
      // Commercial total must only reflect labor (not stale 99999)
      expect(result.totalAmount).toBe(1000);
      expect(result.subtotal).toBe(1000);
    });

    it("9. supports seamless retry after backend currency-conversion policy is configured", async () => {
      // Attempt 1: Rejection due to missing FX policy
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: "Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale" },
        },
      });

      const context = {
        projectId: 37,
        billingType: "TIME_MATERIAL",
        currency: "USD",
        expenseBillingEligible: true,
      };

      const failedResult = await acquireBillingData(context, "2026-09-01", "2026-09-30");
      expect(failedResult.success).toBe(false);
      expect(failedResult.billingStatus).toBe("ACQUISITION_FAILED");

      // Attempt 2 (Retry): Backend policy configured, snapshot succeeds
      api.post.mockResolvedValueOnce({
        data: {
          snapshotId: "SNAP-FX-SUCCESS-37",
          snapshotNumber: "SNAP-FX-SUCCESS-37",
          status: "READY_FOR_TAX",
          timesheets: [{ id: "T1", employee: "Dev Lead", hours: 20, rate: 100, amount: 2000, approvalStatus: "Approved" }],
          expenseRecords: [
            {
              lineItemId: "EXP-CONV-37",
              costBasis: 350.0,
              currency: "USD",
              sourceAmount: 29000.0,
              sourceCurrency: "INR",
              conversionApplied: true,
              exchangeRate: 0.012068,
              exchangeRateSource: "RBI",
            },
          ],
          expenseAmount: 350.0,
          laborAmount: 2000.0,
        },
      });

      const successResult = await acquireBillingData(context, "2026-09-01", "2026-09-30");
      expect(successResult.success).toBe(true);
      expect(successResult.snapshotId).toBe("SNAP-FX-SUCCESS-37");
      expect(successResult.billingStatus).toBe("READY_FOR_TAX");
      expect(successResult.expense.amount).toBe(350.0);
      expect(successResult.totalAmount).toBe(2350.0);
    });

    it("10. safely handles legacy snapshots missing conversion metadata without crashes or NaN", () => {
      const legacyRaw = {
        lineItemId: "EXP-LEGACY-01",
        costBasis: 750.0,
        // No conversionApplied, no exchangeRate, no originalCurrency
        currency: "USD",
      };

      const normalized = normalizeExpenseRecord(legacyRaw, "USD", 0);

      expect(normalized.isConversionMissing).toBe(false);
      expect(normalized.currency).toBe("USD");
      expect(normalized.costBasis).toBe(750.0);
      expect(normalized.exchangeRate).toBeNull();

      render(
        <ExpenseDataTable
          records={[normalized]}
          amount={750.0}
          currency="USD"
          billingStatus="READY_FOR_TAX"
          isExpenseEligible={true}
        />
      );

      expect(screen.getAllByText(/USD 750\.00/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
    });

    it("11. keeps snapshotId null on failed acquisition, blocking downstream tax and invoice navigation", async () => {
      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: "Currency-conversion policy has not been approved/configured. Missing backend settings: ar.expense-fx.scale" },
        },
      });

      const context = {
        projectId: 37,
        billingType: "TIME_MATERIAL",
        currency: "USD",
        expenseBillingEligible: true,
      };

      const result = await acquireBillingData(context, "2026-09-01", "2026-09-30");
      expect(result.snapshotId).toBeUndefined();
      expect(result.snapshotNumber).toBeUndefined();
    });

    it("12. preserves existing XMS correction metadata and superseded-event display intact", () => {
      const correctionRecord = normalizeExpenseRecord(
        {
          lineItemId: "EXP-CORR-V2",
          costBasis: 420.0,
          currency: "USD",
          conversionApplied: false,
          isCorrection: true,
          supersededSyncIds: ["SYNC-OLD-1", "SYNC-OLD-2"],
          handoffRemarks: "Tax recovery adjustment applied by accounting lead",
        },
        "USD",
        0
      );

      expect(correctionRecord.isCorrection).toBe(true);
      expect(correctionRecord.supersededSyncIds).toEqual(["SYNC-OLD-1", "SYNC-OLD-2"]);

      render(
        <ExpenseDataTable
          records={[correctionRecord]}
          amount={420.0}
          currency="USD"
          billingStatus="READY_FOR_TAX"
          isExpenseEligible={true}
        />
      );

      expect(screen.getByText("Corrected")).toBeInTheDocument();
      expect(screen.getByText(/Tax recovery adjustment applied by accounting lead/i)).toBeInTheDocument();
      expect(screen.getByText(/Superseded: SYNC-OLD-1, SYNC-OLD-2/i)).toBeInTheDocument();
    });
  });
});



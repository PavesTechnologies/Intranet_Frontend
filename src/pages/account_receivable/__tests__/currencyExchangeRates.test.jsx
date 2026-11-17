import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import CurrencyExchangeRateMasterPage from "../pages/master-data/CurrencyExchangeRateMasterPage";
import {
  getExchangeRates,
  createDailyRatesBatch,
  createExchangeRate,
  normalizeExchangeRate,
  isMissingEndpointError,
} from "../services/currencyExchangeRateService";
import api from "../../../api/axiosInstance";

vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../../components/toastfy/toast", () => ({
  showStatusToast: vi.fn(),
}));

const mockCurrencies = [
  { currencyId: "c1", currencyCode: "USD", currencyName: "US Dollar", isActive: true },
  { currencyId: "c2", currencyCode: "INR", currencyName: "Indian Rupee", isActive: true },
  { currencyId: "c3", currencyCode: "EUR", currencyName: "Euro", isActive: true },
  { currencyId: "c4", currencyCode: "GBP", currencyName: "British Pound", isActive: true },
  { currencyId: "c5", currencyCode: "AUD", currencyName: "Australian Dollar", isActive: true },
  { currencyId: "c6", currencyCode: "CAD", currencyName: "Canadian Dollar", isActive: true },
  { currencyId: "c7", currencyCode: "SGD", currencyName: "Singapore Dollar", isActive: true },
];

const mockRates = [
  {
    id: "rate-001",
    sourceCurrency: "INR",
    targetCurrency: "USD",
    exchangeRate: 0.011976,
    rate: 0.011976,
    effectiveDate: "2026-09-01",
    rateSource: "RBI Official",
    status: "ACTIVE",
    isActive: true,
    approvedBy: "finance.approver",
    notes: "Official RBI benchmark rate for September 2026",
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-01T08:00:00Z",
  },
  {
    id: "rate-002",
    sourceCurrency: "EUR",
    targetCurrency: "USD",
    exchangeRate: 1.085,
    rate: 1.085,
    effectiveDate: "2026-09-01",
    rateSource: "European Central Bank (ECB)",
    status: "ACTIVE",
    isActive: true,
    approvedBy: "finance.approver",
    notes: "ECB reference rate",
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-01T08:00:00Z",
  },
  {
    id: "rate-003",
    sourceCurrency: "GBP",
    targetCurrency: "USD",
    exchangeRate: 1.28,
    rate: 1.28,
    effectiveDate: "2026-08-01",
    rateSource: "Bank of England",
    status: "INACTIVE",
    isActive: false,
    approvedBy: "finance.approver",
    notes: "Expired rate",
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
  },
];

const setupApiMock = (rates = mockRates) => {
  api.get.mockImplementation((url) => {
    if (url.includes("/api/currency")) {
      return Promise.resolve({ data: mockCurrencies });
    }
    return Promise.resolve({ data: { success: true, data: rates } });
  });
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <CurrencyExchangeRateMasterPage />
    </BrowserRouter>
  );
};

describe("Currency Exchange Rate Management — Service Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. normalizes exchange rate DTOs correctly", () => {
    const raw = {
      exchangeRateId: "fx-999",
      fromCurrency: "inr",
      toCurrency: "usd",
      rate: "0.01205",
      rateDate: "2026-10-01",
      source: "RBI Benchmark",
      status: "APPROVED",
      notes: "Audited rate",
    };

    const normalized = normalizeExchangeRate(raw);
    expect(normalized.id).toBe("fx-999");
    expect(normalized.sourceCurrency).toBe("INR");
    expect(normalized.targetCurrency).toBe("USD");
    expect(normalized.exchangeRate).toBe(0.01205);
    expect(normalized.effectiveDate).toBe("2026-10-01");
    expect(normalized.rateSource).toBe("RBI Benchmark");
    expect(normalized.status).toBe("APPROVED");
    expect(normalized.isActive).toBe(true);
  });

  it("2. sends batch exchange rates payload to POST /api/v1/exchange-rates/batch", async () => {
    const batchPayload = {
      sourceCurrency: "INR",
      effectiveDate: "2026-10-13",
      rateSource: "MANUAL",
      rates: [
        { targetCurrency: "USD", exchangeRate: 0.0125 },
        { targetCurrency: "EUR", exchangeRate: 0.0115 },
      ],
    };

    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { id: "r1", sourceCurrency: "INR", targetCurrency: "USD", exchangeRate: 0.0125, effectiveDate: "2026-10-13" },
          { id: "r2", sourceCurrency: "INR", targetCurrency: "EUR", exchangeRate: 0.0115, effectiveDate: "2026-10-13" },
        ],
      },
    });

    const result = await createDailyRatesBatch(batchPayload);
    expect(api.post).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/exchange-rates/batch"),
      batchPayload
    );
    expect(result).toHaveLength(2);
    expect(result[0].targetCurrency).toBe("USD");
    expect(result[1].targetCurrency).toBe("EUR");
  });
});

describe("Maintain Daily Currency Rates — Batch Workflow & UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMock(mockRates);
  });

  it("3. removes KPI cards completely and keeps page focused on rate register", async () => {
    renderComponent();

    expect(await screen.findByText("Currency Exchange Rates")).toBeInTheDocument();
    expect(screen.queryByText("Total Exchange Rates")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Rates")).not.toBeInTheDocument();
    expect(screen.queryByText("Inactive / Pending")).not.toBeInTheDocument();
  });

  it("4. renders register table with all required columns and historical records", async () => {
    renderComponent();

    expect(await screen.findByText("Exchange Rate Register")).toBeInTheDocument();

    expect(screen.getByText("Source Currency")).toBeInTheDocument();
    expect(screen.getByText("Target Currency")).toBeInTheDocument();
    expect(screen.getByText("Exchange Rate")).toBeInTheDocument();
    expect(screen.getByText("Effective Date")).toBeInTheDocument();
    expect(screen.getByText("Rate Source")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Last Updated")).toBeInTheDocument();

    expect(screen.getAllByText("INR").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("USD").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0.011976")).toBeInTheDocument();
    expect(screen.getByText("RBI Official")).toBeInTheDocument();
  });

  it("5. opens Maintain Daily Currency Rates modal with default INR base and today's date", async () => {
    renderComponent();

    const maintainBtn = await screen.findByTestId("maintain-daily-rates-btn");
    fireEvent.click(maintainBtn);

    expect(screen.getByText("Maintain Daily Currency Rates")).toBeInTheDocument();

    // Base currency defaults to INR
    const baseSelect = screen.getByLabelText("Base Currency");
    expect(baseSelect.value).toBe("INR");

    // Effective date defaults to today
    const today = new Date();
    const expectedTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const dateInput = screen.getByLabelText(/Effective Date \*/i);
    expect(dateInput.value).toBe(expectedTodayStr);

    // Initial rows for supported currencies (USD, EUR, GBP, AUD, CAD, SGD)
    expect(screen.getByLabelText("Target Currency Row 1").value).toBe("USD");
    expect(screen.getByLabelText("Target Currency Row 2").value).toBe("EUR");
    expect(screen.getByLabelText("Target Currency Row 3").value).toBe("GBP");
  });

  it("6. shows direction of conversion clearly and updates dynamically when rate is entered", async () => {
    renderComponent();

    const maintainBtn = await screen.findByTestId("maintain-daily-rates-btn");
    fireEvent.click(maintainBtn);

    const directionCell = screen.getByTestId("row-direction-0");
    expect(directionCell).toHaveTextContent("1 INR = [entered rate] USD");

    const rateInput = screen.getByLabelText("Exchange Rate Row 1");
    fireEvent.change(rateInput, { target: { value: "0.0125" } });

    expect(directionCell).toHaveTextContent("1 INR = 0.0125 USD");
  });

  it("7. allows adding and removing target currency rows", async () => {
    renderComponent();

    const maintainBtn = await screen.findByTestId("maintain-daily-rates-btn");
    fireEvent.click(maintainBtn);

    const initialRemoveButtons = screen.getAllByTitle("Remove currency row");
    const initialCount = initialRemoveButtons.length;

    // Add a new row
    const addRowBtn = screen.getByTestId("add-currency-row-btn");
    fireEvent.click(addRowBtn);

    expect(screen.getAllByTitle("Remove currency row").length).toBe(initialCount + 1);

    // Remove the first row
    const removeFirstBtn = screen.getByTestId("remove-row-btn-0");
    fireEvent.click(removeFirstBtn);

    expect(screen.getAllByTitle("Remove currency row").length).toBe(initialCount);
  });

  it("8. validates required fields, positive rates, and duplicate target currencies in batch", async () => {
    renderComponent();

    const maintainBtn = await screen.findByTestId("maintain-daily-rates-btn");
    fireEvent.click(maintainBtn);

    // Set first row to invalid negative rate
    const rateInput1 = screen.getByLabelText("Exchange Rate Row 1");
    fireEvent.change(rateInput1, { target: { value: "-0.01" } });

    // Set second row to duplicate target USD
    const targetSelect2 = screen.getByLabelText("Target Currency Row 2");
    fireEvent.change(targetSelect2, { target: { value: "USD" } });

    const saveBtn = screen.getByTestId("save-daily-rates-btn");
    fireEvent.click(saveBtn);

    expect(await screen.findByText(/Rate must be greater than zero/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Duplicate target currency/i).length).toBeGreaterThanOrEqual(1);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("9. submits batch payload and preserves historical rates upon success", async () => {
    const todayRates = [
      {
        id: "rate-today-usd",
        sourceCurrency: "INR",
        targetCurrency: "USD",
        exchangeRate: 0.0125,
        effectiveDate: "2026-10-13",
        rateSource: "MANUAL",
        status: "ACTIVE",
        createdAt: "2026-10-13T10:00:00Z",
      },
    ];

    api.post.mockResolvedValueOnce({
      data: { success: true, data: todayRates },
    });

    renderComponent();

    const maintainBtn = await screen.findByTestId("maintain-daily-rates-btn");
    fireEvent.click(maintainBtn);

    // Fill first row with valid rate
    const rateInput1 = screen.getByLabelText("Exchange Rate Row 1");
    fireEvent.change(rateInput1, { target: { value: "0.0125" } });

    // Remove remaining initial rows for clean single submission
    const removeButtons = screen.getAllByTitle("Remove currency row");
    for (let i = removeButtons.length - 1; i >= 1; i--) {
      fireEvent.click(removeButtons[i]);
    }

    const saveBtn = screen.getByTestId("save-daily-rates-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/exchange-rates/batch"),
        expect.objectContaining({
          sourceCurrency: "INR",
          rateSource: "MANUAL",
          rates: [{ targetCurrency: "USD", exchangeRate: 0.0125 }],
        })
      );
    });
  });

  it("10. handles backend 409 conflict and displays actionable message", async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { message: "An exchange rate for INR -> USD on 2026-10-13 already exists. Historical rate records cannot be overwritten." },
      },
    });

    renderComponent();

    const maintainBtn = await screen.findByTestId("maintain-daily-rates-btn");
    fireEvent.click(maintainBtn);

    const rateInput1 = screen.getByLabelText("Exchange Rate Row 1");
    fireEvent.change(rateInput1, { target: { value: "0.0125" } });

    // Remove remaining initial rows
    const removeButtons = screen.getAllByTitle("Remove currency row");
    for (let i = removeButtons.length - 1; i >= 1; i--) {
      fireEvent.click(removeButtons[i]);
    }

    const saveBtn = screen.getByTestId("save-daily-rates-btn");
    fireEvent.click(saveBtn);

    expect(await screen.findByTestId("duplicate-rate-alert")).toBeInTheDocument();
    expect(screen.getByText(/Historical rate records cannot be overwritten/i)).toBeInTheDocument();
  });

  it("11. filters exchange rates by search query and currency filters", async () => {
    renderComponent();

    expect(await screen.findByText("RBI Official")).toBeInTheDocument();
    expect(screen.getByText("European Central Bank (ECB)")).toBeInTheDocument();

    // Search query
    const searchInput = screen.getByPlaceholderText(/Search currency, source.../i);
    fireEvent.change(searchInput, { target: { value: "ECB" } });
    expect(screen.getByText("European Central Bank (ECB)")).toBeInTheDocument();
    expect(screen.queryByText("RBI Official")).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("RBI Official")).toBeInTheDocument();

    // Source currency filter
    const sourceFilter = screen.getByLabelText("Filter by Source Currency");
    fireEvent.change(sourceFilter, { target: { value: "EUR" } });
    expect(screen.getByText("European Central Bank (ECB)")).toBeInTheDocument();
    expect(screen.queryByText("RBI Official")).not.toBeInTheDocument();
  });

  it("12. displays empty state when register has no rates", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/api/currency")) {
        return Promise.resolve({ data: mockCurrencies });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderComponent();

    expect(
      await screen.findByText(/No exchange rates registered\. Click 'Maintain Daily Rates' to enter daily currency exchange rates\./i)
    ).toBeInTheDocument();
  });

  it("13. opens details drawer with reciprocal rate and historical integrity disclaimer", async () => {
    renderComponent();

    expect(await screen.findByText("0.011976")).toBeInTheDocument();

    const viewButtons = screen.getAllByTitle("View Details");
    fireEvent.click(viewButtons[0]);

    expect(await screen.findByText("Exchange Rate Details")).toBeInTheDocument();
    expect(screen.getByText(/1 INR = 0.011976 USD/i)).toBeInTheDocument();
    expect(screen.getByText(/Inverse Basis:/i)).toBeInTheDocument();
    expect(screen.getByText(/Historical Integrity:/i)).toBeInTheDocument();
  });

  it("14. handles 403 Forbidden state gracefully", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/api/currency")) {
        return Promise.resolve({ data: mockCurrencies });
      }
      return Promise.reject({
        response: { status: 403, data: { message: "Access Denied" } },
      });
    });

    renderComponent();

    expect(await screen.findByTestId("permission-error-alert")).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to manage currency exchange rates/i)).toBeInTheDocument();
  });
});

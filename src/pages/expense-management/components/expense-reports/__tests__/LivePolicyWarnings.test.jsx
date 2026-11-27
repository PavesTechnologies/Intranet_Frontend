import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LivePolicyWarnings, {
  usePolicyPreview,
} from "@/pages/expense-management/components/expense-reports/LivePolicyWarnings";
import { lineItemService } from "@/pages/expense-management/api/expenseReportsApi";

vi.mock("@/pages/expense-management/api/expenseReportsApi", async () => {
  const actual = await vi.importActual("@/pages/expense-management/api/expenseReportsApi");
  return { ...actual, lineItemService: { ...actual.lineItemService, previewPolicy: vi.fn() } };
});

const FULL_FORM = {
  categoryId: "cat-1",
  expenseDate: "2026-11-20",
  merchantName: " Uber ",
  description: "",
  amount: "2500",
  currencyId: "cur-1",
};

function Harness({ form = FULL_FORM, descriptionTouched = false, receiptAttached = false }) {
  const { warnings, loading } = usePolicyPreview({
    reportId: "r-1",
    enabled: true,
    form,
    lineItemId: null,
    receiptAttached,
    descriptionTouched,
  });
  return <LivePolicyWarnings warnings={warnings} loading={loading} />;
}

const respond = (data) => lineItemService.previewPolicy.mockResolvedValue({ data: { data } });

describe("LivePolicyWarnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not ask the server until category, amount and currency are filled", async () => {
    render(<Harness form={{ ...FULL_FORM, amount: "" }} />);
    await new Promise((r) => setTimeout(r, 500));

    expect(lineItemService.previewPolicy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("live-policy-warnings")).not.toBeInTheDocument();
  });

  it("sends the form and shows an over-limit warning with its figures", async () => {
    respond([
      {
        ruleType: "AMOUNT_LIMIT",
        enforcementType: "WARN",
        message: "Amount 2500 exceeds the configured limit of 2000",
        limitValue: 2000,
        actualValue: 2500,
        overagePercent: 25,
        currencyCode: "INR",
      },
    ]);
    render(<Harness receiptAttached />);

    expect(await screen.findByText("Amount 2500 exceeds the configured limit of 2000")).toBeInTheDocument();
    expect(screen.getByText(/Limit:/)).toBeInTheDocument();
    expect(lineItemService.previewPolicy).toHaveBeenCalledWith("r-1", {
      categoryId: "cat-1",
      expenseDate: "2026-11-20",
      merchantName: "Uber",
      description: null,
      amount: 2500,
      currencyId: "cur-1",
      lineItemId: null,
      receiptAttached: true,
    });
  });

  it("words receipt-required as a hint and says when a rule blocks submission", async () => {
    respond([
      { ruleType: "RECEIPT_REQUIRED", enforcementType: "BLOCK", message: "Category Travel requires a receipt, but none is attached" },
    ]);
    render(<Harness />);

    expect(await screen.findByText(/Attach a receipt: category Travel requires a receipt/)).toBeInTheDocument();
    expect(screen.getByText(/explain this before the report can be submitted/)).toBeInTheDocument();
  });

  it("holds back the missing-description warning until the field was left", async () => {
    const warnings = [{ ruleType: "MISSING_DESCRIPTION", enforcementType: "WARN", message: "This expense is missing a description" }];
    respond(warnings);
    const { rerender } = render(<Harness />);
    await waitFor(() => expect(lineItemService.previewPolicy).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/Checking policy/)).not.toBeInTheDocument());
    expect(screen.queryByText("This expense is missing a description")).not.toBeInTheDocument();

    rerender(<Harness descriptionTouched />);
    expect(await screen.findByText("This expense is missing a description")).toBeInTheDocument();
  });

  it("shows nothing when the preview fails", async () => {
    lineItemService.previewPolicy.mockRejectedValue(new Error("network"));
    render(<Harness />);
    await waitFor(() => expect(lineItemService.previewPolicy).toHaveBeenCalled());

    await waitFor(() => expect(screen.queryByTestId("live-policy-warnings")).not.toBeInTheDocument());
  });
});

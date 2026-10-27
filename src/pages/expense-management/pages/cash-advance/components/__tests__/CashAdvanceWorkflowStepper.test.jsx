import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CashAdvanceWorkflowStepper from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceWorkflowStepper";

const stageItem = (title) => screen.getByText(title, { exact: false }).closest("li");

describe("CashAdvanceWorkflowStepper - closed advance", () => {
  it("marks stage 7 as completed, not active, once the advance is CLOSED", () => {
    render(<CashAdvanceWorkflowStepper currentStatus="CLOSED" />);

    expect(within(stageItem("7. Settlement & Closure")).getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText("Active")).toBeNull();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("keeps stage 7 active while the advance is still awaiting closure", () => {
    render(<CashAdvanceWorkflowStepper currentStatus="SETTLEMENT_PENDING" />);

    expect(within(stageItem("7. Settlement & Closure")).getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Stage 6 of 7")).toBeInTheDocument();
  });
});

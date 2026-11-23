import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdvanceMoneyFlow from "../AdvanceMoneyFlow";

const base = { advanceId: "a-1", currencyCode: "INR" };
const text = (id) => screen.getByTestId(id).textContent;

describe("AdvanceMoneyFlow", () => {
  it("reduced by the manager and approved: shows the request, the cut, the approved amount and that it is not paid yet", () => {
    render(
      <AdvanceMoneyFlow
        advance={{ ...base, status: "APPROVED", requestedAmount: 2000, amount: 1000, approvedAmount: 1000, managerTreatment: "REDUCED" }}
      />,
    );

    expect(text("flow-requested")).toMatch(/2,000\.00/);
    expect(text("flow-manager")).toMatch(/1,000\.00.*Reduced by INR 1,000\.00/);
    expect(text("flow-approved")).toMatch(/1,000\.00.*Fixed at final approval/);
    expect(text("flow-paid")).toMatch(/1,000\.00.*Approved, not paid yet/);
    expect(screen.queryByTestId("flow-owed")).not.toBeInTheDocument();
  });

  it("waiting for Finance: the approved and paid steps are still pending", () => {
    render(
      <AdvanceMoneyFlow
        advance={{ ...base, status: "PENDING_FINANCE_APPROVAL", requestedAmount: 2000, amount: 2000, managerTreatment: "FULL_ADVANCE" }}
      />,
    );

    expect(text("flow-manager")).toMatch(/Full amount kept/);
    expect(text("flow-approved")).toMatch(/Awaiting Finance/);
    expect(text("flow-paid")).toMatch(/Paid after approval/);
  });

  it("disbursed: shows the cash paid and what is still owed", () => {
    render(
      <AdvanceMoneyFlow
        advance={{ ...base, status: "IN_PROGRESS", requestedAmount: 5000, amount: 5000, approvedAmount: 5000, disbursedAmount: 5000, managerTreatment: "FULL_ADVANCE" }}
        outstanding={1500}
      />,
    );

    expect(text("flow-paid")).toMatch(/5,000\.00.*Sent to the employee/);
    expect(text("flow-owed")).toMatch(/1,500\.00.*To settle/);
  });

  it("rejected: nothing approved and nothing paid", () => {
    render(<AdvanceMoneyFlow advance={{ ...base, status: "REJECTED", requestedAmount: 3000, amount: 3000 }} />);

    expect(text("flow-approved")).toMatch(/Rejected, nothing approved/);
    expect(text("flow-paid")).toMatch(/0\.00.*Nothing will be paid/);
  });

  it("carried-in balance: the cash to pay is the approved amount less what was carried in", () => {
    render(
      <AdvanceMoneyFlow
        advance={{ ...base, status: "APPROVED", requestedAmount: 8000, amount: 8000, approvedAmount: 8000, carriedInAmount: 3000, managerTreatment: "SET_OFF" }}
      />,
    );

    expect(text("flow-paid")).toMatch(/5,000\.00.*3,000\.00 covered by a carried-in balance/);
  });
});

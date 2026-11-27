import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdvanceMoneyTracker from "../AdvanceMoneyTracker";

// Made-up figures in the shape figuresOf() returns.
const fig = (o) => ({ paidOut: true, disbursed: 0, carriedIn: 0, consumed: 0, approvedConsumed: null, salaryDeducted: 0, otherRepaid: 0,
  carriedForward: 0, held: 0, outstanding: 0, owedToEmployee: 0, ...o });
const steps = (c) => [...c.querySelectorAll("[data-advance-tracker] li")].map((li) => li.textContent);

describe("advance money tracker", () => {
  it("paid out, used, carried forward and nothing remaining", () => {
    const { container } = render(<AdvanceMoneyTracker figures={fig({ disbursed: 7000, consumed: 5500, carriedForward: 1500 })} serverOutstanding={0} />);
    expect(steps(container)).toEqual([
      expect.stringMatching(/Paid out.*7,000\.00/),
      expect.stringMatching(/Used on reports.*5,500\.00/),
      expect.stringMatching(/Carried forward.*1,500\.00/),
      expect.stringMatching(/Remaining.*0\.00/),
    ]);
    expect(container.textContent).toMatch(/Nothing is left on this advance\./);
  });

  it("says what is still with the employee", () => {
    const { container } = render(<AdvanceMoneyTracker figures={fig({ disbursed: 1000, carriedIn: 1500 })} serverOutstanding={2500} />);
    expect(steps(container)[1]).toMatch(/Carried in.*1,500\.00/);
    expect(container.textContent).toMatch(/2,500\.00 is still with you/);
  });

  it("before pay-out, nothing has moved", () => {
    const { container } = render(<AdvanceMoneyTracker figures={fig({ paidOut: false })} />);
    expect(container.textContent).toMatch(/not been paid out yet/);
  });
});

describe("advance money tracker from the request", () => {
  it("one line from the request: requested, approved, paid out, carried in, used, remaining", () => {
    const { container } = render(
      <AdvanceMoneyTracker withRequest serverOutstanding={2500}
        figures={fig({ approvedKnown: true, requested: 1000, approved: 1000, disbursed: 1000, carriedIn: 1500 })} />,
    );
    expect(steps(container).map((t) => t.replace(/[\d,.\s₹INR−-]+$/, "").trim())).toEqual(
      ["Requested", "Approved", "Paid out", "Carried in", "Used on reports", "Remaining"],
    );
  });

  it("shows the cut off when the approvers reduced it, and waits before approval", () => {
    const cut = render(<AdvanceMoneyTracker withRequest figures={fig({ paidOut: false, approvedKnown: true, requested: 5000, approved: 3500 })} />);
    expect(steps(cut.container)[1]).toMatch(/Cut off.*− .*1,500\.00/);
    expect(cut.container.textContent).toMatch(/Approved, not paid out yet/);
    const waiting = render(<AdvanceMoneyTracker withRequest figures={fig({ paidOut: false, approvedKnown: false, requested: 2000 })} />);
    expect(waiting.container.textContent).toMatch(/ApprovedPending/);
    expect(waiting.container.textContent).toMatch(/Waiting for approval/);
  });
});

import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdvanceMoneyOverview from "../AdvanceMoneyOverview";

const totals = (o = {}) => ({
  count: 2, requested: 7000, approved: 5500, cut: 1500, cutCount: 1, awaitingDisbursement: 3500, awaitingCount: 1,
  disbursed: 2000, carriedIn: 0, owed: 2000, consumed: 0, remaining: 2000, carriedForward: 0, held: 0, moved: 0,
  salaryDeducted: 0, otherRepaid: 0, outstandingOnAdvances: 2000, outstanding: 2000, owedToEmployee: 0, ...o,
});
const value = (label) => document.querySelector(`[data-pipeline-value="${label}"]`).textContent;
const note = (label) => document.querySelector(`[data-pipeline-note="${label}"]`).textContent;

describe("Where the advance money went: flow", () => {
  it("shows the cut off as its own step between Requested and Approved", () => {
    render(<AdvanceMoneyOverview totals={totals()} />);
    const steps = [...document.querySelectorAll("[data-pipeline-value]")].map((n) => n.dataset.pipelineValue);
    expect(steps).toEqual(["Requested", "Cut off", "Approved", "Disbursed", "Owed"]);
    expect(value("Cut off")).toMatch(/− .*1,500\.00/);
    expect(note("Cut off")).toBe("Reduced by approvers on 1 advance");
    expect(note("Approved")).toBe("Requested − cut off");
    expect(note("Disbursed")).toMatch(/3,500\.00 approved, not paid yet/);
  });

  it("says nothing was reduced when every advance was approved as asked", () => {
    render(<AdvanceMoneyOverview totals={totals({ cut: 0, cutCount: 0, approved: 7000 })} />);
    expect(note("Cut off")).toBe("Nothing reduced");
    expect(value("Cut off")).not.toMatch(/−/);
  });
});

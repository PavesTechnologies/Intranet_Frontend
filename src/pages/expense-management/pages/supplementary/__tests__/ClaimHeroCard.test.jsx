import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ClaimHeroCard, { ClaimMoneySummary, claimJourney } from "../ClaimHeroCard";

// Made-up claims in the shape GET /xms/employee/supplementary-claims/{id} returns.
const claim = (o = {}) => ({
  claimId: "c1", claimNumber: "SUP-1", reportNumber: "EXP-2026-2027-1D7BF814", status: "DRAFT", totalAmount: 0, currencyCode: "INR",
  lateReasonCode: "FORGOT_TO_SUBMIT", reportTripStart: "2026-11-02", reportTripEnd: "2026-11-06", createdAt: "2026-11-25T10:00:00",
  items: [], history: [], ...o,
});

describe("Supplementary claim header, like the expense report's", () => {
  it("a draft: shows the claim, its words, the facts and the five steps with Draft current", () => {
    const { container } = render(<ClaimHeroCard claim={claim()} />);
    expect(container.querySelector("[data-claim-journey]").textContent).toMatch(/Draft - not submitted/);
    expect(container.querySelector("[data-claim-total]").textContent).toMatch(/0\.00/);
    expect(container.textContent).toMatch(/EXP-2026-2027-1D7BF814/);
    expect(container.textContent).toMatch(/Forgot to submit it in the report/);
    const steps = [...container.querySelectorAll("[data-claim-tracker] [data-step]")].map((n) => n.dataset.step);
    expect(steps).toEqual(["Draft", "Manager approval", "Finance approval", "Payment", "Settled"]);
    expect(container.querySelector('[aria-current="step"]').dataset.step).toBe("Draft");
  });

  it("maps every status to a step, and stops on a rejection", () => {
    expect(claimJourney(claim({ status: "PENDING_FINANCE" })).step).toBe(2);
    expect(claimJourney(claim({ status: "PAYMENT_PENDING" })).step).toBe(3);
    expect(claimJourney(claim({ status: "MANAGER_REJECTED" }))).toMatchObject({ step: 1, stopped: true });
    expect(claimJourney(claim({ status: "SETTLED", totalAmount: 1000, advanceOffsetAmount: 1000 })).label).toBe("Settled against your advance");
  });

  it("money summary splits what was set against the next advance from what AP pays", () => {
    const { container } = render(
      <ClaimMoneySummary claim={claim({ status: "PAYMENT_PENDING", totalAmount: 2000, advanceOffsetAmount: 1500, items: [{}, {}] })} withReceipt={2} />,
    );
    const text = container.querySelector("[data-claim-summary]").textContent;
    expect(text).toMatch(/Set against your next advance.*1,500\.00/);
    expect(text).toMatch(/Paid by AP.*500\.00/);
    expect(text).toMatch(/With a receipt2 of 2/);
  });
});

import { describe, expect, it } from "vitest";
import { flowStateFor, stepStates } from "@/pages/expense-management/pages/supplementary/SupplementaryFlowChart";

const states = (status) => stepStates(status).map((s) => s.state);

describe("flowStateFor", () => {
  it("places each status on the right step", () => {
    expect(flowStateFor("DRAFT").current).toBe(0);
    expect(flowStateFor("PENDING_MANAGER").current).toBe(1);
    expect(flowStateFor("PENDING_FINANCE").current).toBe(2);
    expect(flowStateFor("PAYMENT_PENDING").current).toBe(3);
    expect(flowStateFor("SETTLED").current).toBe(4);
  });

  it("marks a rejection on the step that rejected it, and a clarification as needing a reply", () => {
    expect(flowStateFor("MANAGER_REJECTED")).toMatchObject({ current: 1, rejected: true });
    expect(flowStateFor("FINANCE_REJECTED")).toMatchObject({ current: 2, rejected: true });
    expect(flowStateFor("CLARIFICATION_REQUIRED")).toMatchObject({ clarification: true });
  });
});

describe("stepStates", () => {
  it("shows steps already passed as done, the current one as current, and the rest as upcoming", () => {
    expect(states("PENDING_FINANCE")).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
  });

  it("shows the step that rejected the claim as rejected", () => {
    expect(states("FINANCE_REJECTED")).toEqual(["done", "done", "rejected", "upcoming", "upcoming"]);
  });

  it("greys out every step of a cancelled claim", () => {
    expect(states("CANCELLED").every((s) => s === "cancelled")).toBe(true);
  });

  it("marks everything done for a settled claim", () => {
    expect(states("SETTLED")).toEqual(["done", "done", "done", "done", "current"]);
  });
});

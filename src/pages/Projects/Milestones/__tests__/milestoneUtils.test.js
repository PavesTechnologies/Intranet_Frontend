import { describe, expect, it } from "vitest";
import {
  estimateAmount,
  extractApiErrors,
  formatPercent,
  validateMilestoneForm,
} from "../utils/milestoneUtils";

const base = {
  name: "UAT sign-off",
  milestoneCode: "",
  description: "",
  epicId: "",
  plannedStartDate: "2026-05-01",
  plannedDueDate: "2026-05-10",
  billable: true,
  allocationPercentage: "25",
};
const ctx = { isEdit: false, availablePercentage: 40, allocationLocked: false };

describe("validateMilestoneForm", () => {
  it("accepts a valid billable milestone", () => {
    expect(validateMilestoneForm(base, ctx)).toEqual({});
  });

  it("requires a name", () => {
    expect(validateMilestoneForm({ ...base, name: "  " }, ctx).name).toMatch(/name/i);
  });

  it("requires both planned dates", () => {
    const errors = validateMilestoneForm({ ...base, plannedStartDate: "", plannedDueDate: "" }, ctx);
    expect(errors.plannedStartDate).toMatch(/planned start date/i);
    expect(errors.plannedDueDate).toMatch(/planned due date/i);
    // Still required on edit.
    expect(validateMilestoneForm({ ...base, plannedDueDate: "" }, { ...ctx, isEdit: true }).plannedDueDate)
      .toBeDefined();
  });

  it("keeps both dates inside the project window", () => {
    const bounded = {
      ...ctx,
      minStartDate: "2026-05-01",
      projectStartDate: "2026-05-01",
      projectEndDate: "2026-06-30",
    };
    expect(validateMilestoneForm({ ...base, plannedStartDate: "2026-04-30" }, bounded).plannedStartDate)
      .toMatch(/project start date/i);
    expect(
      validateMilestoneForm({ ...base, plannedStartDate: "", plannedDueDate: "2026-04-30" }, bounded).plannedDueDate
    ).toMatch(/project start date/i);
    expect(
      validateMilestoneForm({ ...base, plannedDueDate: "2026-07-01" }, bounded).plannedDueDate
    ).toMatch(/project end date/i);
    expect(
      validateMilestoneForm({ ...base, plannedStartDate: "2026-07-01", plannedDueDate: "2026-07-02" }, bounded)
        .plannedStartDate
    ).toMatch(/project end date/i);
    expect(validateMilestoneForm(base, bounded)).toEqual({});
  });

  it("rejects a due date before the start date", () => {
    const errors = validateMilestoneForm(
      { ...base, plannedStartDate: "2026-05-10", plannedDueDate: "2026-05-01" },
      ctx
    );
    expect(errors.plannedDueDate).toBeDefined();
  });

  it("requires a positive allocation for billable milestones", () => {
    expect(validateMilestoneForm({ ...base, allocationPercentage: "0" }, ctx).allocationPercentage).toMatch(/above 0/);
    expect(validateMilestoneForm({ ...base, allocationPercentage: "" }, ctx).allocationPercentage).toBeDefined();
  });

  it("rejects more than two decimals and more than the remaining share", () => {
    expect(validateMilestoneForm({ ...base, allocationPercentage: "10.555" }, ctx).allocationPercentage).toMatch(/2 decimal/);
    expect(validateMilestoneForm({ ...base, allocationPercentage: "41" }, ctx).allocationPercentage).toMatch(/40%/);
  });

  it("skips allocation checks for non-billable or locked milestones", () => {
    expect(validateMilestoneForm({ ...base, billable: false, allocationPercentage: "0" }, ctx)).toEqual({});
    expect(
      validateMilestoneForm({ ...base, allocationPercentage: "99" }, { ...ctx, allocationLocked: true })
    ).toEqual({});
  });

  it("validates code format on create only", () => {
    expect(validateMilestoneForm({ ...base, milestoneCode: "bad code!" }, ctx).milestoneCode).toBeDefined();
    expect(validateMilestoneForm({ ...base, milestoneCode: "bad code!" }, { ...ctx, isEdit: true, }).milestoneCode)
      .toBeUndefined();
  });

  it("accepts an edit without any display order", () => {
    expect(validateMilestoneForm(base, { ...ctx, isEdit: true })).toEqual({});
  });
});

describe("money and percent helpers", () => {
  it("estimates half-up to 2 decimals", () => {
    expect(estimateAmount(1000, 33.33)).toBe(333.3);
    expect(estimateAmount(10.01, 12.5)).toBe(1.25);
    expect(estimateAmount(null, 10)).toBeNull();
  });

  it("formats percentages without trailing zeros", () => {
    expect(formatPercent(30)).toBe("30%");
    expect(formatPercent("12.50")).toBe("12.50%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("extractApiErrors", () => {
  it("handles list, map, conflict and forbidden shapes", () => {
    expect(extractApiErrors({ response: { status: 400, data: { errors: ["Too much"] } } }).summary).toEqual(["Too much"]);
    expect(extractApiErrors({ response: { status: 400, data: { errors: { name: "Required" } } } }).fields).toEqual({
      name: "Required",
    });
    expect(extractApiErrors({ response: { status: 409, data: {} } }).summary[0]).toMatch(/changed this milestone/);
    expect(extractApiErrors({ response: { status: 403, data: { message: "No access" } } }).summary).toEqual(["No access"]);
    expect(extractApiErrors(new Error("network")).summary[0]).toMatch(/Something went wrong/);
  });
});

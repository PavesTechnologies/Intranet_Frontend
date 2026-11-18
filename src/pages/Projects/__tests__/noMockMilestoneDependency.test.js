import { describe, expect, it } from "vitest";

// Static guard: the removed mock milestone module and its localStorage key must not come back.
const sources = import.meta.glob("/src/**/*.{js,jsx}", { query: "?raw", import: "default", eager: true });

const isTest = (p) => /\.test\.[jt]sx?$/.test(p) || p.includes("/__tests__/");

describe("mock milestone module isolation", () => {
  const prod = Object.entries(sources).filter(([p]) => !isTest(p));

  it("finds the application sources", () => {
    expect(prod.length).toBeGreaterThan(100);
  });

  it("is not imported by any application file", () => {
    const offenders = prod.filter(([, src]) => /from\s+["'][^"']*manager\/milestones\/|from\s+["']\.\/milestones\/|import\(\s*["']\.\/milestones\//.test(src)).map(([p]) => p);
    expect(offenders).toEqual([]);
  });

  it("is not referenced through mockMilestoneData or ArBillingReadinessPanel outside the module", () => {
    const offenders = prod.filter(([, src]) => /mockMilestoneData|ArBillingReadinessPanel/.test(src)).map(([p]) => p);
    expect(offenders).toEqual([]);
  });

  it("owns the pms_milestones_preview_ localStorage key exclusively", () => {
    const offenders = prod.filter(([, src]) => src.includes("pms_milestones_preview_")).map(([p]) => p);
    expect(offenders).toEqual([]);
  });

  it("is not used by the AR milestone integration", () => {
    const ar = prod.filter(([p]) => p.startsWith("/src/pages/account_receivable/"));
    expect(ar.length).toBeGreaterThan(10);
    expect(ar.filter(([, src]) => /pages\/Projects|manager\/milestones/.test(src)).map(([p]) => p)).toEqual([]);
  });
});

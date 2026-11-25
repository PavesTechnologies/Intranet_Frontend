import { describe, it, expect } from "vitest";
import { buildPageIndex, searchPages, searchPeople, scoreMatch } from "./searchIndex";

const as = (roles, permissions = []) => {
  const upper = roles.map((r) => r.toUpperCase());
  const perms = permissions.map((p) => p.toUpperCase());
  return {
    hasRole: (allowed) => allowed.some((r) => upper.includes(String(r).toUpperCase())),
    hasAnyPermission: (wanted = []) => !wanted.length || wanted.some((p) => perms.includes(String(p).toUpperCase())),
  };
};

const paths = (pages) => pages.map((p) => p.path);

describe("buildPageIndex", () => {
  it("gives a General employee the common pages but no admin or finance modules", () => {
    const pages = buildPageIndex({ ...as(["GENERAL"]), financeEnabled: false });
    expect(paths(pages)).toEqual(
      expect.arrayContaining(["/dashboard", "/leave-management", "/timesheets", "/projects", "/employee-onboarding/employee-directory"]),
    );
    expect(paths(pages).some((p) => p.startsWith("/user-management"))).toBe(false);
    expect(paths(pages).some((p) => p.startsWith("/resource-management"))).toBe(false);
    expect(paths(pages).some((p) => p.startsWith("/ai-screening"))).toBe(false);
    expect(paths(pages).some((p) => p.startsWith("/expense-management"))).toBe(false);
  });

  it("only offers Finance modules when FINANCE_TOGGLE is on", () => {
    const off = buildPageIndex({ ...as(["GENERAL"]), financeEnabled: false });
    const on = buildPageIndex({ ...as(["GENERAL"]), financeEnabled: true });
    expect(paths(off)).not.toContain("/expense-management/expenses/my");
    expect(paths(on)).toContain("/expense-management/expenses/my");
    expect(paths(on)).toContain("/finance/dashboard");
  });

  it("gives Admin user management and only the Client Management resource page", () => {
    const pages = buildPageIndex({ ...as(["ADMIN"]), financeEnabled: false });
    expect(paths(pages)).toContain("/user-management/users");
    const rm = pages.filter((p) => p.module === "Resource Management");
    expect(paths(rm)).toEqual(["/resource-management"]);
  });

  it("follows the AI Screening per-role menus (Settings is HR_ADMIN only)", () => {
    const hrAdmin = buildPageIndex({ ...as(["HR_ADMIN"]), financeEnabled: false });
    const hr = buildPageIndex({ ...as(["HR"]), financeEnabled: false });
    expect(paths(hrAdmin)).toContain("/ai-screening/settings");
    expect(paths(hr)).not.toContain("/ai-screening/settings");
    expect(paths(hr)).not.toContain("/ai-screening/dashboard");
  });

  it("keeps the parent trail and normalises relative links", () => {
    const pages = buildPageIndex({ ...as(["HR", "ADMIN"]), financeEnabled: false });
    const hub = pages.find((p) => p.label === "Profile Hub");
    expect(hub.path).toBe("/employee-onboarding/core-employee");
    expect(hub.trail).toEqual(["Compliance & Verification"]);
  });
});

describe("search ranking", () => {
  it("requires every word to match", () => {
    expect(scoreMatch("leave time", ["Leave Management", "Intranet"])).toBe(0);
    expect(scoreMatch("leave", ["Leave Management", "Intranet"])).toBeGreaterThan(0);
  });

  it("ranks label prefix matches above module-only matches", () => {
    const pages = buildPageIndex({ ...as(["GENERAL", "HR", "ADMIN"]), financeEnabled: false });
    const [first] = searchPages(pages, "time");
    expect(first.path).toBe("/timesheets");
  });

  it("finds people by name, email or employee id", () => {
    const people = [
      { id: "1", name: "Asha Rao", email: "asha.rao@example.com", employeeId: "E100" },
      { id: "2", name: "Ravi Kumar", email: "ravi.k@example.com", employeeId: "E200" },
    ];
    expect(searchPeople(people, "ravi").map((p) => p.id)).toEqual(["2"]);
    expect(searchPeople(people, "e100").map((p) => p.id)).toEqual(["1"]);
    expect(searchPeople(people, "asha.rao").map((p) => p.id)).toEqual(["1"]);
  });
});

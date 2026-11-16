import { describe, it, expect, vi } from "vitest";
import { filterMenuByRole } from "./sidebarPermissions";

describe("filterMenuByRole", () => {
  const items = [
    { label: "Dashboard", to: "/dashboard", allowedRoles: ["ADMIN", "AP_EXECUTIVE"] },
    { label: "Invoice Management", to: "/invoices", requiredPermissions: ["INVOICE_VIEW"] },
    { label: "No restriction", to: "/open" },
  ];

  it("shows a role-gated item only when hasRole passes", () => {
    const hasRole = vi.fn().mockReturnValue(true);
    const result = filterMenuByRole(items, hasRole);
    expect(result.map((i) => i.label)).toContain("Dashboard");
    expect(hasRole).toHaveBeenCalledWith(["ADMIN", "AP_EXECUTIVE"]);
  });

  it("hides a role-gated item when hasRole fails", () => {
    const result = filterMenuByRole(items, () => false);
    expect(result.map((i) => i.label)).not.toContain("Dashboard");
  });

  // This is the exact bug this guards: a Finance user held PAYMENT_VIEW/PAYMENT_PROCESS but not
  // INVOICE_VIEW (an incomplete UMS group mapping) — the old role-only filter still showed the
  // "Invoice Management" nav item, landing them on a page whose data fetch 403'd.
  it("hides a permission-gated item when hasAnyPermission fails, even if hasRole would pass", () => {
    const result = filterMenuByRole(items, () => true, () => false);
    expect(result.map((i) => i.label)).not.toContain("Invoice Management");
  });

  it("shows a permission-gated item when hasAnyPermission passes", () => {
    const hasAnyPermission = vi.fn().mockReturnValue(true);
    const result = filterMenuByRole(items, () => true, hasAnyPermission);
    expect(result.map((i) => i.label)).toContain("Invoice Management");
    expect(hasAnyPermission).toHaveBeenCalledWith(["INVOICE_VIEW"]);
  });

  it("treats a permission-gated item as hidden by default when hasAnyPermission isn't supplied", () => {
    // Omitting hasAnyPermission defaults every permission check to pass (backward-compatible for
    // menus with no requiredPermissions entries) — an item that DOES declare requiredPermissions
    // still renders in that case, since there's no permission source to check against.
    const result = filterMenuByRole(items, () => true);
    expect(result.map((i) => i.label)).toContain("Invoice Management");
  });

  it("always shows an item with neither allowedRoles nor requiredPermissions", () => {
    const result = filterMenuByRole(items, () => false, () => false);
    expect(result.map((i) => i.label)).toContain("No restriction");
  });

  it("suppresses a parent once every child is filtered out by permission", () => {
    const withChildren = [
      { label: "Parent", children: [{ label: "Child", requiredPermissions: ["INVOICE_VIEW"] }] },
    ];
    const result = filterMenuByRole(withChildren, () => true, () => false);
    expect(result).toHaveLength(0);
  });
});

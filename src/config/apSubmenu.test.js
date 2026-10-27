import { describe, it, expect } from "vitest";
import { AP_SUBMENU } from "./sidebarConfig";
import { filterMenuByRole } from "../utils/sidebarPermissions";

const as = (roles, permissions) => {
  const r = roles.map((x) => x.toUpperCase());
  return filterMenuByRole(
    AP_SUBMENU,
    (allowed) => allowed.some((x) => r.includes(x.toUpperCase())),
    (perms) => perms.some((p) => permissions.includes(p)),
  );
};
const shape = (menu) => menu.map((i) => (i.children ? { [i.label]: i.children.map((c) => c.label) } : i.label));

describe("AP sidebar sections", () => {
  it("groups a Finance Executive's pages into four sections", () => {
    const menu = as(["Finance_Executive"], [
      "INVOICE_VIEW", "RECURRING_INVOICE_MANAGE", "VENDOR_NOTE_MANAGE", "VENDOR_VIEW", "PAYMENT_VIEW", "PAYMENT_PROCESS",
      "TDS_TRACKING_VIEW", "GST_ITC_MANAGE",
    ]);
    expect(shape(menu)).toEqual([
      "Dashboard",
      "Notifications",
      "How It Works",
      // VENDOR_VIEW also opens Internal Requests (read-only), as GET /vendor-onboarding-requests allows.
      { "Invoices & Vendors": ["Invoice Management", "Recurring Invoices", "Credit & Debit Notes", "Vendor Management", "Internal Requests"] },
      { "Payments & Tax": ["Payment Management", "TDS Tracking", "GST Input Credit", "Upload Receipts"] },
      { "Reports & Accounting": ["Reports", "Accounting Export"] },
      "Settings",
    ]);
    // a section left with one page is a plain link to it
    const settings = menu.find((i) => i.label === "Settings");
    expect(settings.children).toBeUndefined();
  });

  it("shows an AP Executive only what they work on", () => {
    const menu = as(["AP_Executive"], ["INVOICE_VIEW", "INVOICE_UPLOAD"]);
    // Recurring Invoices and Credit & Debit Notes are readable with INVOICE_VIEW
    expect(shape(menu)).toEqual(["Dashboard", "Notifications", "How It Works",
      { "Invoices & Vendors": ["Invoice Management", "Recurring Invoices", "Credit & Debit Notes"] }]);
    expect(menu.find((i) => i.label === "Invoices & Vendors").to).toBe("/accounts-payable/invoices");
  });

  it("puts automation and team set-up under Settings for an Admin", () => {
    const menu = as(["Admin"], ["INVOICE_VIEW", "AP_AUTOMATION_MANAGE", "AP_WORK_ASSIGN", "TDS_TRACKING_UPDATE"]);
    expect(shape(menu)).toContainEqual({ Settings: ["System Configuration", "AP Automation", "AP Team", "Import Past TDS Records"] });
  });

  it("keeps every page reachable at its existing route", () => {
    const pages = AP_SUBMENU.flatMap((i) => i.children || [i]);
    expect(pages.every((p) => p.to.startsWith("/accounts-payable"))).toBe(true);
    for (const section of AP_SUBMENU.filter((i) => i.children)) {
      expect(section.children.map((c) => c.to)).toContain(section.to);
    }
  });
});

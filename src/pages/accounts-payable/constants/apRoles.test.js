import { describe, it, expect } from "vitest";
import { AP_ALL_ROLES, AP_VENDOR_MANAGER_ROLES } from "./apRoles";

describe("AP roles", () => {
  // Finance pays outside the intranet and records the receipt, so the Finance Manager has no AP work
  // (the role stays in use as the Accounts Receivable checker).
  it("keeps the Finance Manager out of the AP module", () => {
    expect(AP_ALL_ROLES).not.toContain("Finance_Manager");
    expect(AP_VENDOR_MANAGER_ROLES).not.toContain("Finance_Manager");
  });

  it("lets the AP roles in", () => {
    expect(AP_ALL_ROLES).toEqual(expect.arrayContaining(["Admin", "Vendor_Intake", "AP_Executive", "Finance_Executive", "Invoice_Approver"]));
  });
});

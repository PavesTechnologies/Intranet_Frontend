import { describe, it, expect } from "vitest";
import { AP_ALL_ROLES, AP_ROLES, AP_VENDOR_MANAGER_ROLES } from "./apRoles";

describe("AP roles", () => {
  it("lets the Finance Manager into the AP module", () => {
    expect(AP_ROLES.FINANCE_MANAGER).toBe("Finance_Manager");
    expect(AP_ALL_ROLES).toContain("Finance_Manager");
  });

  it("does not make the Finance Manager a vendor manager", () => {
    expect(AP_VENDOR_MANAGER_ROLES).not.toContain("Finance_Manager");
  });
});

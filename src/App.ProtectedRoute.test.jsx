import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Auth state per test. hasAnyPermission mirrors AuthContext's: case-insensitive, empty = no gate.
let authState;
vi.mock("./contexts/AuthContext", async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => authState,
}));

// Importing App.jsx loads every page module; pdfjs needs DOMMatrix, which jsdom lacks. No PDF
// is rendered here, so a stub is enough.
vi.mock("react-pdf", () => ({
  Document: () => null,
  Page: () => null,
  pdfjs: { GlobalWorkerOptions: {}, version: "0.0.0" },
}));

const { ProtectedRoute } = await import("./App.jsx");

function setUser({ authenticated = true, roles = [], permissions = [] } = {}) {
  const userPermissions = permissions.map((p) => p.toUpperCase());
  authState = {
    isAuthenticated: authenticated,
    user: authenticated ? { roles, permissions } : null,
    logout: vi.fn(),
    hasAnyPermission: (codes = []) =>
      !codes || codes.length === 0 || codes.some((c) => userPermissions.includes(String(c).toUpperCase())),
  };
}

function renderGuard(props) {
  return render(
    <MemoryRouter initialEntries={["/guarded"]}>
      <Routes>
        <Route path="/" element={<div>LOGIN</div>} />
        <Route path="/unauthorized" element={<div>UNAUTHORIZED</div>} />
        <Route path="/guarded" element={<ProtectedRoute {...props}><div>PAGE</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

const AP_ROLES = ["Admin", "AP_Executive"];

describe("App ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sends unauthenticated users to login", () => {
    setUser({ authenticated: false });
    renderGuard({ allowedRoles: AP_ROLES, permission: "PR_VIEW" });
    expect(screen.getByText("LOGIN")).toBeInTheDocument();
  });

  describe("anyPermissions (previously ignored)", () => {
    const props = { allowedRoles: AP_ROLES, anyPermissions: ["PR_VIEW", "PO_VIEW"] };

    it("denies an AP-role user holding none of the permissions", () => {
      setUser({ roles: ["AP_Executive"], permissions: ["INVOICE_VIEW"] });
      renderGuard(props);
      expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
    });

    it("allows an AP-role user holding any one of them", () => {
      setUser({ roles: ["ap_executive"], permissions: ["po_view"] });
      renderGuard(props);
      expect(screen.getByText("PAGE")).toBeInTheDocument();
    });

    it("still requires the role when the permission is held", () => {
      setUser({ roles: ["General"], permissions: ["PR_VIEW"] });
      renderGuard(props);
      expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
    });
  });

  describe("permission (previously ignored)", () => {
    const props = { allowedRoles: AP_ROLES, permission: "APPROVAL_POLICY_MANAGE" };

    it("denies an AP-role user without the permission", () => {
      setUser({ roles: ["Admin"], permissions: ["PR_VIEW"] });
      renderGuard(props);
      expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
    });

    it("allows an AP-role user with the permission", () => {
      setUser({ roles: ["Admin"], permissions: ["APPROVAL_POLICY_MANAGE"] });
      renderGuard(props);
      expect(screen.getByText("PAGE")).toBeInTheDocument();
    });

    it("still requires the role when the permission is held", () => {
      setUser({ roles: ["General"], permissions: ["APPROVAL_POLICY_MANAGE"] });
      renderGuard(props);
      expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
    });
  });

  describe("existing behaviour is unchanged", () => {
    it("requiredPermissions alone is an any-of gate with no role needed", () => {
      setUser({ roles: [], permissions: ["INVOICE_VIEW"] });
      renderGuard({ requiredPermissions: ["INVOICE_VIEW", "PAYMENT_VIEW"] });
      expect(screen.getByText("PAGE")).toBeInTheDocument();
    });

    it("requiredPermissions denies when none are held", () => {
      setUser({ roles: ["Admin"], permissions: [] });
      renderGuard({ requiredPermissions: ["INVOICE_VIEW"] });
      expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
    });

    it("orPermissions lets a user without the role in", () => {
      setUser({ roles: ["General"], permissions: ["AP_MANAGEMENT_DASHBOARD_VIEW"] });
      renderGuard({ allowedRoles: AP_ROLES, orPermissions: ["AP_MANAGEMENT_DASHBOARD_VIEW"] });
      expect(screen.getByText("PAGE")).toBeInTheDocument();
    });

    it("role-only routes allow the role and deny everyone else", () => {
      setUser({ roles: ["Admin"] });
      const { unmount } = renderGuard({ allowedRoles: AP_ROLES });
      expect(screen.getByText("PAGE")).toBeInTheDocument();
      unmount();

      setUser({ roles: ["General"] });
      renderGuard({ allowedRoles: AP_ROLES });
      expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
    });

    it("authentication-only guard (the Layout wrapper) admits any signed-in user", () => {
      setUser({ roles: [] });
      renderGuard({});
      expect(screen.getByText("PAGE")).toBeInTheDocument();
    });
  });
});

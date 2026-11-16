import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import FinanceDashboard from "./FinanceDashboard";
import { useAuth } from "../../contexts/AuthContext";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../utils/applicationRoutes", () => ({
  isFinanceEnabled: () => true,
  APPLICATIONS: { INTRANET: "intranet", FINANCE: "finance" },
  getApplicationFromPath: () => "finance",
}));

const asRoles = (...roles) => {
  const upper = roles.map((r) => r.toUpperCase());
  useAuth.mockReturnValue({ hasRole: (allowed) => allowed.some((r) => upper.includes(r.toUpperCase())) });
};

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={["/finance/dashboard"]}>
      <Routes>
        <Route path="/finance/dashboard" element={<FinanceDashboard />} />
        <Route path="/accounts-payable/dashboard" element={<div>AP DASHBOARD PAGE</div>} />
        <Route path="/accounts-payable/reports" element={<div>AP REPORTS PAGE</div>} />
        <Route path="/account-receivable/dashboard" element={<div>AR DASHBOARD PAGE</div>} />
        <Route path="/account-receivable/billing-approvals" element={<div>AR APPROVALS PAGE</div>} />
        <Route path="/expense-management/dashboard" element={<div>XMS DASHBOARD PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );

const moduleCard = (name) => screen.getByRole("link", { name: `Open ${name}` });

const SECTIONS = [
  "Total Receivables",
  "Total Payables",
  "Total Expenses",
  "Net Cash Flow",
  "Quick Actions",
  "Financial Snapshot",
  "Finance Modules",
  "Cash Inflow vs Outflow",
  "Financial Action Center",
  "Expense Overview",
  "Tax & Compliance Overview",
  "Payables & Receivables",
  "Recent Financial Activity",
];

const expectFullDashboard = () => {
  SECTIONS.forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  ["Accounts Receivable", "Accounts Payable", "Expense Management"].forEach((m) =>
    expect(moduleCard(m)).toBeInTheDocument()
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("FinanceDashboard — same complete dashboard for every user (current phase)", () => {
  it.each([["General"], ["Manager"], ["Vendor_Intake"], ["Finance_Manager"], ["Super_Admin"]])(
    "shows every section and all three module cards to %s",
    (role) => {
      asRoles(role);
      renderAt();
      expectFullDashboard();
    }
  );

  it("renders mock values and keeps tax groups separate", () => {
    asRoles("General");
    renderAt();
    expect(screen.getAllByText("₹45.8L").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+₹12.4L").length).toBeGreaterThan(0);
    expect(screen.getByText("Net GST Liability")).toBeInTheDocument();
    expect(screen.getByText("₹3.1L")).toBeInTheDocument(); // 8.24L − 5.13L
    expect(screen.getByText("TDS Credit from Customers")).toBeInTheDocument();
    expect(screen.getByText("TDS Payable")).toBeInTheDocument();
    expect(screen.getByText(/never offset/i)).toBeInTheDocument();
    expect(screen.getByText("Sample data")).toBeInTheDocument();
  });
});

describe("FinanceDashboard — role dropdown", () => {
  it("defaults to an existing role, is not overridden by the logged-in role, and changing it hides nothing", () => {
    asRoles("General");
    renderAt();
    const select = screen.getByLabelText("Dashboard role");
    expect(select).toHaveValue("Finance_Manager");

    fireEvent.change(select, { target: { value: "AP_Executive" } });
    expect(screen.getByLabelText("Dashboard role")).toHaveValue("AP_Executive");
    expectFullDashboard();
  });

  it("remembers the selection across remounts (e.g. navigating away and back)", () => {
    asRoles("General");
    renderAt();
    fireEvent.change(screen.getByLabelText("Dashboard role"), { target: { value: "Super_Admin" } });
    fireEvent.change(screen.getByLabelText("Financial period"), { target: { value: "fy-to-date" } });
    cleanup();
    renderAt();
    expect(screen.getByLabelText("Dashboard role")).toHaveValue("Super_Admin");
    expect(screen.getByLabelText("Financial period")).toHaveValue("fy-to-date");
  });
});

describe("FinanceDashboard — navigation to existing module dashboards", () => {
  it("opens the existing AP dashboard", () => {
    asRoles("Admin");
    renderAt();
    fireEvent.click(moduleCard("Accounts Payable"));
    expect(screen.getByText("AP DASHBOARD PAGE")).toBeInTheDocument();
  });

  it("opens the existing AR dashboard", () => {
    asRoles("Finance_Executive");
    renderAt();
    fireEvent.click(moduleCard("Accounts Receivable"));
    expect(screen.getByText("AR DASHBOARD PAGE")).toBeInTheDocument();
  });

  it("keeps the Finance Manager exception to Billing Approvals", () => {
    asRoles("Finance_Manager");
    renderAt();
    fireEvent.click(moduleCard("Accounts Receivable"));
    expect(screen.getByText("AR APPROVALS PAGE")).toBeInTheDocument();
  });

  it("opens the existing Expense Management dashboard (keyboard)", () => {
    asRoles("General");
    renderAt();
    fireEvent.keyDown(moduleCard("Expense Management"), { key: "Enter" });
    expect(screen.getByText("XMS DASHBOARD PAGE")).toBeInTheDocument();
  });

  it("quick actions navigate to existing destinations", () => {
    asRoles("Admin");
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "Review Expenses" }));
    expect(screen.getByText("XMS DASHBOARD PAGE")).toBeInTheDocument();
  });

  it("View Reports opens the role-appropriate reports page", () => {
    asRoles("AP_Executive");
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "View Reports" }));
    expect(screen.getByText("AP REPORTS PAGE")).toBeInTheDocument();
  });

  it("action-center alerts stay non-clickable when the user cannot open the destination", () => {
    asRoles("Finance_Manager"); // no AP role
    renderAt();
    expect(screen.getByText("Overdue vendor payments").closest("button")).toBeNull();
  });
});

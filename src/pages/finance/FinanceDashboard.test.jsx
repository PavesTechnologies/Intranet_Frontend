import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import FinanceDashboard from "./FinanceDashboard";
import { useAuth } from "../../contexts/AuthContext";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../utils/applicationRoutes", () => ({ isFinanceEnabled: () => true }));

const asRoles = (...roles) => {
  const upper = roles.map((r) => r.toUpperCase());
  useAuth.mockReturnValue({ hasRole: (allowed) => allowed.some((r) => upper.includes(r.toUpperCase())) });
};

beforeEach(() => vi.clearAllMocks());

describe("FinanceDashboard", () => {
  it("shows Accounts Payable to a Finance Manager", () => {
    asRoles("General", "Finance_Manager");
    render(<FinanceDashboard />, { wrapper: MemoryRouter });
    expect(screen.getByText("Accounts Payable")).toBeInTheDocument();
    expect(screen.getByText("Accounts Receivable")).toBeInTheDocument();
  });

  it("hides Accounts Payable from someone with no AP role", () => {
    asRoles("General");
    render(<FinanceDashboard />, { wrapper: MemoryRouter });
    expect(screen.queryByText("Accounts Payable")).toBeNull();
  });
});

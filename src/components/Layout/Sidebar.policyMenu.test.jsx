import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { APPLICATIONS } from "../../utils/applicationRoutes";
import { useAuth } from "../../contexts/AuthContext";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));

// Policy & Compliance sits in the Expense Management flyout, which only renders in the Finance app.
describe("Sidebar - Policy & Compliance submenu", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuth.mockReturnValue({
      user: { roles: ["ADMIN"] },
      hasRole: () => true,
      hasAnyPermission: () => true,
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar isCollapsed={false} activeApplication={APPLICATIONS.FINANCE} />
      </MemoryRouter>,
    );
    fireEvent.mouseEnter(screen.getByText("Expense Management").closest("li"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const childLink = () => screen.queryByRole("link", { name: "Policy Bundles" });

  it("stays open while the pointer moves from the parent flyout into it", () => {
    fireEvent.mouseEnter(screen.getByText("Policy & Compliance").closest("li"));
    fireEvent.mouseLeave(screen.getByText("Policy & Compliance").closest("ul"));
    expect(childLink()).not.toBeNull(); // still visible right after leaving the parent flyout

    fireEvent.mouseEnter(childLink().closest("ul"));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(childLink()).not.toBeNull();
  });

  it("does not navigate when the parent row is clicked, so its submenu stays open", () => {
    fireEvent.mouseEnter(screen.getByText("Policy & Compliance").closest("li"));
    fireEvent.click(screen.getByText("Policy & Compliance"));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(childLink()).not.toBeNull();
  });
});

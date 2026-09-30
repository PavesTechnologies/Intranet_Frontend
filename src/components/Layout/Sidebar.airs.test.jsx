import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));

// The AI Screening hover menu must only offer Settings to HR_ADMIN -
// /ai-screening/settings is HR_ADMIN-only, so for anyone else the link would
// just lead to the Unauthorized page.
const renderAs = (roles) => {
  const upper = roles.map((r) => r.toUpperCase());
  useAuth.mockReturnValue({
    user: { roles },
    hasRole: (allowed) => allowed.some((r) => upper.includes(String(r).toUpperCase())),
    hasAnyPermission: () => false,
  });
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Sidebar isCollapsed={false} />
    </MemoryRouter>,
  );
  fireEvent.mouseEnter(screen.getByText("AI Screening").closest("li"));
};

describe("Sidebar - AI Screening menu", () => {
  it("shows Settings to HR_ADMIN", () => {
    renderAs(["HR_ADMIN"]);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/ai-screening/settings");
  });

  it.each([["HR"], ["RECRUITER"], ["HIRING_MANAGER"], ["HR", "GENERAL"]])("hides Settings from %s", (...roles) => {
    renderAs(roles);
    expect(screen.getByRole("link", { name: "Pipeline" })).toBeInTheDocument(); // the menu did open
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });
});

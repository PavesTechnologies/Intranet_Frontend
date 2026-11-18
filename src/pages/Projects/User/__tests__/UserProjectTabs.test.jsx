import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../../../../api/axiosInstance", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { name: "Apollo" } }) },
}));
vi.mock("../UserSummary", () => ({ default: () => <div data-testid="tab-summary" /> }));
vi.mock("../UserBacklog/userbacklog", () => ({ default: () => <div data-testid="tab-backlog" /> }));
vi.mock("../UserBoard", () => ({ default: () => <div data-testid="tab-board" /> }));
vi.mock("../UserSprint/SprintBoard", () => ({ default: () => <div data-testid="tab-sprint" /> }));
vi.mock("../UserLists", () => ({ default: () => <div data-testid="tab-lists" /> }));

import UserProjectTabs from "../UserProjectTabs";

// UserProjectTabs is not routed in App.jsx today; this test-local route mirrors the path it navigates to.
const LocationProbe = () => <span data-testid="location">{useLocation().search}</span>;

const renderAt = (search = "") =>
  render(
    <MemoryRouter initialEntries={[`/projects/user/7${search}`]}>
      <Routes>
        <Route
          path="/projects/user/:projectId"
          element={
            <>
              <UserProjectTabs />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const previewKeys = () => Object.keys(localStorage).filter((k) => k.startsWith("pms_milestones_preview_"));

describe("UserProjectTabs", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", "t");
  });

  it("does not offer a Milestones tab to regular users", async () => {
    renderAt();
    await screen.findByText("Apollo");
    ["Summary", "Backlog", "Board", "Sprints", "Lists"].forEach((name) =>
      expect(screen.getByRole("button", { name })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /milestones/i })).not.toBeInTheDocument();
  });

  it("renders no mock milestone content and writes no preview storage for ?tab=milestones", async () => {
    renderAt("?tab=milestones");
    await screen.findByText("Apollo");
    expect(screen.queryByText(/simulate inv|reset demo/i)).not.toBeInTheDocument();
    ["summary", "backlog", "board", "sprint", "lists"].forEach((t) =>
      expect(screen.queryByTestId(`tab-${t}`)).not.toBeInTheDocument(),
    );
    expect(previewKeys()).toEqual([]);
  });

  it.each([
    ["summary", "Summary"],
    ["backlog", "Backlog"],
    ["board", "Board"],
    ["sprint", "Sprints"],
    ["lists", "Lists"],
  ])("renders the %s tab from ?tab=%s", async (tab) => {
    renderAt(`?tab=${tab}`);
    expect(await screen.findByTestId(`tab-${tab}`)).toBeInTheDocument();
    expect(previewKeys()).toEqual([]);
  });

  it("switches tabs through the navigation buttons", async () => {
    renderAt();
    expect(await screen.findByTestId("tab-summary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sprints" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?tab=sprint"));
    expect(await screen.findByTestId("tab-sprint")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lists" }));
    expect(await screen.findByTestId("tab-lists")).toBeInTheDocument();
    expect(previewKeys()).toEqual([]);
  });
});

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { roles: [] } }));
vi.mock("../../../../contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("../../../../api/axiosInstance", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { name: "Apollo" } }) },
}));

// vi.mock factories are hoisted, so the stub builder must be hoisted too and may not reference module-level React.
const stubModule = vi.hoisted(() => async (id) => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", { "data-testid": id }) };
});
vi.mock("../../Summary/Summary.jsx", () => stubModule("tab-summary"));
vi.mock("../BacklogAndSprints", () => stubModule("tab-backlog"));
vi.mock("../Board.jsx", () => stubModule("tab-board"));
vi.mock("../../Testmanagement/TestManagementHome", () => stubModule("tab-test"));
vi.mock("../riskManagement/RiskRegisterPage", () => stubModule("tab-risk"));
vi.mock("../../../../components/RiskManagement/RiskHealthModal.jsx", () => ({ default: () => null }));
vi.mock("../../../resource_management/models/RoleExpectations.jsx", () => stubModule("tab-deliverable-roles"));
vi.mock("../ProjectDemandManagement", () => stubModule("tab-demand"));
vi.mock("../project/ProjectConfigurations", () => stubModule("tab-configurations"));
vi.mock("../ProjectRoleOffManagement", () => stubModule("tab-roleoff"));
vi.mock("../Analytics/index.jsx", () => stubModule("tab-analytics"));
vi.mock("../../Milestones/index.jsx", () => stubModule("official-milestones"));

import ProjectTabs from "../ProjectTabs";

const Probe = () => <span data-testid="search">{useLocation().search}</span>;
const renderAt = (search = "") =>
  render(
    <MemoryRouter initialEntries={[`/projects/7${search}`]}>
      <Routes>
        <Route path="/projects/:projectId" element={<><ProjectTabs /><Probe /></>} />
      </Routes>
    </MemoryRouter>,
  );

const withRoles = (roles) => {
  auth.user = { roles };
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "t");
  withRoles([]);
});

// UI gating only: these tests show what the page renders for a given roles array. They do not verify what the PMS
// backend enforces on the milestone endpoints.
describe("ProjectTabs (manager page) access and navigation", () => {
  it.each([["Project_Manager"], ["Project Manager"], ["PROJECT_MANAGER"]])(
    "shows the Milestones tab and the official component for role %s",
    async (role) => {
      withRoles([role]);
      renderAt("?tab=milestones");
      expect(await screen.findByTestId("official-milestones")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Milestones" })).toBeInTheDocument();
    },
  );

  it("hides the Milestones tab and its content from other roles, including via ?tab=milestones", async () => {
    withRoles(["General"]);
    renderAt("?tab=milestones");
    expect(await screen.findByText(/available to project managers only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Milestones" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("official-milestones")).not.toBeInTheDocument();
  });

  it("treats a user with no roles array the same as a non-manager", async () => {
    auth.user = {};
    renderAt("?tab=milestones");
    expect(await screen.findByText(/available to project managers only/i)).toBeInTheDocument();
  });

  it("only shows the Resource menu to Project_Manager", async () => {
    withRoles(["General"]);
    const { unmount } = renderAt();
    await screen.findByTestId("tab-summary");
    expect(screen.queryByText(/ResourceManagement/)).not.toBeInTheDocument();
    unmount();
    withRoles(["Project_Manager"]);
    renderAt();
    await screen.findByTestId("tab-summary");
    expect(screen.getByText(/ResourceManagement/)).toBeInTheDocument();
  });

  it.each([
    ["summary", "tab-summary"],
    ["backlog", "tab-backlog"],
    ["board", "tab-board"],
    ["risk-management", "tab-risk"],
    ["analytics-burndown", "tab-analytics"],
    ["configurations", "tab-configurations"],
    ["demand-management", "tab-demand"],
    ["roleoff-management", "tab-roleoff"],
  ])("renders ?tab=%s for a project manager", async (tab, testId) => {
    withRoles(["Project_Manager"]);
    renderAt(`?tab=${tab}`);
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it("renders the main tabs for a non-manager and navigates between them", async () => {
    withRoles(["General"]);
    renderAt();
    expect(await screen.findByTestId("tab-summary")).toBeInTheDocument();
    ["Summary", "Backlog", "Board", "Risk"].forEach((n) => expect(screen.getByRole("button", { name: n })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    await waitFor(() => expect(screen.getByTestId("search")).toHaveTextContent("?tab=board"));
    expect(await screen.findByTestId("tab-board")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Backlog" }));
    expect(await screen.findByTestId("tab-backlog")).toBeInTheDocument();
  });

  it("never writes mock milestone preview storage", async () => {
    withRoles(["Project_Manager"]);
    renderAt("?tab=milestones");
    await screen.findByTestId("official-milestones");
    expect(Object.keys(localStorage).filter((k) => k.startsWith("pms_milestones_preview_"))).toEqual([]);
  });
});

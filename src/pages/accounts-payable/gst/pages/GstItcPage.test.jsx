import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import GstItcPage from "./GstItcPage";
import * as hooks from "../hooks/useGstItc";
import { useApPermissions } from "../../hooks/useApPermissions";
import { formatMoney } from "../../dashboard/components/insights";
import { LEGACY_CLAIM_LABEL } from "../../constants/gstItc";
import { setupGstHooks } from "../__fixtures__/gstFixtures";

vi.mock("../hooks/useGstItc", async () => {
  const { HOOK_NAMES } = await import("../__fixtures__/gstFixtures");
  return Object.fromEntries(HOOK_NAMES.map((n) => [n, vi.fn()]));
});
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("../../guide/components/PageGuide", () => ({ default: () => null }));
vi.mock("../../../../contexts/AuthContext", () => ({ useAuth: () => ({ user: { user_id: "fin-checker" } }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  setupGstHooks(hooks);
  useApPermissions.mockReturnValue({ canManageGstItc: true });
});

const renderPage = (url = "/accounts-payable/gst") => render(<MemoryRouter initialEntries={[url]}><GstItcPage /></MemoryRouter>);

describe("GstItcPage - monthly dashboard", () => {
  it("opens on the latest period with a GSTR-2B import and titles it from the backend", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Purchase Invoices · Oct 2026" })).toBeInTheDocument();
    expect(screen.getByLabelText("Return period")).toHaveValue("2026-10");
    expect(hooks.useGstr2bSummary).toHaveBeenCalledWith("2026-10");
  });

  it("groups the periods by financial year", () => {
    renderPage();
    const select = screen.getByLabelText("Return period");
    expect(within(select).getByRole("group", { name: "FY 2026-27" })).toBeInTheDocument();
    expect(within(select).getByRole("group", { name: "FY 2025-26" })).toBeInTheDocument();
  });

  it("reloads summary and records when the period changes", async () => {
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText("Return period"), "2026-03");
    expect(screen.getByRole("heading", { level: 1, name: "Purchase Invoices · Mar 2026" })).toBeInTheDocument();
    expect(hooks.useGstr2bSummary).toHaveBeenLastCalledWith("2026-03");
    expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(expect.objectContaining({ returnPeriod: "2026-03" }));
    expect(window.sessionStorage.getItem("ap.gst.period")).toBe("2026-03");
  });

  it("keeps a period from the URL", () => {
    renderPage("/accounts-payable/gst?period=2026-11&tab=review");
    expect(screen.getByLabelText("Return period")).toHaveValue("2026-11");
    expect(screen.getByRole("tab", { name: "ITC eligibility & approval" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows the backend's overview figures without recomputing them", () => {
    renderPage();
    const overview = screen.getByRole("heading", { name: /GST Input Credit Overview/ }).closest("section");
    expect(within(overview).getByText("Total AP invoices").nextSibling).toHaveTextContent("14");
    expect(within(overview).getByText("Missing in AP").nextSibling).toHaveTextContent("1");
    const claimedRow = within(overview).getByRole("rowheader", { name: /Claimed in GSTR-3B/ }).closest("tr");
    expect(within(claimedRow).getByText(formatMoney(48600, "INR"))).toBeInTheDocument();
    const approvedRow = within(overview).getByRole("rowheader", { name: /Approved for GSTR-3B/ }).closest("tr");
    expect(within(approvedRow).getByText("1")).toBeInTheDocument();
  });

  it("an overview tile filters the reconciliation by that status", async () => {
    renderPage("/accounts-payable/gst?tab=register");
    await userEvent.click(screen.getByRole("button", { name: /Duplicate records/ }));
    expect(screen.getByRole("tab", { name: "GSTR-2B reconciliation" })).toHaveAttribute("aria-selected", "true");
    expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(expect.objectContaining({ status: "DUPLICATE" }));
  });
});

describe("GstItcPage - claims go through recorded, verified filings", () => {
  it("has no one-click claim; the register offers recording the filing instead", async () => {
    renderPage("/accounts-payable/gst?tab=register");
    expect(screen.queryByRole("button", { name: /Mark claimed/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Record GSTR-3B filing" }));
    // the filing modal opens on the register's open return (claim_period)
    expect(screen.getByLabelText("Filing return period")).toHaveValue("2026-10");
    expect(screen.getByLabelText("ARN")).toBeInTheDocument();
  });

  it("labels legacy one-click claims and never shows an ARN for them", async () => {
    renderPage("/accounts-payable/gst?tab=review");
    expect(screen.getByText(LEGACY_CLAIM_LABEL)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Legacy claims/ }));
    expect(screen.getByText("OLD/1")).toBeInTheDocument();
    expect(screen.queryByText("WWIM/HYD/26-27/02604")).toBeNull();
  });

  it("marks system suggestions so they are not mistaken for Finance decisions", () => {
    renderPage("/accounts-payable/gst?tab=review");
    const row = screen.getByText("SUG/1").closest("tr");
    expect(within(row).getByText("System suggestion")).toBeInTheDocument();
  });

  it("opens the invoice's ITC drawer from the worklist", async () => {
    renderPage("/accounts-payable/gst?tab=review");
    const row = screen.getByText("WWIM/HYD/26-27/02604").closest("tr");
    await userEvent.click(within(row).getByRole("button", { name: "Review" }));
    expect(hooks.useItcDetail).toHaveBeenCalledWith(9);
    expect(screen.getByRole("dialog", { name: "ITC · WWIM/HYD/26-27/02604" })).toBeInTheDocument();
  });

  it("is read-only without the manage permission", () => {
    useApPermissions.mockReturnValue({ canManageGstItc: false });
    renderPage("/accounts-payable/gst?tab=register");
    expect(screen.queryByRole("button", { name: "Record GSTR-3B filing" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Record IRN" })).toBeNull();
  });
});

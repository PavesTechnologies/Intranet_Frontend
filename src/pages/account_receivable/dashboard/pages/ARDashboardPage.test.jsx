import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";

import ARDashboardPage from "./ARDashboardPage";
import {
  getBillingConfigurationStats,
  getBillingConfigurationActivity,
} from "../../services/billingConfigService";

vi.mock("../../services/billingConfigService", () => ({
  getBillingConfigurationStats: vi.fn(),
  getBillingConfigurationActivity: vi.fn(),
  getApiErrorMessage: (_err, fallback) => fallback,
}));
vi.mock("../../../../components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));
// Recharts needs real layout; chart panels have no logic worth exercising here.
vi.mock("../components/CollectionsTrendChart", () => ({ default: () => <section>trend chart</section> }));
vi.mock("../components/BillingModelChart", () => ({ default: () => <section>billing model chart</section> }));

let lastLocation;
function LocationProbe() {
  lastLocation = useLocation();
  return null;
}

const renderPage = (url = "/account-receivable/dashboard") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ARDashboardPage />
      <LocationProbe />
    </MemoryRouter>
  );

// Waits for the live billing-setup fetch to settle so state updates land inside act().
const renderLoaded = async (url) => {
  renderPage(url);
  await screen.findByText("Approved Configuration");
};

const ledger = () => screen.getByRole("table", { name: /active invoices/i });
const ledgerRows = () => within(ledger()).getAllByRole("row").slice(1);

describe("ARDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBillingConfigurationStats.mockResolvedValue({ total: 21, active: 15, draft: 3, pending: 2 });
    getBillingConfigurationActivity.mockResolvedValue([
      { configId: 7, action: "Approved Configuration", user: "Priya", time: "2026-10-12T09:30:00" },
    ]);
  });

  it("labels the financial figures as sample data and shows live activity", async () => {
    renderPage();
    const notes = screen.getAllByRole("note");
    expect(notes.some((n) => /sample data\./i.test(n.textContent))).toBe(true);
    expect(await screen.findByText("Approved Configuration")).toBeInTheDocument();
    expect(screen.getByText("Total Outstanding AR")).toBeInTheDocument();
  });

  it("uses live billing setup stats in the pipeline", async () => {
    renderPage();
    const setupStage = await screen.findByRole("link", { name: /stage 1: billing setups/i });
    expect(within(setupStage).getByText("21")).toBeInTheDocument();
    expect(within(setupStage).getByText("15 active · 3 draft")).toBeInTheDocument();
    expect(setupStage).toHaveAttribute("href", "/account-receivable/project-billing-setup/overview");
  });

  it("exposes the selected currency and period, and stores them in the URL", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const currency = screen.getByRole("group", { name: "Display currency" });
    expect(within(currency).getByRole("button", { name: /USD/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(within(currency).getByRole("button", { name: /INR/ }));
    expect(within(currency).getByRole("button", { name: /INR/ })).toHaveAttribute("aria-pressed", "true");
    expect(lastLocation.search).toContain("currency=INR");
    expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  });

  it("restores filters from the URL", async () => {
    await renderLoaded("/account-receivable/dashboard?status=OVERDUE&period=YTD");
    expect(
      within(screen.getByRole("group", { name: "Reporting period" })).getByRole("button", { name: "YTD" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(ledgerRows()).toHaveLength(2);
  });

  it("filters the ledger by status and shows an empty state with a reset", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const statusGroup = screen.getByRole("group", { name: /filter invoices by status/i });

    await user.click(within(statusGroup).getByRole("button", { name: /overdue/i }));
    expect(ledgerRows()).toHaveLength(2);

    await user.type(screen.getByRole("searchbox", { name: /search invoices/i }), "no-such-client");
    expect(screen.getByText(/no invoices match these filters/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(ledgerRows()).toHaveLength(6);
    expect(lastLocation.search).toBe("");
  });

  it("sorts ledger columns and reports the sort state", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const totalHeader = within(ledger()).getByRole("columnheader", { name: /gross total/i });
    expect(totalHeader).not.toHaveAttribute("aria-sort");

    await user.click(within(totalHeader).getByRole("button"));
    expect(totalHeader).toHaveAttribute("aria-sort", "ascending");
    expect(within(ledgerRows()[0]).getByText("INV-2025-0918")).toBeInTheDocument();

    await user.click(within(totalHeader).getByRole("button"));
    expect(totalHeader).toHaveAttribute("aria-sort", "descending");
    expect(within(ledgerRows()[0]).getByText("INV-2025-0842")).toBeInTheDocument();
  });

  it("shows an error with retry when billing data fails to load", async () => {
    const user = userEvent.setup();
    getBillingConfigurationStats.mockRejectedValueOnce(new Error("down"));
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn’t load billing setup data/i);

    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Approved Configuration")).toBeInTheDocument();
  });

  it("renders worklist items as links with visible calls to action", async () => {
    await renderLoaded();
    const link = screen.getByRole("link", { name: /3 billing setups awaiting checker approval/i });
    expect(link).toHaveAttribute("href", "/account-receivable/billing-approvals");
    expect(within(link).getByText("Open Approvals")).toBeInTheDocument();
  });
});

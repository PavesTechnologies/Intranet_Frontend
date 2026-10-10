import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import APAutomationPage from "./APAutomationPage";
import { useAutomationSettings, useAutomationStats, useRunAutomationNow, useUpdateAutomationSettings } from "../hooks/useApAutomation";

vi.mock("../hooks/useApAutomation", () => ({
  useAutomationSettings: vi.fn(),
  useAutomationStats: vi.fn(),
  useUpdateAutomationSettings: vi.fn(),
  useRunAutomationNow: vi.fn(),
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const settings = (over = {}) => ({
  enabled: false, price_tolerance_pct: "1", price_tolerance_amount: "100", quantity_tolerance: "0", require_grn: true,
  auto_approve_max_amount: "0", updated_by: null, updated_at: null, ...over,
});
const mutation = (value) => ({ mutateAsync: vi.fn().mockResolvedValue(value), isPending: false });

beforeEach(() => {
  vi.clearAllMocks();
  useAutomationSettings.mockReturnValue({ data: settings(), isLoading: false, isError: false });
  useAutomationStats.mockReturnValue({
    data: { days: 30, processed: 20, auto_approved: 6, auto_sent: 7, reviewed_not_sent: 1, exceptions: 6, touchless_rate: 65,
      top_exceptions: [{ reason: "No goods receipt (GRN)", count: 4 }, { reason: "Price variance", count: 2 }] },
  });
  useUpdateAutomationSettings.mockReturnValue(mutation(settings({ enabled: true })));
  useRunAutomationNow.mockReturnValue(mutation([{ invoice_id: 1, outcome: "AUTO_SENT" }]));
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <APAutomationPage />
    </MemoryRouter>,
  );

describe("APAutomationPage", () => {
  it("shows performance and is off by default", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "AP Automation" })).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("No goods receipt (GRN)")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Touchless PO invoices" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: /Re-check waiting invoices/ })).toBeDisabled();
    expect(screen.getByText("Every matched PO invoice is sent to its approvers.")).toBeInTheDocument();
  });

  it("switches on after confirmation", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("switch", { name: "Touchless PO invoices" }));
    await user.click(screen.getByRole("button", { name: "Switch on" }));
    expect(useUpdateAutomationSettings.mock.results[0].value.mutateAsync).toHaveBeenCalledWith({ enabled: true });
  });

  it("saves tolerances and the auto-approval limit together", async () => {
    const user = userEvent.setup();
    renderPage();
    const limit = screen.getByLabelText("Auto-approve up to");
    await user.clear(limit);
    await user.type(limit, "25000");
    expect(screen.getByText(/will skip the approval policy/)).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Goods receipt required" }));
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(useUpdateAutomationSettings.mock.results[0].value.mutateAsync).toHaveBeenCalledWith({
      price_tolerance_pct: "1", price_tolerance_amount: "100", quantity_tolerance: "0", require_grn: false, auto_approve_max_amount: "25000",
    });
  });

  it("re-checks waiting invoices when on", async () => {
    const user = userEvent.setup();
    useAutomationSettings.mockReturnValue({ data: settings({ enabled: true }), isLoading: false, isError: false });
    renderPage();
    await user.click(screen.getByRole("button", { name: /Re-check waiting invoices/ }));
    expect(useRunAutomationNow.mock.results[0].value.mutateAsync).toHaveBeenCalled();
  });
});

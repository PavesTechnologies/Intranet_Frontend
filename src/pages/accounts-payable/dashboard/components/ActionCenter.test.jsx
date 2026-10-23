import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import ActionCenter from "./ActionCenter";
import { useActionCenter } from "../hooks/useActionCenter";

vi.mock("../hooks/useActionCenter", () => ({ useActionCenter: vi.fn() }));

const action = (key, severity, title, extra = {}) => ({
  key, severity, title, area: "payments", area_label: "Payments", detail: `${title} detail`, count: 1,
  amount: null, currency_code: "INR", link: `/accounts-payable/${key}`, cta: "Open", ...extra,
});

const renderIt = (data) => {
  useActionCenter.mockReturnValue({ data, isLoading: false, isError: false });
  return render(<ActionCenter />, { wrapper: MemoryRouter });
};

const openIt = () => userEvent.click(screen.getByRole("button", { name: /What needs your attention|You're all caught up/ }));

beforeEach(() => vi.clearAllMocks());

describe("ActionCenter", () => {
  it("starts collapsed to the heading and counts, and opens on click", async () => {
    renderIt({
      summary: { critical: 1, high: 4, normal: 2 },
      actions: [action("pay", "critical", "Pay 1 overdue invoice")],
      all_clear: [], quick_actions: [{ label: "Pay invoices", link: "/accounts-payable/payments/ready", area: "payments" }],
    });
    const toggle = screen.getByRole("button", { name: /What needs your attention/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("1 urgent · 4 due soon · 2 to do");
    expect(screen.queryByRole("link", { name: /Pay 1 overdue invoice/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Pay invoices" })).toBeNull();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Pay 1 overdue invoice/ })).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByRole("link", { name: /Pay 1 overdue invoice/ })).toBeNull();
  });

  it("lists actions with severity, amount and a link to where the work is done", async () => {
    renderIt({
      base_currency: "INR",
      summary: { critical: 1, high: 1, normal: 0 },
      actions: [
        action("pay", "critical", "Pay 1 overdue invoice", { amount: 154000, cta: "Pay now", link: "/accounts-payable/payments/ready?overdue=1" }),
        action("terms", "high", "Resolve 2 payment-term exceptions"),
      ],
      all_clear: [{ area: "approvals", label: "Approvals" }],
      quick_actions: [{ label: "Pay invoices", link: "/accounts-payable/payments/ready", area: "payments" }],
    });
    expect(screen.getByText("What needs your attention")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What needs your attention/ })).toHaveTextContent("1 urgent · 1 due soon");
    await openIt();
    const row = screen.getByRole("link", { name: /Pay 1 overdue invoice/ });
    expect(row).toHaveAttribute("href", "/accounts-payable/payments/ready?overdue=1");
    expect(row).toHaveTextContent("Urgent");
    expect(row).toHaveTextContent("Pay now");
    expect(row.textContent).toMatch(/1,54,000/);
    expect(screen.getByText(/Approvals: nothing pending/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pay invoices" })).toHaveAttribute("href", "/accounts-payable/payments/ready");
  });

  it("shows six at first and the rest on request", async () => {
    const actions = Array.from({ length: 8 }, (_, i) => action(`a${i}`, "normal", `Task ${i}`));
    renderIt({ summary: { normal: 8 }, actions, all_clear: [], quick_actions: [] });
    await openIt();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    await userEvent.click(screen.getByRole("button", { name: "Show all 8" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });

  it("says all caught up when nothing is pending", async () => {
    renderIt({ summary: {}, actions: [], all_clear: [{ area: "payments", label: "Payments" }], quick_actions: [] });
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    await openIt();
    expect(screen.getByText(/Payments: nothing pending/)).toBeInTheDocument();
  });

  it("renders nothing for a user with no AP work", () => {
    const { container } = renderIt({ actions: [], all_clear: [], quick_actions: [] });
    expect(container).toBeEmptyDOMElement();
  });
});

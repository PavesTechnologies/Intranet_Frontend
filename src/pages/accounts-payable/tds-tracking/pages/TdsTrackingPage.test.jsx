import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import TdsTrackingPage from "./TdsTrackingPage";
import { useTdsTrackingList } from "../hooks/useTdsTracking";

vi.mock("../hooks/useTdsTracking", () => ({ useTdsTrackingList: vi.fn() }));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: () => ({ canViewTdsTracking: true, canUpdateTdsTracking: true }) }));

const list = { items: [], total: 0, page: 1, setPage: vi.fn(), totalPages: 1, isLoading: false, isError: false, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  useTdsTrackingList.mockReturnValue(list);
});

const renderAt = (path = "/accounts-payable/tds/tracking") => render(<TdsTrackingPage />, { wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter> });

describe("TdsTrackingPage", () => {
  it("shows paid invoices by default - deducted, deposited and filed", () => {
    renderAt();
    expect(screen.getByRole("tab", { name: "Paid" })).toHaveAttribute("aria-selected", "true");
    expect(useTdsTrackingList).toHaveBeenLastCalledWith(expect.objectContaining({ tdsStatus: "TDS_DEDUCTED,TDS_DEPOSITED,TDS_FILED" }));
  });

  it("switches to what is waiting for a challan, a filing, or not yet paid", async () => {
    renderAt();
    await userEvent.click(screen.getByRole("tab", { name: "To deposit" }));
    expect(useTdsTrackingList).toHaveBeenLastCalledWith(expect.objectContaining({ tdsStatus: "TDS_DEDUCTED" }));
    await userEvent.click(screen.getByRole("tab", { name: "To file" }));
    expect(useTdsTrackingList).toHaveBeenLastCalledWith(expect.objectContaining({ tdsStatus: "TDS_DEPOSITED" }));
    await userEvent.click(screen.getByRole("tab", { name: "Not yet paid" }));
    expect(useTdsTrackingList).toHaveBeenLastCalledWith(expect.objectContaining({ tdsStatus: "TDS_PENDING" }));
    expect(screen.getByText(/TDS is deducted when the vendor is paid/)).toBeInTheDocument();
  });

  it("explains the TDS rhythm in a guide panel", () => {
    renderAt();
    expect(screen.getByText("What you do in TDS Tracking")).toBeInTheDocument();
    expect(screen.getByText("Deposit monthly")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What is 26Q?" })).toBeInTheDocument();
  });

  it("opens the tab named in the link", () => {
    renderAt("/accounts-payable/tds/tracking?view=filed");
    expect(screen.getByRole("tab", { name: "Filed" })).toHaveAttribute("aria-selected", "true");
    expect(useTdsTrackingList).toHaveBeenLastCalledWith(expect.objectContaining({ tdsStatus: "TDS_FILED" }));
  });
});

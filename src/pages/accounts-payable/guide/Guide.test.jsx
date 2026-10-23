import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import PageGuide from "./components/PageGuide";
import ApGuidePage from "./pages/ApGuidePage";
import { useApPermissions } from "../hooks/useApPermissions";

vi.mock("../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));

const FINANCE = { canVerifyTds: true, canRecordPayment: true, canUpdateTdsTracking: true, canViewPayment: true, canViewTdsTracking: true };
const AP_EXEC = { canUploadInvoice: true, canReviewOcr: true };
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("PageGuide", () => {
  it("shows a Finance Executive their payment-side steps in Invoice Management", () => {
    useApPermissions.mockReturnValue(FINANCE);
    wrap(<PageGuide page="invoices" />);
    ["Verify TDS", "Mark ready for payment", "Pay and upload the receipt", "Deposit TDS", "File the TDS return"].forEach((step) =>
      expect(screen.getByText(step)).toBeInTheDocument());
    expect(screen.queryByText("Bring invoices in")).toBeNull();
    expect(screen.getByRole("link", { name: /Pay and upload the receipt/ })).toHaveAttribute("href", "/accounts-payable/bulk-import");
  });

  it("shows an AP Executive the intake steps instead", () => {
    useApPermissions.mockReturnValue(AP_EXEC);
    wrap(<PageGuide page="invoices" />);
    expect(screen.getByText("Bring invoices in")).toBeInTheDocument();
    expect(screen.queryByText("Verify TDS")).toBeNull();
  });

  it("explains Payment Management: ready invoices, one receipt or many", () => {
    useApPermissions.mockReturnValue(FINANCE);
    wrap(<PageGuide page="payments" />);
    expect(screen.getByText("What you do in Payment Management")).toBeInTheDocument();
    expect(screen.getByText(/Many: Upload receipts - each is matched to its invoice/)).toBeInTheDocument();
  });

  it("explains a term on click and remembers being hidden", async () => {
    useApPermissions.mockReturnValue(FINANCE);
    const { unmount } = wrap(<PageGuide page="tdsTracking" />);
    await userEvent.click(screen.getByRole("button", { name: "What is 26Q?" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("quarterly TDS return");
    await userEvent.click(screen.getByRole("button", { name: /What you do in TDS Tracking/ }));
    expect(screen.queryByText("Deposit monthly")).toBeNull();
    unmount();
    wrap(<PageGuide page="tdsTracking" />);
    expect(screen.queryByText("Deposit monthly")).toBeNull();
  });

  it("shows nothing to someone with no part on the page", () => {
    useApPermissions.mockReturnValue({});
    const { container } = wrap(<PageGuide page="payments" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ApGuidePage", () => {
  it("marks the viewer's part and lists the terms", () => {
    useApPermissions.mockReturnValue(FINANCE);
    wrap(<ApGuidePage />);
    expect(screen.getByText("How Accounts Payable works")).toBeInTheDocument();
    expect(screen.getAllByText("Your part").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Done by someone else").length).toBeGreaterThan(0);
    expect(screen.getByText("BSR code")).toBeInTheDocument();
  });
});

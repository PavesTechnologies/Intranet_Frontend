import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoiceTdsStatusCell from "./InvoiceTdsStatusCell";
import { useInvoiceTds } from "../hooks/useInvoiceTds";

vi.mock("../hooks/useInvoiceTds", () => ({ useInvoiceTds: vi.fn() }));

const renderWith = (result) => {
  useInvoiceTds.mockReturnValue({ data: undefined, error: null, isLoading: false, ...result });
  render(<InvoiceTdsStatusCell invoiceId={7} />);
};

describe("InvoiceTdsStatusCell", () => {
  it.each([
    ["VERIFIED", "TDS Verified"],
    ["DETERMINED", "Awaiting Verification"],
    ["PENDING", "Pending Determination"],
  ])("shows %s as %s", (status, label) => {
    renderWith({ data: { determination_status: status } });
    expect(screen.getByTestId("tds-status-badge")).toHaveTextContent(label);
  });

  it("treats a 404 as not yet determined", () => {
    renderWith({ error: { status: 404 } });
    expect(screen.getByTestId("tds-status-badge")).toHaveTextContent("Not Determined");
  });

  it("shows a loading state", () => {
    renderWith({ isLoading: true });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});

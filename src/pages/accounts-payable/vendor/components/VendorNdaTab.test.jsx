import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import VendorNdaTab from "./VendorNdaTab";
import { useVendorNdas } from "../hooks/useVendorCollections";
import ndaService from "../../procurement/services/ndaService";

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../hooks/useVendorCollections", () => ({ useVendorNdas: vi.fn() }));

vi.mock("../../procurement/services/ndaService", () => ({
  default: { getNdaDocumentUrl: vi.fn() },
}));

const idle = (overrides = {}) => ({
  items: [],
  count: 0,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

/** A VendorNdaDTO as the vendor-scoped endpoint returns it (no `content` in the list). */
const NDA = {
  nda_id: 31,
  vendor_id: 7,
  pr_id: 88,
  nda_required: true,
  nda_status_id: 3,
  status_code: "SENT",
  valid_from: "2026-01-01",
  valid_until: "2026-12-31",
  sent_at: "2026-02-10T09:30:00",
  signed_at: null,
  document_key: "nda/31/generated.pdf",
  signed_document_key: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.open = vi.fn();
});

describe("VendorNdaTab", () => {
  it("renders the DTO's status, dates, related PR and document action", () => {
    useVendorNdas.mockReturnValue(idle({ items: [NDA], count: 1 }));

    const { container } = render(<VendorNdaTab vendorId={7} />);
    const table = container.querySelector("table");

    expect(within(table).getByText("NDA #31")).toBeInTheDocument();
    expect(within(table).getByText("Sent")).toBeInTheDocument();
    expect(within(table).getByText("PR #88")).toBeInTheDocument();
    expect(within(table).getByText("01 Jan 2026")).toBeInTheDocument();
    expect(within(table).getByText("31 Dec 2026")).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /view/i })).toBeInTheDocument();

    // No signed copy on this record, so no Signed action is offered.
    expect(within(table).queryByRole("button", { name: /signed/i })).not.toBeInTheDocument();
  });

  it("shows the count the API reported", () => {
    useVendorNdas.mockReturnValue(idle({ items: [NDA], count: 4 }));

    render(<VendorNdaTab vendorId={7} />);

    expect(screen.getByText("NDA Documents").textContent).toContain("4");
  });

  it("opens a document through the existing short-lived NDA document URL", async () => {
    const user = userEvent.setup();
    useVendorNdas.mockReturnValue(idle({ items: [NDA], count: 1 }));
    ndaService.getNdaDocumentUrl.mockResolvedValue({ url: "https://signed.example/nda.pdf" });

    render(<VendorNdaTab vendorId={7} />);
    await user.click(screen.getByRole("button", { name: /view/i }));

    await waitFor(() =>
      expect(ndaService.getNdaDocumentUrl).toHaveBeenCalledWith(31, { signed: false }),
    );
    expect(window.open).toHaveBeenCalledWith(
      "https://signed.example/nda.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("offers the signed copy separately when the record carries one", () => {
    useVendorNdas.mockReturnValue(
      idle({ items: [{ ...NDA, signed_document_key: "nda/31/signed.pdf" }], count: 1 }),
    );

    render(<VendorNdaTab vendorId={7} />);

    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /signed/i })).toBeInTheDocument();
  });

  it("says there is no document rather than offering an action that would fail", () => {
    useVendorNdas.mockReturnValue(
      idle({ items: [{ ...NDA, document_key: null, signed_document_key: null }], count: 1 }),
    );

    render(<VendorNdaTab vendorId={7} />);

    expect(screen.getByText("No document")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view/i })).not.toBeInTheDocument();
  });

  it("treats an empty list as a normal result, not an error", () => {
    useVendorNdas.mockReturnValue(idle());

    render(<VendorNdaTab vendorId={7} />);

    expect(screen.getByText("No NDAs found for this vendor.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("shows a loading skeleton before the response lands", () => {
    useVendorNdas.mockReturnValue(idle({ isLoading: true }));

    render(<VendorNdaTab vendorId={7} />);

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText("No NDAs found for this vendor.")).not.toBeInTheDocument();
  });

  it("offers a retry when the request actually failed", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    useVendorNdas.mockReturnValue(
      idle({
        isError: true,
        error: { response: { data: { detail: "Vendor not found" } } },
        refetch,
      }),
    );

    render(<VendorNdaTab vendorId={7} />);

    expect(screen.getByText("Vendor not found")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

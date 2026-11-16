import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import VendorDocumentsTab from "./VendorDocumentsTab";
import { useVendorDocuments } from "../hooks/useVendorCollections";

vi.mock("../hooks/useVendorCollections", () => ({ useVendorDocuments: vi.fn() }));

const idle = (overrides = {}) => ({
  items: [],
  count: 0,
  countsByType: {},
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

/** VendorDocumentDTO entries exactly as the endpoint returns them. */
const PO_DOCUMENT = {
  document_type: "PURCHASE_ORDER",
  source_id: 15,
  reference: "PO-2026-0015",
  file_name: "po-15.pdf",
  url: "https://signed.example/po-15.pdf",
  url_expires_in_seconds: 900,
  document_date: "2026-03-04",
};

const NDA_DOCUMENT_WITHOUT_URL = {
  document_type: "NDA",
  source_id: 31,
  reference: null,
  file_name: "nda-31.pdf",
  url: null,
  url_expires_in_seconds: null,
  document_date: "2026-02-10T09:30:00",
};

beforeEach(() => {
  vi.clearAllMocks();
  window.open = vi.fn();
});

describe("VendorDocumentsTab", () => {
  it("renders name, type, related record, date and status from the DTO", () => {
    useVendorDocuments.mockReturnValue(idle({ items: [PO_DOCUMENT], count: 1 }));

    const { container } = render(<VendorDocumentsTab vendorId={7} />);
    const table = container.querySelector("table");

    expect(within(table).getByText("po-15.pdf")).toBeInTheDocument();
    expect(within(table).getByText("Purchase Order")).toBeInTheDocument();
    expect(within(table).getByText("PO-2026-0015")).toBeInTheDocument();
    expect(within(table).getByText("04 Mar 2026")).toBeInTheDocument();
    expect(within(table).getByText("Available")).toBeInTheDocument();
  });

  it("falls back to the source record id when the document has no reference", () => {
    useVendorDocuments.mockReturnValue(idle({ items: [NDA_DOCUMENT_WITHOUT_URL], count: 1 }));

    const { container } = render(<VendorDocumentsTab vendorId={7} />);

    expect(within(container.querySelector("table")).getByText("NDA #31")).toBeInTheDocument();
  });

  it("shows the API's counts_by_type breakdown without a second pass", () => {
    useVendorDocuments.mockReturnValue(
      idle({
        items: [PO_DOCUMENT, NDA_DOCUMENT_WITHOUT_URL],
        count: 2,
        countsByType: { PURCHASE_ORDER: 1, NDA: 1 },
      }),
    );

    render(<VendorDocumentsTab vendorId={7} />);

    expect(screen.getByText("Purchase Order: 1")).toBeInTheDocument();
    expect(screen.getByText("NDA: 1")).toBeInTheDocument();
    // Types with no documents are omitted by the backend and must not be invented here.
    expect(screen.queryByText(/Goods Receipt:/)).not.toBeInTheDocument();
  });

  it("shows the count the API reported", () => {
    useVendorDocuments.mockReturnValue(idle({ items: [PO_DOCUMENT], count: 12 }));

    render(<VendorDocumentsTab vendorId={7} />);

    expect(screen.getByText("Documents").textContent).toContain("12");
  });

  it("opens a document with its presigned url", async () => {
    const user = userEvent.setup();
    useVendorDocuments.mockReturnValue(idle({ items: [PO_DOCUMENT], count: 1 }));

    render(<VendorDocumentsTab vendorId={7} />);
    await user.click(screen.getByRole("button", { name: /view/i }));

    expect(window.open).toHaveBeenCalledWith(
      "https://signed.example/po-15.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("disables View/Download gracefully when the url is null", async () => {
    const user = userEvent.setup();
    useVendorDocuments.mockReturnValue(idle({ items: [NDA_DOCUMENT_WITHOUT_URL], count: 1 }));

    render(<VendorDocumentsTab vendorId={7} />);

    const view = screen.getByRole("button", { name: /view/i });
    const download = screen.getByRole("button", { name: /download/i });

    expect(view).toBeDisabled();
    expect(download).toBeDisabled();

    // The row is still listed — the document exists, only the link could not be minted.
    expect(screen.getByText("nda-31.pdf")).toBeInTheDocument();
    expect(screen.getByText("Link Unavailable")).toBeInTheDocument();

    await user.click(view);
    expect(window.open).not.toHaveBeenCalled();
  });

  it("treats an empty list as a normal result, not an error", () => {
    useVendorDocuments.mockReturnValue(idle());

    render(<VendorDocumentsTab vendorId={7} />);

    expect(screen.getByText("No documents found for this vendor.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("shows a loading skeleton before the response lands", () => {
    useVendorDocuments.mockReturnValue(idle({ isLoading: true }));

    render(<VendorDocumentsTab vendorId={7} />);

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
  });

  it("offers a retry when the request failed", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    useVendorDocuments.mockReturnValue(
      idle({ isError: true, error: { response: { data: { detail: "Vendor not found" } } }, refetch }),
    );

    render(<VendorDocumentsTab vendorId={7} />);

    expect(screen.getByText("Vendor not found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

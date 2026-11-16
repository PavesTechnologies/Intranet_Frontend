import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import VendorActivityCards from "./VendorActivityCards";
import {
  useVendorPurchaseOrders,
  useVendorNdas,
  useVendorGrns,
  useVendorDocuments,
} from "../hooks/useVendorCollections";

vi.mock("../hooks/useVendorCollections", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual, // keep the real sumPurchaseOrderValue — the PO total must not be mocked away
    useVendorPurchaseOrders: vi.fn(),
    useVendorNdas: vi.fn(),
    useVendorGrns: vi.fn(),
    useVendorDocuments: vi.fn(),
  };
});

const idle = (overrides = {}) => ({
  items: [],
  count: 0,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

/** The stat card whose title is `title`, so a value is asserted against the right card. */
const card = (title) => screen.getByText(title).closest("div").parentElement;

beforeEach(() => {
  vi.clearAllMocks();
  useVendorPurchaseOrders.mockReturnValue(idle());
  useVendorNdas.mockReturnValue(idle());
  useVendorGrns.mockReturnValue(idle());
  useVendorDocuments.mockReturnValue({ ...idle(), countsByType: {} });
});

describe("VendorActivityCards", () => {
  it("shows each collection's own count from the API response", () => {
    useVendorPurchaseOrders.mockReturnValue(
      idle({ count: 3, items: [{ total_amount: 1000 }, { total_amount: 2000 }, { total_amount: 500 }] }),
    );
    useVendorNdas.mockReturnValue(idle({ count: 2 }));
    useVendorGrns.mockReturnValue(idle({ count: 5 }));
    useVendorDocuments.mockReturnValue({ ...idle({ count: 9 }), countsByType: { NDA: 2 } });

    render(<VendorActivityCards vendorId={7} />);

    expect(card("Purchase Orders")).toHaveTextContent("3");
    expect(card("NDA Documents")).toHaveTextContent("2");
    expect(card("GRNs")).toHaveTextContent("5");
    expect(card("Documents")).toHaveTextContent("9");
  });

  it("trusts the response's `count` even when it differs from the page of items returned", () => {
    // The endpoints paginate (skip/limit), so count is authoritative — it is never re-derived
    // from items.length.
    useVendorPurchaseOrders.mockReturnValue(idle({ count: 120, items: [{ total_amount: 10 }] }));

    render(<VendorActivityCards vendorId={7} />);

    expect(card("Purchase Orders")).toHaveTextContent("120");
  });

  it("totals PO value from the DTO's own total_amount field", () => {
    useVendorPurchaseOrders.mockReturnValue(
      idle({
        count: 3,
        items: [
          { total_amount: 1000.5 },
          { total_amount: "2000.25" }, // decimals arrive as strings over JSON
          { total_amount: null }, // a PO with no total contributes nothing
        ],
      }),
    );

    render(<VendorActivityCards vendorId={7} />);

    expect(card("Total PO Value")).toHaveTextContent("3,000.75");
  });

  it("shows a real zero for an empty collection rather than a placeholder", () => {
    render(<VendorActivityCards vendorId={7} />);

    expect(card("Purchase Orders")).toHaveTextContent("0");
    expect(card("Total PO Value")).toHaveTextContent("0.00");
  });

  it("shows a placeholder while loading, never a stand-in number", () => {
    useVendorGrns.mockReturnValue(idle({ isLoading: true }));

    render(<VendorActivityCards vendorId={7} />);

    expect(card("GRNs")).toHaveTextContent("—");
  });

  it("does not report 0 for a collection whose request failed", () => {
    useVendorNdas.mockReturnValue(idle({ isError: true, error: new Error("boom") }));

    render(<VendorActivityCards vendorId={7} />);

    // 0 is a real answer here, so a failure must not masquerade as one.
    expect(card("NDA Documents")).toHaveTextContent("—");
    // The other cards keep working.
    expect(card("GRNs")).toHaveTextContent("0");
  });
});

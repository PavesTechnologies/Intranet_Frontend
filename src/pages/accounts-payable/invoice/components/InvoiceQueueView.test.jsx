import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import api from "../../../../api/axiosInstance";
import InvoiceQueueView from "./InvoiceQueueView";
import { QUEUE_TYPES } from "../../constants/queueTypes";

vi.mock("../../../../api/axiosInstance", () => ({
  default: { get: vi.fn() },
}));

// Not part of search/filter — kept out so the list is the only thing under test.
vi.mock("../../guide/components/PageGuide", () => ({ default: () => null }));
vi.mock("./InvoiceKpiCards", () => ({ default: () => null }));
vi.mock("./InvoiceRowActions", () => ({ default: () => null }));

// AP_EXECUTIVE: uploads, reviews OCR and sends for approval.
vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: () => ({
    canUploadInvoice: true,
    canBulkUploadInvoices: false,
    canReviewOcr: true,
    canSendForApproval: true,
  }),
}));

/** InvoiceDetailsResponse records, shaped exactly as GET /invoice-details/invoice returns them. */
const record = (overrides) => ({
  vendor_id: 10,
  inbound_document_id: null,
  currency_id: 1,
  gross_amount: "1000.00",
  discount_amount: "0.00",
  tax_amount: "0.00",
  net_amount: "1000.00",
  amount_paid: "0.00",
  po_id: null,
  payment_term_id: null,
  department_id: null,
  purchase_category_id: null,
  tds_applicable: null,
  tds_amount: null,
  payable_amount: "1000.00",
  ...overrides,
});

const RECORDS = [
  record({
    invoice_id: 1,
    invoice_number: "INV-1001",
    vendor_name: "Acme Supplies",
    invoice_type: "PO",
    invoice_date: "2026-03-05",
    due_date: "2026-04-04",
    status_code: "OCR_REVIEW_PENDING",
  }),
  record({
    invoice_id: 2,
    invoice_number: "INV-1002",
    vendor_id: 11,
    vendor_name: "Globex Corp",
    invoice_type: "NON_PO",
    invoice_date: "2026-03-20",
    due_date: "2026-04-19",
    status_code: "APPROVED",
  }),
  record({
    invoice_id: 3,
    invoice_number: "BILL-3003",
    vendor_name: "Acme Supplies",
    invoice_type: "PO",
    invoice_date: "2026-04-10",
    due_date: "2026-05-10",
    status_code: "APPROVED",
  }),
  record({
    invoice_id: 4,
    invoice_number: "INV-1004",
    vendor_id: null,
    vendor_name: null,
    invoice_type: "NON_PO",
    invoice_date: "2026-04-15",
    due_date: "2026-05-15",
    status_code: "OCR_REVIEW_PENDING",
  }),
];

const renderView = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <InvoiceQueueView title="Invoice Management" defaultQueueType={QUEUE_TYPES.ALL_INVOICES} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const invoiceNumbers = () =>
  screen
    .queryAllByRole("link")
    .map((link) => link.textContent)
    .filter((text) => /^(INV|BILL)-/.test(text));

const searchBox = () => screen.getByPlaceholderText(/search invoice/i);

/** Opens the filter select labelled `field` and picks `option`. */
const pick = async (user, field, option) => {
  const select = within(screen.getByText(field, { selector: "label" }).parentElement);
  await user.click(select.getByRole("button"));
  await user.click(screen.getByRole("option", { name: option }));
};

const loaded = async (count = RECORDS.length) =>
  waitFor(() => expect(invoiceNumbers()).toHaveLength(count));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: RECORDS });
});

describe("Invoice Management — search", () => {
  it("searches by invoice number, partially and case-insensitively", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "inv-100");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1001", "INV-1002", "INV-1004"]));

    await user.clear(searchBox());
    await user.type(searchBox(), "BiLl");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["BILL-3003"]));
  });

  it("searches by vendor name, keeping spaces typed before a pause", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "acme ");
    // Longer than the 300ms debounce, so the trimmed term reaches the filters mid-typing.
    await new Promise((resolve) => setTimeout(resolve, 450));
    await user.type(searchBox(), "SUPPLIES");

    expect(searchBox()).toHaveValue("acme SUPPLIES");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1001", "BILL-3003"]));
  });

  it("ignores surrounding whitespace and handles a record without a vendor", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "   globex   ");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1002"]));
  });

  it("shows the no-match state, and the full list again when the search is cleared", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "no-such-invoice");
    expect(await screen.findByText("No invoices match your search or filters.")).toBeInTheDocument();

    await user.clear(searchBox());
    await loaded();
  });

  it("filters the already-loaded list instead of re-downloading it per search or filter", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "acme");
    await waitFor(() => expect(invoiceNumbers()).toHaveLength(2));
    await pick(user, "Invoice Type", "PO");
    await pick(user, "Status", "Approved");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["BILL-3003"]));

    expect(api.get).toHaveBeenCalledTimes(1);
  });
});

describe("Invoice Management — filters", () => {
  it("filters by invoice type", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await pick(user, "Invoice Type", "Non-PO");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1002", "INV-1004"]));
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await pick(user, "Status", "To review");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1001", "INV-1004"]));
  });

  it("filters by invoice date and by due date", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-03-10" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-04-10" } });
    // Both ends inclusive.
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1002", "BILL-3003"]));

    // Due dates: only INV-1001 (4 Apr) falls in 10 Mar – 10 Apr.
    await pick(user, "Filter By", "Due Date");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1001"]));
  });

  it("applies several filters together with the search", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "inv");
    await pick(user, "Invoice Type", "Non-PO");
    await pick(user, "Status", "To review");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1004"]));
  });

  it("removes one filter while keeping the others and the search", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "inv");
    await pick(user, "Invoice Type", "Non-PO");
    await pick(user, "Status", "Approved");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1002"]));

    await pick(user, "Status", "All Statuses");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1002", "INV-1004"]));
    expect(searchBox()).toHaveValue("inv");
    expect(screen.getByRole("button", { name: "Non-PO" })).toBeInTheDocument();
  });

  it("Clear Filters removes every filter but keeps the search", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "acme");
    await pick(user, "Invoice Type", "PO");
    await pick(user, "Status", "Approved");
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-04-01" } });
    await waitFor(() => expect(invoiceNumbers()).toEqual(["BILL-3003"]));

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(searchBox()).toHaveValue("acme");
    expect(screen.getByRole("button", { name: /all types/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all statuses/i })).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("");
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1001", "BILL-3003"]));
  });

  it("Clear Filters is disabled when only a search is active", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "acme");
    await waitFor(() => expect(invoiceNumbers()).toHaveLength(2));
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeDisabled();
  });

  it("only offers statuses the active tab can contain, and switching tabs resets everything", async () => {
    const user = userEvent.setup();
    renderView();
    await loaded();

    await user.type(searchBox(), "inv");
    await waitFor(() => expect(invoiceNumbers()).toHaveLength(3));
    await user.click(screen.getByRole("button", { name: "To review" }));

    await waitFor(() => expect(searchBox()).toHaveValue(""));
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-1001", "INV-1004"]));

    await user.click(within(screen.getByText("Status", { selector: "label" }).parentElement).getByRole("button"));
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toContain("To review");
    expect(options).not.toContain("Approved");
    expect(options).not.toContain("Paid");
  });
});

describe("Invoice Management — pagination", () => {
  const many = Array.from({ length: 25 }, (_, i) =>
    record({
      invoice_id: 100 + i,
      invoice_number: `INV-${String(i + 1).padStart(2, "0")}`,
      vendor_name: i % 2 ? "Acme Supplies" : "Globex Corp",
      invoice_type: i % 2 ? "PO" : "NON_PO",
      invoice_date: "2026-03-01",
      due_date: "2026-04-01",
      status_code: "APPROVED",
    }),
  );

  it("pages the filtered result set and returns to page 1 when the criteria change", async () => {
    api.get.mockResolvedValue({ data: many });
    const user = userEvent.setup();
    renderView();
    await loaded(10);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(invoiceNumbers()[0]).toBe("INV-11"));

    await user.type(searchBox(), "acme");
    // 12 Acme invoices: back on page 1 with 10 of them.
    await waitFor(() => expect(invoiceNumbers()[0]).toBe("INV-02"));
    expect(invoiceNumbers()).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(invoiceNumbers()).toEqual(["INV-22", "INV-24"]));

    await pick(user, "Invoice Type", "PO");
    await waitFor(() => expect(invoiceNumbers()[0]).toBe("INV-02"));
    expect(invoiceNumbers()).toHaveLength(10);
  });
});

describe("Invoice Management — loading and errors", () => {
  it("shows the backend error", async () => {
    api.get.mockRejectedValue({ response: { status: 403, data: { detail: "Not allowed." } } });
    renderView();
    expect(await screen.findByText("Not allowed.")).toBeInTheDocument();
  });

  it("shows the queue's empty state when there are no invoices at all", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderView();
    expect(await screen.findByText("No invoices yet.")).toBeInTheDocument();
  });
});

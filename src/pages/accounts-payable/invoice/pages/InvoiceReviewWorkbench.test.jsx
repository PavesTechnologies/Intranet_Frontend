import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import InvoiceReviewWorkbenchPage, { isSelectable } from "./InvoiceReviewWorkbenchPage";
import { useBulkReviewMutation, useBulkSendMutation, useReviewWorkbench } from "../hooks/useReviewWorkbench";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import { usePurchaseCategoriesByDepartment } from "../../system-configuration/hooks/usePurchaseCategories";
import { useRecheckInvoice } from "../../automation/hooks/useApAutomation";

vi.mock("../hooks/useReviewWorkbench", () => ({
  useReviewWorkbench: vi.fn(),
  useBulkReviewMutation: vi.fn(),
  useBulkSendMutation: vi.fn(),
}));
vi.mock("../../system-configuration/hooks/useDepartments", () => ({ default: vi.fn() }));
vi.mock("../../automation/hooks/useApAutomation", () => ({ useRecheckInvoice: vi.fn() }));
vi.mock("../../system-configuration/hooks/usePurchaseCategories", () => ({ usePurchaseCategoriesByDepartment: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const ok = (key, message) => ({ key, ok: true, blocking: true, message });
const bad = (key, message, blocking = true) => ({ key, ok: false, blocking, message });
const row = (id, over = {}) => ({
  invoice_id: id,
  inbound_document_id: 500 + id,
  invoice_number: `INV-${id}`,
  vendor_id: 1,
  vendor_name: "Acme Supplies",
  invoice_type: "NON_PO",
  net_amount: 11800,
  currency_code: "INR",
  status_code: "OCR_REVIEW_PENDING",
  created_at: "2026-10-10T09:00:00Z",
  source: "MANUAL_UPLOAD",
  batch_id: 14,
  department_id: 10,
  department_name: "IT",
  purchase_category_id: 101,
  purchase_category_name: "Software",
  coding_source: "VENDOR_MAPPING",
  checks: [ok("validation", "Validation passed on upload"), ok("issues", "No open issues"), ok("coding", "IT / Software"), ok("policy", "Approval policy: IT standard")],
  ready: true,
  ...over,
});

const rows = [
  row(1),
  row(2, {
    department_id: null, department_name: null, purchase_category_id: null, purchase_category_name: null, coding_source: null,
    checks: [ok("validation", "Validation passed on upload"), ok("issues", "No open issues"), bad("coding", "Choose department and purchase category")],
    ready: false,
  }),
  row(3, { checks: [bad("validation", "Validation issues: Buyer GSTIN mismatch")], ready: false }),
];

const mutation = (value) => ({ mutateAsync: vi.fn().mockResolvedValue(value), isPending: false });
const response = { results: [{ invoice_id: 1, invoice_number: "INV-1", status: "SENT", message: "Sent for approval." }], summary: { SENT: 1, REVIEWED: 0, SKIPPED: 0, FAILED: 0 } };

beforeEach(() => {
  vi.clearAllMocks();
  useReviewWorkbench.mockReturnValue({ data: { items: rows, max_bulk: 25, can_review: true, can_send: true }, isLoading: false, isError: false });
  useBulkReviewMutation.mockReturnValue(mutation(response));
  useBulkSendMutation.mockReturnValue(mutation(response));
  useRecheckInvoice.mockReturnValue(mutation({ invoice_id: 4, outcome: "AUTO_SENT", reasons: [] }));
  useDepartments.mockReturnValue({ data: [{ id: 10, name: "IT", is_active: true }, { id: 20, name: "Finance", is_active: true }] });
  usePurchaseCategoriesByDepartment.mockImplementation((dept) => ({
    data: dept === 20 ? [{ id: 201, name: "Audit", is_active: true }] : dept === 10 ? [{ id: 101, name: "Software", is_active: true }] : [],
    isLoading: false,
  }));
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <InvoiceReviewWorkbenchPage />
    </MemoryRouter>,
  );

describe("isSelectable", () => {
  it("allows ready rows, and coding-only gaps once coding is chosen", () => {
    expect(isSelectable(rows[0])).toBe(true);
    expect(isSelectable(rows[1])).toBe(false);
    expect(isSelectable(rows[1], { department_id: 20, purchase_category_id: 201 })).toBe(true);
    expect(isSelectable(rows[2], { department_id: 20, purchase_category_id: 201 })).toBe(false);
  });
});

describe("InvoiceReviewWorkbenchPage", () => {
  it("shows suggestions and why an invoice needs a closer look", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Review & Send" })).toBeInTheDocument();
    expect(screen.getAllByText("Suggested: Vendor default").length).toBeGreaterThan(0);
    const blocked = screen.getByText("INV-3").closest("tr");
    expect(within(blocked).getByText("Validation issues: Buyer GSTIN mismatch")).toBeInTheDocument();
    expect(within(blocked).getByRole("checkbox")).toBeDisabled();
    expect(within(blocked).getByRole("button", { name: "Review" })).toBeInTheDocument();
  });

  it("reviews and sends the selected invoices with the chosen coding", async () => {
    const user = userEvent.setup();
    renderPage();
    const second = screen.getByText("INV-2").closest("tr");
    await user.selectOptions(within(second).getByLabelText("Department for INV-2"), "20");
    await user.selectOptions(within(second).getByLabelText("Category for INV-2"), "201");
    await user.click(screen.getByLabelText("Select all ready invoices"));
    await user.click(screen.getByRole("button", { name: /Review & send 2/ }));
    const call = useBulkReviewMutation.mock.results[0].value.mutateAsync.mock.calls[0][0];
    expect(call).toEqual({
      sendForApproval: true,
      items: [{ invoice_id: 1 }, { invoice_id: 2, department_id: 20, purchase_category_id: 201 }],
    });
    expect(await screen.findByText(/Result: 1 sent/)).toBeInTheDocument();
  });

  it("applies one department / category to all selected rows", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText("Select INV-1"));
    await user.selectOptions(screen.getByLabelText("Department for selected"), "20");
    await user.selectOptions(screen.getByLabelText("Category for selected"), "201");
    await user.click(screen.getByRole("button", { name: "Apply to selected" }));
    await user.click(screen.getByRole("button", { name: "Review only" }));
    const call = useBulkReviewMutation.mock.results[0].value.mutateAsync.mock.calls[0][0];
    expect(call).toEqual({ sendForApproval: false, items: [{ invoice_id: 1, department_id: 20, purchase_category_id: 201 }] });
  });

  it("hides the send action without INVOICE_SEND_FOR_APPROVAL", async () => {
    const user = userEvent.setup();
    useReviewWorkbench.mockReturnValue({ data: { items: rows, max_bulk: 25, can_review: true, can_send: false }, isLoading: false, isError: false });
    renderPage();
    await user.click(screen.getByLabelText("Select INV-1"));
    expect(screen.queryByRole("button", { name: /Review & send/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Review only" })).toBeInTheDocument();
  });
});

describe("navigation", () => {
  function Where() {
    const location = useLocation();
    return <p>at {location.pathname + location.search}</p>;
  }
  const renderRouted = () =>
    render(
      <MemoryRouter initialEntries={["/accounts-payable/invoices/review-workbench"]}>
        <Routes>
          <Route path="/accounts-payable/invoices/review-workbench" element={<InvoiceReviewWorkbenchPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

  it("goes back to Invoice Management", async () => {
    const user = userEvent.setup();
    renderRouted();
    await user.click(screen.getByRole("button", { name: /Back to Invoices/ }));
    expect(screen.getByText("at /accounts-payable/invoices")).toBeInTheDocument();
  });

  it("opens the Approval tab after sending", async () => {
    const user = userEvent.setup();
    renderRouted();
    await user.click(screen.getByLabelText("Select INV-1"));
    await user.click(screen.getByRole("button", { name: /Review & send 1/ }));
    await user.click(await screen.findByRole("button", { name: /View in Invoice Management/ }));
    expect(screen.getByText("at /accounts-payable/invoices?queue=approval")).toBeInTheDocument();
  });
});

describe("PO invoices and automation", () => {
  it("offers a re-check for a waiting PO invoice and shows the automation outcome", async () => {
    const user = userEvent.setup();
    const po = row(4, {
      invoice_type: "PO", coding_source: "PO", ready: false,
      checks: [ok("validation", "Validation passed on upload"), bad("match", "No goods receipt (GRN) recorded for this PO yet")],
      automation: { outcome: "EXCEPTION", reasons: ["No goods receipt (GRN) recorded for this PO yet"], at: "2026-10-10T10:00:00Z" },
    });
    useReviewWorkbench.mockReturnValue({ data: { items: [po], max_bulk: 25, can_review: true, can_send: true }, isLoading: false, isError: false });
    renderPage();
    const tr = screen.getByText("INV-4").closest("tr");
    expect(within(tr).getByText(/AP automation: Needs review/)).toBeInTheDocument();
    await user.click(within(tr).getByRole("button", { name: "Re-check" }));
    expect(useRecheckInvoice.mock.results[0].value.mutateAsync).toHaveBeenCalledWith(4);
  });
});

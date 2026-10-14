import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import GstItcPage from "./GstItcPage";
import * as hooks from "../hooks/useGstItc";
import { useApPermissions } from "../../hooks/useApPermissions";
import { formatMoney } from "../../dashboard/components/insights";

vi.mock("../hooks/useGstItc", () => ({
  useGstRegister: vi.fn(), useClaimItc: vi.fn(), useSetIrn: vi.fn(), useSetEligibility: vi.fn(), useReverseItc: vi.fn(), useReclaimItc: vi.fn(),
  useGstr2b: vi.fn(), useImportGstr2b: vi.fn(),
}));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const row = (extra) => ({
  invoice_id: 9, invoice_number: "WWIM/HYD/26-27/02604", invoice_date: "2026-10-09", vendor_name: "WEWORK INDIA MANAGEMENT LIMITED",
  supplier_gstin: "36AADCH8710J1ZH", supply_type: "INTRA", taxable_value: 63500, cgst: 5715, sgst: 5715, igst: 0, cess: 0, itc: 11430,
  itc_eligibility: "ELIGIBLE", eligibility_reason: null, itc_status: "PENDING", claim_period: null, irn_status: "MISSING", risk: null, ...extra,
});

const DATA = {
  summary: { claimable_now: 156331.8, claimable_count: 12, claim_period: "2026-09-01", claim_due: "2026-10-20", irn_missing: 1,
             review: 0, blocked_itc: 0, at_risk: 0, reversal_due: 0, reclaim: 0 },
  invoices: [row({ irn_status: "PRESENT", itc_status: "CLAIMED", claim_period: "2026-09-01" })],
  attention: [row()],
  periods: [{ period: "2026-10-01", label: "Oct 2026", claimed: 0, invoices: 0, due_date: "2026-11-20" }],
};

const mutate = () => ({ mutateAsync: vi.fn().mockResolvedValue({ itc: 156331.8, invoices: 12, period: "2026-09-01" }), isPending: false });

beforeEach(() => {
  vi.clearAllMocks();
  hooks.useGstRegister.mockReturnValue({ data: DATA, isLoading: false, isError: false });
  for (const name of ["useClaimItc", "useSetIrn", "useSetEligibility", "useReverseItc", "useReclaimItc"]) hooks[name].mockReturnValue(mutate());
  useApPermissions.mockReturnValue({ canManageGstItc: true });
});

const renderPage = () => render(<GstItcPage />, { wrapper: MemoryRouter });

describe("GstItcPage", () => {
  it("shows what can be claimed and by when", () => {
    renderPage();
    expect(screen.getByText(/Ready to claim for Sep 2026/)).toBeInTheDocument();
    expect(screen.getByText(formatMoney(156331.8, "INR"))).toBeInTheDocument();
    expect(screen.getByText(/12 invoice\(s\) · GSTR-3B due/)).toBeInTheDocument();
  });

  it("claims the period after confirmation", async () => {
    const claim = mutate();
    hooks.useClaimItc.mockReturnValue(claim);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Mark claimed in GSTR-3B" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm claimed" }));
    expect(claim.mutateAsync).toHaveBeenCalledWith("2026-09-01");
  });

  it("records a missing IRN only when it is 64 hex characters", async () => {
    const setIrn = mutate();
    hooks.useSetIrn.mockReturnValue(setIrn);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Record IRN" }));
    const save = screen.getByRole("button", { name: "Save" });
    await userEvent.type(screen.getByLabelText("IRN"), "abc");
    expect(save).toBeDisabled();
    await userEvent.clear(screen.getByLabelText("IRN"));
    await userEvent.type(screen.getByLabelText("IRN"), "f".repeat(64));
    await userEvent.click(save);
    expect(setIrn.mutateAsync).toHaveBeenCalledWith({ invoiceId: 9, irn: "f".repeat(64) });
  });

  it("lists the month's invoices with the GST split and claim status", () => {
    renderPage();
    expect(screen.getByText("36AADCH8710J1ZH", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Claimed · Sep 2026/)).toBeInTheDocument();
  });

  it("switches to the GSTR-2B match tab", async () => {
    hooks.useGstr2b.mockReturnValue({ data: { imports: [], period: null, entries: [], missing_in_2b: [], counts: {} }, isLoading: false, isError: false });
    hooks.useImportGstr2b.mockReturnValue(mutate());
    renderPage();
    expect(screen.getByText(/GSTR-2B not imported yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "GSTR-2B match" }));
    expect(screen.getByText(/No GSTR-2B imported yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Ready to claim/)).toBeNull();
  });

  it("is read-only without the manage permission", () => {
    useApPermissions.mockReturnValue({ canManageGstItc: false });
    renderPage();
    expect(screen.queryByRole("button", { name: "Mark claimed in GSTR-3B" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Record IRN" })).toBeNull();
  });
});

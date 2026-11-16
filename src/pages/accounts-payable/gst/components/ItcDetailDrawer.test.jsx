import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import ItcDetailDrawer from "./ItcDetailDrawer";
import * as hooks from "../hooks/useGstItc";
import { LEGACY_CLAIM_LABEL } from "../../constants/gstItc";
import { itcDetail, query, setupGstHooks } from "../__fixtures__/gstFixtures";

vi.mock("../hooks/useGstItc", async () => {
  const { HOOK_NAMES } = await import("../__fixtures__/gstFixtures");
  return Object.fromEntries(HOOK_NAMES.map((n) => [n, vi.fn()]));
});
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let m;
beforeEach(() => {
  vi.clearAllMocks();
  m = setupGstHooks(hooks);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T10:00:00"));
});
afterEach(() => vi.useRealTimers());

const renderDrawer = (detail, { canManage = true } = {}) => {
  if (detail) hooks.useItcDetail.mockReturnValue(query(detail));
  render(<MemoryRouter><ItcDetailDrawer invoiceId={9} period="2026-10" canManage={canManage} onClose={vi.fn()} /></MemoryRouter>);
};
const section = (name) => screen.getByRole("heading", { name }).closest("section");

describe("ItcDetailDrawer - eligibility review", () => {
  it("shows the system suggestion apart from Finance's decision", () => {
    renderDrawer(itcDetail({ itc_eligibility_basis: "SYSTEM_SUGGESTION", itc_eligibility_api_status: "PENDING_REVIEW",
      eligibility_suggestion: { status: "PENDING_REVIEW", reasons: ["Not reconciled with the supplier's GSTR-2B (s.16(2)(aa))"] } }));
    const s = section("ITC eligibility review");
    expect(within(s).getByText("System suggestion")).toBeInTheDocument();
    expect(within(s).getByText(/Not reconciled with the supplier/)).toBeInTheDocument();
    expect(within(s).getByText(/Not reviewed by Finance yet/)).toBeInTheDocument();
  });

  it("requires a reason and the receipt confirmation, and caps partial amounts", async () => {
    renderDrawer(itcDetail({ itc_eligibility_basis: "SYSTEM_SUGGESTION", itc_eligibility_api_status: "PENDING_REVIEW", itc_eligible: { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 } }));
    await userEvent.click(screen.getByRole("button", { name: "Review eligibility" }));
    await userEvent.selectOptions(screen.getByLabelText("Eligibility status"), "ELIGIBLE");
    const save = screen.getByRole("button", { name: "Save decision" });
    // prefilled with the invoice's GST, not with zeros
    expect(screen.getByLabelText("Eligible CGST")).toHaveValue(5715);
    await userEvent.type(screen.getByLabelText(/Reason/), "Office rent - used for business");
    expect(save).toBeDisabled(); // receipt not confirmed
    await userEvent.click(screen.getByRole("checkbox", { name: /goods \/ services were received/ }));
    expect(save).toBeEnabled();

    await userEvent.clear(screen.getByLabelText("Eligible CGST"));
    await userEvent.type(screen.getByLabelText("Eligible CGST"), "6000");
    expect(screen.getByText(/Eligible CGST cannot exceed/)).toBeInTheDocument();
    expect(save).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Eligible CGST"));
    await userEvent.type(screen.getByLabelText("Eligible CGST"), "5000");
    await userEvent.click(save);
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Save decision" }));
    expect(m.useSetEligibility.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: 9, eligibility: "ELIGIBLE", reason: "Office rent - used for business",
      eligibleAmounts: expect.objectContaining({ cgst: "5000", sgst: 5715 }),
      comments: expect.stringContaining("s.16(2)(b)"),
    }));
  });

  it("records a blocked decision without amounts", async () => {
    renderDrawer(itcDetail());
    await userEvent.click(screen.getByRole("button", { name: "Change eligibility decision" }));
    await userEvent.selectOptions(screen.getByLabelText("Eligibility status"), "BLOCKED");
    expect(screen.queryByLabelText("Eligible CGST")).toBeNull();
    await userEvent.type(screen.getByLabelText(/Reason/), "Staff lunch - s.17(5)(b)");
    await userEvent.click(screen.getByRole("button", { name: "Save decision" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Save decision" }));
    expect(m.useSetEligibility.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ eligibility: "BLOCKED", eligibleAmounts: null }));
  });

  it("does not offer eligibility changes once the credit is claimed", () => {
    renderDrawer(itcDetail({ itc_status: "CLAIMED", claim_status: "CLAIMED_IN_GSTR3B" }));
    expect(screen.queryByRole("button", { name: /eligibility/i })).toBeNull();
    expect(screen.getByText(/corrected through the next return/)).toBeInTheDocument();
  });
});

describe("ItcDetailDrawer - approval for GSTR-3B", () => {
  it("does not offer approval while eligibility is only a system suggestion", () => {
    renderDrawer(itcDetail({ itc_eligibility_basis: "SYSTEM_SUGGESTION" }));
    const s = section("Approval for GSTR-3B");
    expect(within(s).getByText("Not ready for approval")).toBeInTheDocument();
    expect(within(s).getByText(/record Finance's eligibility review first/)).toBeInTheDocument();
    expect(within(s).queryByRole("button", { name: "Approve for GSTR-3B" })).toBeNull();
  });

  it("lists the backend's blockers, e.g. not reconciled with GSTR-2B", () => {
    renderDrawer(itcDetail({ gstr2b: "MISMATCH", claim_blockers: ["GSTR2B_NOT_RECONCILED"] }));
    expect(screen.getByText("GSTR-2B differs from the books - review the match")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve for GSTR-3B" })).toBeNull();
  });

  it("approves with comments after confirmation, for the chosen period and amounts", async () => {
    renderDrawer(itcDetail());
    const s = section("Approval for GSTR-3B");
    const approve = within(s).getByRole("button", { name: "Approve for GSTR-3B" });
    expect(approve).toBeDisabled(); // comments required
    expect(screen.getByLabelText("GSTR-3B return period")).toHaveValue("2026-10");
    await userEvent.type(screen.getByLabelText("Approved IGST"), "1");
    expect(screen.getByText(/Approved IGST cannot exceed/)).toBeInTheDocument(); // eligible IGST is 0
    await userEvent.clear(screen.getByLabelText("Approved IGST"));
    await userEvent.type(screen.getByLabelText("Approved CGST"), "5000");
    await userEvent.type(within(s).getByLabelText(/Comments/), "Matched and reviewed");
    await userEvent.click(approve);
    const dialog = screen.getByRole("alertdialog", { name: "Approve for GSTR-3B?" });
    expect(dialog).toHaveTextContent(/internal approval/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Approve for GSTR-3B" }));
    expect(m.useDecideApproval.mutateAsync).toHaveBeenCalledWith({
      invoiceId: 9, decision: "APPROVE", period: "2026-10-01", comments: "Matched and reviewed",
      amounts: { igst: "", cgst: "5000", sgst: "", cess: "" },
    });
  });

  it("cannot approve twice: an approved invoice offers reset / reject / under review only", async () => {
    renderDrawer(itcDetail({ itc_approval_status: "APPROVED_FOR_GSTR3B", itc_approval_period: "2026-10-01",
      itc_approved: { igst: 0, cgst: 5715, sgst: 5715, cess: 0, total: 11430 }, claim_status: "APPROVED_FOR_GSTR3B" }));
    const s = section("Approval for GSTR-3B");
    expect(within(s).queryByRole("button", { name: "Approve for GSTR-3B" })).toBeNull();
    await userEvent.click(within(s).getByRole("button", { name: "Reset" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Reset" }));
    expect(m.useDecideApproval.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ decision: "RESET", period: null, amounts: null }));
  });

  it("is read-only without the manage permission", () => {
    renderDrawer(itcDetail(), { canManage: false });
    expect(screen.queryByRole("button", { name: "Approve for GSTR-3B" })).toBeNull();
    expect(screen.queryByRole("button", { name: /eligibility/i })).toBeNull();
  });
});

describe("ItcDetailDrawer - claim tracking and history", () => {
  it("labels a legacy one-click claim without inventing a filing", () => {
    renderDrawer(itcDetail({ itc_status: "CLAIMED", claim_status: "CLAIMED_IN_GSTR3B", claim_source: "LEGACY", claim_period: "2026-08-01" }));
    expect(screen.getAllByText(LEGACY_CLAIM_LABEL).length).toBeGreaterThan(0);
    expect(screen.getByText(/No GSTR-3B filing or ARN is on record/)).toBeInTheDocument();
    expect(screen.queryByText(/ARN [A-Z0-9]{10}/)).toBeNull();
  });

  it("shows allocations of an unverified filing as not counted yet", () => {
    renderDrawer(itcDetail({ claim_status: "APPROVED_FOR_GSTR3B", allocations: [
      { allocation_id: 1, entry_type: "CLAIM", return_period: "2026-10", filing_id: 4, filing_status: "FILED", effective: false,
        igst: 0, cgst: 5715, sgst: 5715, cess: 0, total: 11430 },
    ] }));
    const s = section("Claim tracking");
    expect(within(s).getByText("Awaiting verification")).toBeInTheDocument();
    expect(within(s).getByText("Not counted until verified")).toBeInTheDocument();
  });

  it("renders the decision history", () => {
    hooks.useItcHistory.mockReturnValue(query([
      { action: "GST_ITC_ELIGIBILITY_SET", changed_by: "fin-maker", changed_at: "2026-11-02T09:00:00Z",
        new_values: { api_status: "ELIGIBLE", reason: "Office rent", partial: true } },
      { action: "GST_ITC_APPROVED_FOR_GSTR3B", changed_by: "fin-maker", changed_at: "2026-11-03T09:00:00Z",
        new_values: { approval_period: "2026-10-01", approved: { cgst: "5715.00" }, comments: "OK to claim" } },
    ]));
    renderDrawer(itcDetail());
    const s = section("Decision history");
    expect(within(s).getByText("Eligibility decision")).toBeInTheDocument();
    expect(within(s).getByText(/ELIGIBLE · partial · Office rent/)).toBeInTheDocument();
    expect(within(s).getByText(/GSTR-3B Oct 2026/)).toBeInTheDocument();
  });
});

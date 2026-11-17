import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Gstr3bFilingsPanel from "./Gstr3bFilingsPanel";
import RecordFilingModal from "./RecordFilingModal";
import * as hooks from "../hooks/useGstItc";
import { useAuth } from "../../../../contexts/AuthContext";
import { REGISTER, itcDetail, query, registerRow, setupGstHooks } from "../__fixtures__/gstFixtures";

vi.mock("../hooks/useGstItc", async () => {
  const { HOOK_NAMES } = await import("../__fixtures__/gstFixtures");
  return Object.fromEntries(HOOK_NAMES.map((n) => [n, vi.fn()]));
});
vi.mock("../../../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let m;
beforeEach(() => {
  vi.clearAllMocks();
  m = setupGstHooks(hooks);
  useAuth.mockReturnValue({ user: { user_id: "fin-checker" } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T10:00:00"));
});
afterEach(() => vi.useRealTimers());

const renderPanel = (canManage = true) =>
  render(<MemoryRouter><Gstr3bFilingsPanel period="2026-10" canManage={canManage} onRecordFiling={vi.fn()} /></MemoryRouter>);

const openPending = async () => {
  renderPanel();
  const pending = screen.getByRole("heading", { name: /Filing verification · 1 pending/ }).closest("section");
  await userEvent.click(within(pending).getByRole("button", { name: "Oct 2026" }));
};

describe("GSTR-3B filing verification", () => {
  it("lists filings awaiting verification apart from the history", () => {
    renderPanel();
    const pending = screen.getByRole("heading", { name: /Filing verification · 1 pending/ }).closest("section");
    expect(within(pending).getByText("AA2910260012345")).toBeInTheDocument();
    expect(within(pending).queryByText("AA2909260099999")).toBeNull();
    const history = screen.getByRole("heading", { name: /filing history/ }).closest("section");
    expect(within(history).getByText("AA2909260099999")).toBeInTheDocument();
    expect(hooks.useGstr3bFilings).toHaveBeenCalledWith("2026-27");
  });

  it("lets a second Finance user verify after confirmation", async () => {
    await openPending();
    expect(screen.getByText(/not counted as claimed until it is verified/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Verify filing/ }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Verify filing" }));
    expect(m.useVerifyFiling.mutateAsync).toHaveBeenCalledWith(4);
  });

  it("does not let the user who recorded the filing verify it", async () => {
    useAuth.mockReturnValue({ user: { sub: "fin-maker" } });
    await openPending();
    expect(screen.getByText(/a different Finance user must verify it/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verify filing/ })).toBeDisabled();
  });

  it("shows the backend's refusal (e.g. maker-checker) instead of a claimed status", async () => {
    const { toast } = await import("react-toastify");
    m.useVerifyFiling.mutateAsync.mockRejectedValue({ response: { status: 403, data: { detail: "A different Finance user must verify the filing (maker-checker)" } } });
    await openPending();
    await userEvent.click(screen.getByRole("button", { name: /Verify filing/ }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Verify filing" }));
    expect(toast.error).toHaveBeenCalledWith("A different Finance user must verify the filing (maker-checker)");
  });

  it("offers no verify or record actions without the manage permission", () => {
    renderPanel(false);
    expect(screen.queryByRole("button", { name: "Record GSTR-3B filing" })).toBeNull();
  });
});

describe("RecordFilingModal", () => {
  const approved = itcDetail({ invoice_id: 9, invoice_number: "WWIM/HYD/26-27/02604", itc_approval_status: "APPROVED_FOR_GSTR3B",
    itc_approval_period: "2026-10-01", itc_approved: { igst: 0, cgst: 5715, sgst: 5715, cess: 0, total: 11430 } });

  beforeEach(() => {
    hooks.useGstRegister.mockReturnValue(query({ ...REGISTER, invoices: [registerRow({ approval_status: "APPROVED_FOR_GSTR3B", approval_period: "2026-10-01" })] }));
    hooks.useItcDetails.mockReturnValue([query(approved)]);
  });

  const renderModal = () => render(<MemoryRouter><RecordFilingModal defaultPeriod="2026-10" onClose={vi.fn()} /></MemoryRouter>);

  it("lists only credit approved for the period, with its approved amounts", () => {
    renderModal();
    expect(hooks.useItcDetails).toHaveBeenCalledWith([9]);
    const row = screen.getByText("WWIM/HYD/26-27/02604").closest("tr");
    expect(row).toHaveTextContent("11,430");
  });

  it("validates the ARN and filing date before recording", async () => {
    renderModal();
    const record = screen.getByRole("button", { name: "Record filing" });
    await userEvent.type(screen.getByLabelText("ARN"), "AB12");
    expect(screen.getByText(/10-20 letters \/ digits/)).toBeInTheDocument();
    expect(record).toBeDisabled();
    await userEvent.clear(screen.getByLabelText("ARN"));
    await userEvent.type(screen.getByLabelText("ARN"), "aa29 1026 0012345");
    await userEvent.type(screen.getByLabelText("Filing date"), "2026-10-15");
    expect(screen.getByText("On or after 2026-11-01")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Filing date"));
    await userEvent.type(screen.getByLabelText("Filing date"), "2026-11-12");
    expect(record).toBeEnabled();
  });

  it("records the filing after confirmation; default allocation is the backend's approved credit", async () => {
    m.useRecordFiling.mutateAsync.mockResolvedValue({ return_period: "2026-10", arn: "AA2910260012345" });
    renderModal();
    await userEvent.type(screen.getByLabelText("ARN"), "AA2910260012345");
    await userEvent.type(screen.getByLabelText("Filing date"), "2026-11-12");
    await userEvent.click(screen.getByRole("button", { name: "Record filing" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/a different Finance user must verify the filing/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Record filing" }));
    expect(m.useRecordFiling.mutateAsync).toHaveBeenCalledWith({
      period: "2026-10-01", filingDate: "2026-11-12", arn: "AA2910260012345", evidenceReference: "", remarks: "", nilReturn: false, allocations: null,
    });
  });

  it("records partial per-invoice allocations, capped at the approved amounts", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("radio", { name: /Enter amounts per invoice/ }));
    const cgst = screen.getByLabelText("WWIM/HYD/26-27/02604 CGST");
    await userEvent.clear(cgst);
    await userEvent.type(cgst, "6000");
    await userEvent.type(screen.getByLabelText("ARN"), "AA2910260012345");
    await userEvent.type(screen.getByLabelText("Filing date"), "2026-11-12");
    expect(screen.getByRole("button", { name: "Record filing" })).toBeDisabled();
    await userEvent.clear(cgst);
    await userEvent.type(cgst, "3000");
    await userEvent.click(screen.getByRole("button", { name: "Record filing" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Record filing" }));
    expect(m.useRecordFiling.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      allocations: [{ invoiceId: 9, amounts: expect.objectContaining({ cgst: "3000", sgst: 5715 }) }],
    }));
  });

  it("shows the backend's validation message (e.g. duplicate ARN) and keeps the form", async () => {
    m.useRecordFiling.mutateAsync.mockRejectedValue({ response: { status: 422, data: { detail: "A GSTR-3B is already recorded for Oct 2026 with ARN AA2910260012345 (filing 4)" } } });
    renderModal();
    await userEvent.type(screen.getByLabelText("ARN"), "AA2910260012345");
    await userEvent.type(screen.getByLabelText("Filing date"), "2026-11-12");
    await userEvent.click(screen.getByRole("button", { name: "Record filing" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Record filing" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/already recorded for Oct 2026/);
    expect(screen.getByLabelText("ARN")).toHaveValue("AA2910260012345");
  });
});


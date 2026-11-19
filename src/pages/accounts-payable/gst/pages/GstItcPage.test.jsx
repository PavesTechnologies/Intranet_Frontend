import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import GstItcPage from "./GstItcPage";
import * as hooks from "../hooks/useGstItc";
import { useApPermissions } from "../../hooks/useApPermissions";
import { formatMoney } from "../../dashboard/components/insights";
import { LEGACY_CLAIM_LABEL } from "../../constants/gstItc";
import { formatDate } from "../../utils/formatters";
import { WORKFLOW, itcDetail, query, setupGstHooks } from "../__fixtures__/gstFixtures";

vi.mock("../hooks/useGstItc", async () => {
  const { HOOK_NAMES } = await import("../__fixtures__/gstFixtures");
  return Object.fromEntries(HOOK_NAMES.map((n) => [n, vi.fn()]));
});
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("../../guide/components/PageGuide", () => ({ default: () => null }));
vi.mock("../../../../contexts/AuthContext", () => ({ useAuth: () => ({ user: { user_id: "fin-checker" } }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  setupGstHooks(hooks);
  useApPermissions.mockReturnValue({ canManageGstItc: true });
});

const renderPage = (url = "/accounts-payable/gst") => render(<MemoryRouter initialEntries={[url]}><GstItcPage /></MemoryRouter>);

describe("GstItcPage - monthly dashboard", () => {
  it("opens on the latest period with a GSTR-2B import and titles it from the backend", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Purchase Invoices · Oct 2026" })).toBeInTheDocument();
    expect(screen.getByLabelText("Return period")).toHaveValue("2026-10");
    expect(hooks.useGstWorkflow).toHaveBeenCalledWith("2026-10");
  });

  it("groups the periods by financial year", () => {
    renderPage();
    const select = screen.getByLabelText("Return period");
    expect(within(select).getByRole("group", { name: "FY 2026-27" })).toBeInTheDocument();
    expect(within(select).getByRole("group", { name: "FY 2025-26" })).toBeInTheDocument();
  });

  it("reloads summary and records when the period changes", async () => {
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText("Return period"), "2026-03");
    expect(screen.getByRole("heading", { level: 1, name: "Purchase Invoices · Mar 2026" })).toBeInTheDocument();
    expect(hooks.useGstr2bSummary).toHaveBeenLastCalledWith("2026-03", "OFFICIAL"); // official data unless demo is chosen
    expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(expect.objectContaining({ returnPeriod: "2026-03" }));
    expect(window.sessionStorage.getItem("ap.gst.period")).toBe("2026-03");
  });

  it("keeps a period from the URL", () => {
    renderPage("/accounts-payable/gst?period=2026-11&tab=review");
    expect(screen.getByLabelText("Return period")).toHaveValue("2026-11");
    expect(screen.getByRole("tab", { name: "ITC eligibility & approval" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows the six workflow stages with the backend's figures and highlights its next step", () => {
    renderPage();
    const overview = screen.getByRole("heading", { name: "GST ITC workflow · Oct 2026" }).closest("section");
    expect(within(overview).getByRole("status", { name: "Next step" })).toHaveTextContent("Review ITC eligibility");
    const stages = within(overview).getAllByRole("listitem");
    expect(stages.map((li) => li.querySelector("button").textContent)).toEqual([
      "1GSTR-2B upload", "2AP invoice matching", "3ITC eligibility(next step)", "4ITC approval", "5ITC register", "6GSTR-3B filing",
    ]);
    expect(stages.filter((li) => li.getAttribute("aria-current") === "step")).toEqual([stages[2]]);
    expect(stages[0]).toHaveTextContent(formatMoney(190000, "INR")); // GST in GSTR-2B, as totalled by the backend
    expect(stages[2]).toHaveTextContent(formatMoney(103500, "INR")); // eligible ITC total
    expect(stages[5]).toHaveTextContent("Not recorded");
  });

  it("off the reconciliation tab, the workflow is the only summary request", () => {
    renderPage("/accounts-payable/gst?tab=review");
    expect(hooks.useGstWorkflow).toHaveBeenCalledWith("2026-10");
    expect(hooks.useGstr2bSummary).not.toHaveBeenCalled();
  });

  it("a match group on the workflow filters the reconciliation by it", async () => {
    renderPage("/accounts-payable/gst?tab=register");
    const overview = screen.getByRole("heading", { name: /GST ITC workflow/ }).closest("section");
    await userEvent.click(within(overview).getByRole("button", { name: /Review required/ }));
    expect(screen.getByRole("tab", { name: "GSTR-2B reconciliation" })).toHaveAttribute("aria-selected", "true");
    expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(expect.objectContaining({ matchGroup: "REVIEW_REQUIRED" }));
  });
});

describe("GstItcPage - backend next_step drives the navigation", () => {
  const withStep = (nextStepCode, gstr3b) => hooks.useGstWorkflow.mockReturnValue(query({
    ...WORKFLOW, next_step: nextStepCode, gstr3b_claim: { ...WORKFLOW.gstr3b_claim, ...gstr3b },
  }));
  const nextStep = (name) => userEvent.click(within(screen.getByRole("status", { name: "Next step" })).getByRole("button", { name }));

  it("REVIEW_ELIGIBILITY opens the eligibility worklist", async () => {
    renderPage();
    await nextStep(/Review ITC eligibility/);
    expect(screen.getByRole("tab", { name: "ITC eligibility & approval" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /^Eligibility review/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("APPROVE_ITC opens the invoices ready for approval", async () => {
    withStep("APPROVE_ITC");
    renderPage();
    await nextStep(/Approve ITC/);
    expect(screen.getByRole("button", { name: /^Ready for approval/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("UPLOAD_GSTR2B opens the GSTR-2B import for a manager", async () => {
    withStep("UPLOAD_GSTR2B");
    renderPage("/accounts-payable/gst?tab=register");
    await nextStep(/Upload GSTR-2B/);
    expect(screen.getByRole("tab", { name: "GSTR-2B reconciliation" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("GSTR-2B file")).toBeInTheDocument();
  });

  it("only takes a viewer to the stage - no import", async () => {
    useApPermissions.mockReturnValue({ canManageGstItc: false });
    withStep("UPLOAD_GSTR2B");
    renderPage("/accounts-payable/gst?tab=register");
    await nextStep(/View: Upload GSTR-2B/);
    expect(screen.getByRole("tab", { name: "GSTR-2B reconciliation" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("GSTR-2B file")).toBeNull();
  });

  it("RESOLVE_RECONCILIATION (a backend step beyond the six) opens the reconciliation", async () => {
    withStep("RESOLVE_RECONCILIATION");
    renderPage("/accounts-payable/gst?tab=review");
    await nextStep(/Resolve GSTR-2B reconciliation/);
    expect(screen.getByRole("tab", { name: "GSTR-2B reconciliation" })).toHaveAttribute("aria-selected", "true");
  });

  it("RECORD_GSTR3B_FILING opens the filing form for the period", async () => {
    withStep("RECORD_GSTR3B_FILING");
    renderPage();
    await nextStep(/Record GSTR-3B filing/);
    expect(screen.getByRole("tab", { name: "GSTR-3B filings" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Filing return period")).toHaveValue("2026-10");
  });

  it("VERIFY_GSTR3B_FILING opens the recorded filing for the second user", async () => {
    withStep("VERIFY_GSTR3B_FILING", {
      filing_status: "FILED",
      filing: { filing_id: 4, arn: "AA2910260012345", filing_date: "2026-11-12", recorded_by: "fin-maker", verified_by: null, verified_at: null },
    });
    renderPage();
    await nextStep(/Verify GSTR-3B filing/);
    expect(hooks.useGstr3bFiling).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole("dialog", { name: "GSTR-3B Oct 2026" })).toBeInTheDocument();
  });

  it("COMPLETE says so and leads to the ITC register", async () => {
    withStep("COMPLETE");
    renderPage();
    expect(screen.getByRole("status", { name: "Next step" })).toHaveTextContent("Workflow completed");
    await nextStep(/View ITC register/);
    expect(screen.getByRole("tab", { name: "ITC register" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows an unknown step as returned, without inventing an action", () => {
    withStep("SOMETHING_NEW");
    renderPage();
    const status = screen.getByRole("status", { name: "Next step" });
    expect(status).toHaveTextContent("SOMETHING_NEW");
    expect(within(status).queryByRole("button")).toBeNull();
  });

  it("shows the workflow's error instead of stale figures", () => {
    hooks.useGstWorkflow.mockReturnValue(query(undefined, {
      isError: true, error: { response: { status: 503, data: { detail: "GSTR-2B tables are not migrated" } } },
    }));
    renderPage();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("GSTR-2B tables are not migrated");
    expect(screen.queryByRole("status", { name: "Next step" })).toBeNull();
  });
});

describe("GstItcPage - register, GSTR-3B and invoice position from the backend", () => {
  it("the register shows the period's balances apart: approved, claimed, reversed, remaining", () => {
    renderPage("/accounts-payable/gst?tab=register");
    const register = screen.getByRole("heading", { name: "ITC register · Oct 2026" }).closest("section");
    const row = (name) => within(register).getByRole("rowheader", { name }).closest("tr");
    expect(row(/Total ITC identified/)).toHaveTextContent(formatMoney(173700, "INR"));
    expect(row(/^Approved ITC/)).toHaveTextContent(formatMoney(11430, "INR"));
    expect(row(/^Claimed ITC/)).toHaveTextContent(formatMoney(48600, "INR"));
    expect(row(/Remaining claimable ITC/)).toHaveTextContent(formatMoney(11430, "INR"));
    expect(row(/Pending review/)).toHaveTextContent(formatMoney(18000, "INR"));
  });

  it("GSTR-3B shows the backend's Table 4 and never presents projected credit as claimed", () => {
    renderPage("/accounts-payable/gst?tab=filings");
    const claim = screen.getByRole("heading", { name: "GSTR-3B · Oct 2026" }).closest("section");
    expect(within(claim).getByText(/Projected from the credit approved/)).toBeInTheDocument();
    expect(within(claim).getByRole("rowheader", { name: /4\(C\) Net ITC available/ }).closest("tr")).toHaveTextContent(formatMoney(11430, "INR"));
    expect(within(claim).getByRole("rowheader", { name: /^Claimed/ }).closest("tr")).toHaveTextContent(formatMoney(0, "INR"));
    expect(within(claim).getByText(/Net GST payable: Not computed/)).toBeInTheDocument();
  });

  it("the invoice drawer shows the backend's ITC position, reasons and pending Finance review", async () => {
    const none = { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 };
    hooks.useItcDetail.mockReturnValue(query(itcDetail({
      itc_eligibility_basis: "SYSTEM_SUGGESTION",
      itc_position: {
        position: "PENDING_REVIEW", eligible: none, ineligible: none, already_claimed: none,
        pending_review: { igst: 0, cgst: 5715, sgst: 5715, cess: 0, total: 11430 },
        reasons: [{ position: "PENDING_REVIEW", code: "GSTR2B_NOT_CHECKED", label: "GSTR-2B of the invoice's month not imported yet (s.16(2)(aa))", detail: null, itc: 11430 }],
      },
    })));
    renderPage("/accounts-payable/gst?tab=review");
    const row = screen.getByText("WWIM/HYD/26-27/02604").closest("tr");
    await userEvent.click(within(row).getByRole("button", { name: "Review" }));
    const position = screen.getByRole("region", { name: "ITC position" });
    expect(position).toHaveTextContent("Finance review pending");
    expect(within(position).getByRole("list", { name: "Eligibility reasons" })).toHaveTextContent(/GSTR-2B of the invoice's month not imported yet/);
    const pending = within(position).getByRole("rowheader", { name: /Pending review/ }).closest("tr");
    expect(pending).toHaveTextContent(formatMoney(11430, "INR"));
  });
});

describe("GstItcPage - claims go through recorded, verified filings", () => {
  it("has no one-click claim; the register offers recording the filing instead", async () => {
    renderPage("/accounts-payable/gst?tab=register");
    expect(screen.queryByRole("button", { name: /Mark claimed/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Record GSTR-3B filing" }));
    // the filing modal opens on the register's open return (claim_period)
    expect(screen.getByLabelText("Filing return period")).toHaveValue("2026-10");
    expect(screen.getByLabelText("ARN")).toBeInTheDocument();
  });

  it("labels legacy one-click claims and never shows an ARN for them", async () => {
    renderPage("/accounts-payable/gst?tab=review");
    expect(screen.getByText(LEGACY_CLAIM_LABEL)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Legacy claims/ }));
    expect(screen.getByText("OLD/1")).toBeInTheDocument();
    expect(screen.queryByText("WWIM/HYD/26-27/02604")).toBeNull();
  });

  it("marks system suggestions so they are not mistaken for Finance decisions", () => {
    renderPage("/accounts-payable/gst?tab=review");
    const row = screen.getByText("SUG/1").closest("tr");
    expect(within(row).getByText("System suggestion")).toBeInTheDocument();
  });

  it("opens the invoice's ITC drawer from the worklist", async () => {
    renderPage("/accounts-payable/gst?tab=review");
    const row = screen.getByText("WWIM/HYD/26-27/02604").closest("tr");
    await userEvent.click(within(row).getByRole("button", { name: "Review" }));
    expect(hooks.useItcDetail).toHaveBeenCalledWith(9);
    expect(screen.getByRole("dialog", { name: "ITC · WWIM/HYD/26-27/02604" })).toBeInTheDocument();
  });

  it("is read-only without the manage permission", () => {
    useApPermissions.mockReturnValue({ canManageGstItc: false });
    renderPage("/accounts-payable/gst?tab=register");
    expect(screen.queryByRole("button", { name: "Record GSTR-3B filing" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Record IRN" })).toBeNull();
  });
});

describe("GstItcPage - AP invoice matching stage states", () => {
  const notImported = (extra = {}) => ({
    ...WORKFLOW,
    gstr2b_import: { import_status: "NOT_IMPORTED", import_id: null, available_from: "2026-12-14", documents: 0, total_gst: 0, ...extra },
    // what the backend returns before an import: every group 0, and missing_in_gstr2b 0 ("not checked", not missing)
    reconciliation: { total_records: 0, matched: 0, partially_matched: 0, unmatched: 0, review_required: 0, missing_in_gstr2b: 0,
      accepted_after_review: 0, on_hold: 0, partially_matched_tax_difference: 0 },
    next_step: "UPLOAD_GSTR2B",
  });
  const matchingStage = () => {
    const overview = screen.getByRole("heading", { name: /GST ITC workflow/ }).closest("section");
    return within(within(overview).getAllByRole("listitem")[1]);
  };

  it("before the import: awaiting GSTR-2B, the AP invoices waiting and the expected date - no zero results", () => {
    hooks.useGstWorkflow.mockReturnValue(query(notImported()));
    renderPage("/accounts-payable/gst?period=2026-11&tab=review");
    const card = matchingStage();
    expect(card.getByText("Awaiting GSTR-2B import")).toBeInTheDocument();
    expect(card.getByText(/AP invoice\(s\) awaiting reconciliation/).textContent).toBe("14 AP invoice(s) awaiting reconciliation");
    expect(card.getByText(`GSTR-2B expected from ${formatDate("2026-12-14")}`)).toBeInTheDocument();
    expect(card.getByText(/Matching starts after the GSTR-2B is imported/)).toBeInTheDocument();
    for (const label of ["Matched", "Partially matched", "Unmatched", "Review required"]) expect(card.queryByText(label)).toBeNull();
    expect(card.queryByText(/missing in GSTR-2B/)).toBeNull();
    // the count is the backend's total_ap_invoices of the period's official summary
    expect(hooks.useGstr2bSummary).toHaveBeenCalledWith("2026-11", "OFFICIAL");
  });

  it("shows no invoice count when the backend gives none, rather than inventing one", () => {
    hooks.useGstWorkflow.mockReturnValue(query(notImported()));
    hooks.useGstr2bSummary.mockReturnValue(query({ import_status: "NOT_IMPORTED" }));
    renderPage("/accounts-payable/gst?period=2026-11&tab=review");
    expect(matchingStage().queryByText(/awaiting reconciliation/)).toBeNull();
    expect(matchingStage().getByText("Awaiting GSTR-2B import")).toBeInTheDocument();
  });

  it("treats a failed import as not imported", () => {
    hooks.useGstWorkflow.mockReturnValue(query(notImported({ import_status: "FAILED", import_id: 7 })));
    renderPage("/accounts-payable/gst?tab=review");
    expect(matchingStage().getByText(/The last import failed\. Matching starts after/)).toBeInTheDocument();
  });

  it("imported without matching results: pending, not zero", () => {
    hooks.useGstWorkflow.mockReturnValue(query({ ...WORKFLOW, reconciliation: {} }));
    renderPage("/accounts-payable/gst?tab=review");
    const card = matchingStage();
    expect(card.getByText("Reconciliation pending")).toBeInTheDocument();
    expect(card.queryByText("Matched")).toBeNull();
    expect(hooks.useGstr2bSummary).not.toHaveBeenCalled();
  });

  it("requires review when the backend's next step is to resolve it; missing-in-GSTR-2B is shown apart", async () => {
    hooks.useGstWorkflow.mockReturnValue(query({ ...WORKFLOW, next_step: "RESOLVE_RECONCILIATION" }));
    renderPage("/accounts-payable/gst?tab=review");
    const card = matchingStage();
    expect(card.getByText("Requires review")).toBeInTheDocument();
    expect(card.getByText("15 GSTR-2B record(s)")).toBeInTheDocument();
    expect(card.getByRole("button", { name: /Partially matched\s*3/ })).toBeInTheDocument();
    expect(card.getByRole("button", { name: /Review required\s*2/ })).toBeInTheDocument();
    await userEvent.click(card.getByRole("button", { name: /AP invoices missing in GSTR-2B\s*1/ }));
    expect(screen.getByRole("tab", { name: "GSTR-2B reconciliation" })).toHaveAttribute("aria-selected", "true");
    expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(expect.objectContaining({ status: "MISSING_IN_GSTR2B" }));
  });

  it("reconciled once the backend has moved past matching", () => {
    renderPage("/accounts-payable/gst?tab=review"); // next_step REVIEW_ELIGIBILITY
    const card = matchingStage();
    expect(card.getByText("Reconciled")).toBeInTheDocument();
    expect(card.getByRole("button", { name: /^Matched\s*9/ })).toBeInTheDocument();
  });
});

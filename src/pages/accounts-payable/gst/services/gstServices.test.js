import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../../../../api/axiosInstance";
import gstItcService from "./gstItcService";
import gstr2bService from "./gstr2bService";

vi.mock("../../../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const BASE = "http://localhost:8000/apm/gst";

beforeEach(() => {
  vi.clearAllMocks();
  for (const m of ["get", "post", "put", "patch"]) api[m].mockResolvedValue({ data: { ok: true }, headers: {} });
});

describe("gstr2bService - routes and payloads match gstr2b_route.py", () => {
  it("reads periods, summary, matches and imports with YYYY-MM return periods", async () => {
    await gstr2bService.periods();
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/periods`, { params: {} });
    await gstr2bService.summary("2026-10");
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches/summary`, { params: { return_period: "2026-10" } });
    await gstr2bService.matches({ returnPeriod: "2026-10", status: "MISMATCHED", search: "", page: 2, pageSize: 25 });
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches`, {
      params: { return_period: "2026-10", status: "MISMATCHED", page: 2, page_size: 25 },
    });
    await gstr2bService.imports({ financialYear: "2026-27" });
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/imports`, { params: { financial_year: "2026-27" } });
  });

  it("imports with return_period and sends replace only after confirmation", async () => {
    const file = new File(["x"], "GSTR2B_102026.xlsx");
    await gstr2bService.importFile({ file, returnPeriod: "2026-10" });
    let form = api.post.mock.calls[0][1];
    expect(api.post.mock.calls[0][0]).toBe(`${BASE}/gstr2b/import`);
    expect(form.get("file")).toBe(file);
    expect(form.get("return_period")).toBe("2026-10");
    expect(form.has("replace")).toBe(false);
    expect(form.has("period")).toBe(false); // deprecated alias is not used

    await gstr2bService.importFile({ file, returnPeriod: "2026-10", replace: true });
    form = api.post.mock.calls[1][1];
    expect(form.get("replace")).toBe("true");
  });

  it("maps with a comment and never sends a status", async () => {
    await gstr2bService.mapMatch(7, { invoiceId: 40, comments: "Supplier mistyped the number" });
    expect(api.put).toHaveBeenCalledWith(`${BASE}/gstr2b/matches/7/mapping`, { invoice_id: 40, comments: "Supplier mistyped the number" });
    await gstr2bService.mapMatch(7, { invoiceId: null, comments: "Wrong invoice picked" });
    expect(api.put).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches/7/mapping`, { invoice_id: null, comments: "Wrong invoice picked" });
  });

  it("reviews with PATCH and exports as a blob", async () => {
    await gstr2bService.reviewMatch(7, { decision: "ON_HOLD", remarks: "Waiting for supplier" });
    expect(api.patch).toHaveBeenCalledWith(`${BASE}/gstr2b/matches/7/review`, { decision: "ON_HOLD", remarks: "Waiting for supplier" });
    api.get.mockResolvedValueOnce({ data: new Blob(["x"]), headers: { "content-disposition": 'attachment; filename="gstr2b_reconciliation_2026_10.csv"' } });
    const out = await gstr2bService.exportMatches({ returnPeriod: "2026-10", format: "csv" });
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches/export`, { params: { return_period: "2026-10", format: "csv" }, responseType: "blob" });
    expect(out.fileName).toBe("gstr2b_reconciliation_2026_10.csv");
  });
});

describe("gstItcService - routes and payloads match gst_itc_route.py", () => {
  it("sends partial eligibility per component with the reason", async () => {
    await gstItcService.setEligibility(9, {
      eligibility: "ELIGIBLE", reason: "Office rent - business use", eligibleAmounts: { igst: "", cgst: "500", sgst: 500, cess: null }, comments: "",
    });
    expect(api.put).toHaveBeenCalledWith(`${BASE}/itc/9/eligibility`, {
      eligibility: "ELIGIBLE", reason: "Office rent - business use", eligible_amounts: { cgst: 500, sgst: 500 }, comments: null,
    });
  });

  it("approves for a GSTR-3B period; blank amounts use the backend default", async () => {
    await gstItcService.decideApproval(9, { decision: "APPROVE", period: "2026-10-01", amounts: { igst: "", cgst: "", sgst: "", cess: "" }, comments: "Matched and eligible" });
    expect(api.post).toHaveBeenCalledWith(`${BASE}/itc/9/approval`, { decision: "APPROVE", period: "2026-10-01", amounts: null, comments: "Matched and eligible" });
  });

  it("records a filing with ARN, date and allocations, and verifies it separately", async () => {
    await gstItcService.recordFiling({
      period: "2026-10-01", filingDate: "2026-11-12", arn: "AA2910260012345", evidenceReference: "", remarks: "",
      allocations: [{ invoiceId: 9, amounts: { igst: 0, cgst: "500", sgst: "500", cess: "" } }],
    });
    expect(api.post).toHaveBeenCalledWith(`${BASE}/itc/gstr3b/filings`, {
      period: "2026-10-01", filing_date: "2026-11-12", arn: "AA2910260012345", evidence_reference: null, remarks: null,
      allocations: [{ invoice_id: 9, igst: 0, cgst: 500, sgst: 500 }], nil_return: false,
    });
    await gstItcService.verifyFiling(4);
    expect(api.post).toHaveBeenLastCalledWith(`${BASE}/itc/gstr3b/filings/4/verify`);
  });

  it("never calls /claim with the old period-only payload", async () => {
    await expect(gstItcService.claim({ period: "2026-10-01" })).rejects.toThrow(/ARN and filing date/);
    expect(api.post).not.toHaveBeenCalled();
    await gstItcService.claim({ period: "2026-10-01", arn: "AA2910260012345", filingDate: "2026-11-12" });
    expect(api.post).toHaveBeenCalledWith(`${BASE}/itc/claim`, {
      period: "2026-10-01", arn: "AA2910260012345", filing_date: "2026-11-12", evidence_reference: null, remarks: null,
    });
  });

  it("reverses and re-claims through the batch endpoints", async () => {
    await gstItcService.reverse([9], "2026-11-01", { reason: "" });
    expect(api.post).toHaveBeenCalledWith(`${BASE}/itc/reverse`, { invoice_ids: [9], period: "2026-11-01", reason: null });
    await gstItcService.reclaim([9], "2026-10-01");
    expect(api.post).toHaveBeenLastCalledWith(`${BASE}/itc/reclaim`, { invoice_ids: [9], period: "2026-10-01" });
  });
});

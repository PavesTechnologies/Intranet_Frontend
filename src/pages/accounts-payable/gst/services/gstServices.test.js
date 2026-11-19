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

    expect(form.get("import_mode")).toBe("OFFICIAL"); // the default mode, always explicit on uploads

    await gstr2bService.importFile({ file, returnPeriod: "2026-10", replace: true });
    form = api.post.mock.calls[1][1];
    expect(form.get("replace")).toBe("true");
  });

  it("previews and imports the demo template with import_mode=DEMO", async () => {
    const file = new File(["x"], "GSTR2B_Nov2026_5_Invoices_Import.xlsx");
    await gstr2bService.previewImport({ file, returnPeriod: "2026-11", importMode: "DEMO" });
    let [url, form] = api.post.mock.calls[0];
    expect(url).toBe(`${BASE}/gstr2b/import/preview`);
    expect([form.get("file"), form.get("return_period"), form.get("import_mode")]).toEqual([file, "2026-11", "DEMO"]);
    await gstr2bService.importFile({ file, returnPeriod: "2026-11", importMode: "DEMO" });
    [url, form] = api.post.mock.calls[1];
    expect(url).toBe(`${BASE}/gstr2b/import`);
    expect(form.get("import_mode")).toBe("DEMO");
  });

  it("reads demo data only when asked for, and the history of both modes", async () => {
    await gstr2bService.summary("2026-11", "DEMO");
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches/summary`, { params: { return_period: "2026-11", import_mode: "DEMO" } });
    await gstr2bService.summary("2026-11", "OFFICIAL");
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches/summary`, { params: { return_period: "2026-11" } });
    await gstr2bService.matches({ returnPeriod: "2026-11", importMode: "DEMO" });
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches`, {
      params: { return_period: "2026-11", page: 1, page_size: 25, import_mode: "DEMO" },
    });
    await gstr2bService.imports({ financialYear: "2026-27", importMode: "ALL" });
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/imports`, { params: { financial_year: "2026-27", import_mode: "ALL" } });
    api.get.mockResolvedValueOnce({ data: new Blob(["x"]), headers: {} });
    const out = await gstr2bService.exportMatches({ returnPeriod: "2026-11", format: "csv", importMode: "DEMO" });
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches/export`, {
      params: { return_period: "2026-11", format: "csv", import_mode: "DEMO" }, responseType: "blob",
    });
    expect(out.fileName).toBe("gstr2b_DEMO_reconciliation_2026_11.csv");
    await gstr2bService.demoTemplate();
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/template/demo`, { responseType: "blob" });
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

describe("simplified workflow contract", () => {
  it("reads GET /itc/workflow with the YYYY-MM return period", async () => {
    await gstItcService.workflow("2026-11");
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/itc/workflow`, { params: { return_period: "2026-11" } });
  });

  it("filters GET /gstr2b/matches by match_group (and keeps the detailed status filter)", async () => {
    await gstr2bService.matches({ returnPeriod: "2026-11", matchGroup: "PARTIALLY_MATCHED" });
    expect(api.get).toHaveBeenLastCalledWith(`${BASE}/gstr2b/matches`, {
      params: { return_period: "2026-11", match_group: "PARTIALLY_MATCHED", page: 1, page_size: 25 },
    });
    await gstr2bService.matches({ returnPeriod: "2026-11", status: "MISMATCHED", matchGroup: "PARTIALLY_MATCHED" });
    expect(api.get.mock.calls.at(-1)[1].params).toMatchObject({ status: "MISMATCHED", match_group: "PARTIALLY_MATCHED" });
  });

  it("re-matching refreshes only the selected period's queries", async () => {
    const { isPeriodQuery, GST_ITC_KEY, GSTR2B_KEY } = await vi.importActual("../hooks/useGstItc");
    const key = (...k) => [...GST_ITC_KEY, ...k];
    expect(isPeriodQuery(key("workflow", "2026-10"), "2026-10")).toBe(true);
    expect(isPeriodQuery([...GSTR2B_KEY, "matches", "2026-10", "", "", "", 1, 25, "OFFICIAL"], "2026-10")).toBe(true);
    expect(isPeriodQuery(key("register", "2026-10-01"), "2026-10")).toBe(true);
    expect(isPeriodQuery(key("workflow", "2026-09"), "2026-10")).toBe(false);
    expect(isPeriodQuery([...GSTR2B_KEY, "imports", "", "2026-27", "ALL"], "2026-10")).toBe(false);
    expect(isPeriodQuery(["accountsPayable", "invoices", "2026-10"], "2026-10")).toBe(false);
  });
});

describe("after a GSTR-2B import the period's workflow and reconciliation are refreshed", () => {
  it("invalidates the workflow and the period's summary", async () => {
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
    const { renderHook, act } = await import("@testing-library/react");
    const React = await import("react");
    const { useImportGstr2b, GST_ITC_KEY, GSTR2B_KEY } = await vi.importActual("../hooks/useGstItc");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData([...GST_ITC_KEY, "workflow", "2026-11"], { next_step: "UPLOAD_GSTR2B" });
    client.setQueryData([...GSTR2B_KEY, "summary", "2026-11", "OFFICIAL"], { import_status: "NOT_IMPORTED" });
    api.post.mockResolvedValue({ data: { import_id: 9, return_period: "2026-11" } });
    const wrapper = ({ children }) => React.createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useImportGstr2b(), { wrapper });
    await act(() => result.current.mutateAsync({ file: new File(["x"], "g.xlsx"), returnPeriod: "2026-11" }));
    expect(client.getQueryState([...GST_ITC_KEY, "workflow", "2026-11"]).isInvalidated).toBe(true);
    expect(client.getQueryState([...GSTR2B_KEY, "summary", "2026-11", "OFFICIAL"]).isInvalidated).toBe(true);
  });
});

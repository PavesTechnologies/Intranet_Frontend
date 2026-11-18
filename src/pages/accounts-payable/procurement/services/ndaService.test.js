import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../../../../api/axiosInstance";
import ndaService from "./ndaService";

vi.mock("../../../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const pdf = () => new File(["%PDF-1.4"], "Updated_NDA.pdf", { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  api.post.mockResolvedValue({ data: { nda_id: 77, status_code: "PENDING" } });
  api.get.mockResolvedValue({ data: { vendor_id: 9, count: 0, active: [], versions: [] } });
});

describe("ndaService.replaceNda", () => {
  it("posts multipart to the vendor replace endpoint without a manual Content-Type", async () => {
    const file = pdf();
    const result = await ndaService.replaceNda(9, { file, ndaId: 55, reason: "Legal update" });

    expect(result).toEqual({ nda_id: 77, status_code: "PENDING" });
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe("http://localhost:8000/apm/nda/vendor/9/replace");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("file")).toBe(file);
    expect(body.get("nda_id")).toBe("55");
    expect(body.get("reason")).toBe("Legal update");
    expect(config.headers?.["Content-Type"]).toBeUndefined();
  });

  it("sends only the NDA id when one is known — never a scope that could hit another NDA", async () => {
    await ndaService.replaceNda(9, {
      file: pdf(),
      ndaId: 55,
      departmentId: 3,
      purchaseCategoryId: 4,
    });

    const body = api.post.mock.calls[0][1];
    expect(body.get("nda_id")).toBe("55");
    expect(body.has("department_id")).toBe(false);
    expect(body.has("purchase_category_id")).toBe(false);
  });

  it("falls back to the department/category scope when there is no NDA id", async () => {
    await ndaService.replaceNda(9, { file: pdf(), departmentId: 3, purchaseCategoryId: 4 });

    const body = api.post.mock.calls[0][1];
    expect(body.has("nda_id")).toBe(false);
    expect(body.get("department_id")).toBe("3");
    expect(body.get("purchase_category_id")).toBe("4");
    expect(body.has("reason")).toBe(false);
  });

  it("reports upload progress as a percentage", async () => {
    const onUploadProgress = vi.fn();
    await ndaService.replaceNda(9, { file: pdf(), ndaId: 55 }, { onUploadProgress });

    api.post.mock.calls[0][2].onUploadProgress({ loaded: 50, total: 200 });
    expect(onUploadProgress).toHaveBeenCalledWith(25);
  });
});

describe("ndaService.replaceSignedDocument", () => {
  it("PUTs multipart with file, vendor_id and reason, leaving Content-Type to the browser", async () => {
    api.put.mockResolvedValue({ data: { nda_id: 55, status_code: "SIGNED" } });
    const file = pdf();

    const result = await ndaService.replaceSignedDocument(55, {
      file,
      vendorId: 9,
      reason: "Wrong page",
    });

    expect(result).toEqual({ nda_id: 55, status_code: "SIGNED" });
    const [url, body, config] = api.put.mock.calls[0];
    expect(url).toBe("http://localhost:8000/apm/nda/55/signed-document");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("file")).toBe(file);
    expect(body.get("vendor_id")).toBe("9");
    expect(body.get("reason")).toBe("Wrong page");
    expect(config?.headers?.["Content-Type"]).toBeUndefined();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("omits an empty reason", async () => {
    api.put.mockResolvedValue({ data: {} });
    await ndaService.replaceSignedDocument(55, { file: pdf(), vendorId: 9 });
    expect(api.put.mock.calls[0][1].has("reason")).toBe(false);
  });
});

describe("ndaService.uploadSignedDocument (unchanged POST)", () => {
  it("still POSTs only the file", async () => {
    const file = pdf();
    await ndaService.uploadSignedDocument(55, file);
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe("http://localhost:8000/apm/nda/55/signed-document");
    expect([...body.keys()]).toEqual(["file"]);
  });
});

describe("ndaService.getVendorNdaHistory", () => {
  it("reads the vendor history endpoint", async () => {
    await ndaService.getVendorNdaHistory(9);
    expect(api.get.mock.calls[0][0]).toBe("http://localhost:8000/apm/nda/vendor/9/history");
  });
});

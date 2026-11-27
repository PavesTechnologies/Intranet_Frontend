import { describe, it, expect } from "vitest";
import {
  canVerifyNdaRecord,
  ndaDocumentNameOf,
  ndaScopeLabelOf,
  normalizeNdaHistory,
} from "./ndaHistory";

describe("normalizeNdaHistory", () => {
  it("handles a vendor with no NDA history", () => {
    expect(normalizeNdaHistory(undefined)).toEqual({ active: [], history: [], count: 0 });
    expect(normalizeNdaHistory({ vendor_id: 9, count: 0, active: [], versions: [] })).toEqual({
      active: [],
      history: [],
      count: 0,
    });
  });

  it("flags active versions from the backend's active list and sorts newest first", () => {
    const result = normalizeNdaHistory({
      vendor_id: 9,
      count: 2,
      active: [{ nda_id: 2, version: 2, status_code: "PENDING" }],
      versions: [
        { nda_id: 1, version: 1, status_code: "COMPLETED" },
        { nda_id: 2, version: 2, status_code: "PENDING" },
      ],
    });

    expect(result.active.map((r) => r.nda_id)).toEqual([2]);
    expect(result.history.map((r) => [r.nda_id, r.is_active])).toEqual([
      [2, true],
      [1, false],
    ]);
  });

  it("keeps several active NDAs, one per scope", () => {
    const result = normalizeNdaHistory({
      active: [
        { nda_id: 5, department_id: 3, purchase_category_id: 4 },
        { nda_id: 6, department_id: 7, purchase_category_id: 8 },
      ],
      versions: [],
    });
    expect(result.active).toHaveLength(2);
    expect(result.history).toHaveLength(2);
  });

  it("accepts a single active object", () => {
    expect(normalizeNdaHistory({ active: { nda_id: 3 }, versions: [] }).active).toHaveLength(1);
  });
});

describe("history record helpers", () => {
  it("never derives a document name from the storage key", () => {
    expect(ndaDocumentNameOf({ document_key: "nda/55/secret.pdf" })).toBeNull();
    expect(ndaDocumentNameOf({ document_name: "Updated_NDA.pdf" })).toBe("Updated_NDA.pdf");
  });

  it("labels company-wide only when both scope fields are explicitly empty", () => {
    expect(ndaScopeLabelOf({ department_id: null, purchase_category_id: null })).toBe(
      "Company-wide",
    );
    expect(ndaScopeLabelOf({ nda_id: 1 })).toBeNull();
    expect(
      ndaScopeLabelOf({ department_name: "Engineering", purchase_category_name: "IT Services" }),
    ).toBe("Engineering · IT Services");
  });

  it("allows verification only on an active, pending replacement", () => {
    expect(canVerifyNdaRecord({ is_active: true, status_code: "PENDING", version: 2 })).toBe(true);
    expect(canVerifyNdaRecord({ is_active: true, status_code: "PENDING", version: 1 })).toBe(false);
    expect(canVerifyNdaRecord({ is_active: false, status_code: "PENDING", version: 2 })).toBe(false);
    expect(canVerifyNdaRecord({ is_active: true, status_code: "COMPLETED", version: 2 })).toBe(
      false,
    );
  });
});

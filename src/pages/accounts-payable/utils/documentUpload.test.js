import { describe, it, expect, vi, afterEach } from "vitest";
import { openBlobInNewTab, viewableBlob } from "./documentUpload";

describe("viewableBlob", () => {
  it("gives a generic blob its real type from the file name so it opens instead of downloading", () => {
    expect(viewableBlob(new Blob(["%PDF"], { type: "application/octet-stream" }), "receipt-546.pdf").type).toBe("application/pdf");
    expect(viewableBlob(new Blob(["x"]), "scan.JPG").type).toBe("image/jpeg");
    expect(viewableBlob(new Blob(["x"], { type: "binary/octet-stream" }), "page.tiff").type).toBe("image/tiff");
  });

  it("keeps a blob that already has a type, or an unknown extension", () => {
    const pdf = new Blob(["x"], { type: "application/pdf" });
    expect(viewableBlob(pdf, "file.png")).toBe(pdf);
    const unknown = new Blob(["x"], { type: "application/octet-stream" });
    expect(viewableBlob(unknown, "archive.zip")).toBe(unknown);
    expect(viewableBlob(unknown)).toBe(unknown);
  });
});

describe("openBlobInNewTab", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens the typed blob in a new tab", () => {
    const created = [];
    globalThis.URL.createObjectURL = vi.fn((blob) => {
      created.push(blob);
      return "blob:1";
    });
    globalThis.URL.revokeObjectURL = vi.fn();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    openBlobInNewTab(new Blob(["%PDF"], { type: "application/octet-stream" }), "receipt.pdf");
    expect(created[0].type).toBe("application/pdf");
    expect(open).toHaveBeenCalledWith("blob:1", "_blank", "noopener,noreferrer");
  });
});

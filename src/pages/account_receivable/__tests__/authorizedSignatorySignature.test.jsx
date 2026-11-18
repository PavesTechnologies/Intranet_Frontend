import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import InvoicePreviewDocument from "../components/invoice/InvoicePreviewDocument";
import {
  validateSignatureImageFile,
  normalizeCompanyProfile,
  uploadCompanyProfileSignature,
  deleteCompanyProfileSignature,
  getCompanyProfileSignature,
  fetchSignatureAssetBlob,
} from "../services/companyProfileService";
import { normalizeInvoice } from "../services/invoiceService";
import { useSignatureImage } from "../hooks/useSignatureImage";
import api from "../../../api/axiosInstance";

// Mock axios instance
vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("AR Authorized Signatory Signature Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Upload and Image Format Validation", () => {
    it("accepts valid PNG and JPG image files within the 2MB size limit", () => {
      const validPng = new File(["dummy png content"], "signature.png", {
        type: "image/png",
      });
      const validJpg = new File(["dummy jpg content"], "signature.jpg", {
        type: "image/jpeg",
      });

      expect(validateSignatureImageFile(validPng)).toEqual({
        valid: true,
        error: null,
      });
      expect(validateSignatureImageFile(validJpg)).toEqual({
        valid: true,
        error: null,
      });
    });

    it("rejects unsupported file formats such as PDF, SVG, or plain text", () => {
      const pdfFile = new File(["%PDF-1.4"], "document.pdf", {
        type: "application/pdf",
      });
      const svgFile = new File(["<svg></svg>"], "image.svg", {
        type: "image/svg+xml",
      });
      const textFile = new File(["text"], "notes.txt", {
        type: "text/plain",
      });

      const pdfRes = validateSignatureImageFile(pdfFile);
      expect(pdfRes.valid).toBe(false);
      expect(pdfRes.error).toMatch(/PNG and JPG\/JPEG/i);

      const svgRes = validateSignatureImageFile(svgFile);
      expect(svgRes.valid).toBe(false);

      const txtRes = validateSignatureImageFile(textFile);
      expect(txtRes.valid).toBe(false);
    });

    it("rejects oversized signature files exceeding 2 MB", () => {
      const oversizedBlob = new Blob([new Uint8Array(2.5 * 1024 * 1024)]);
      const oversizedFile = new File([oversizedBlob], "large_signature.png", {
        type: "image/png",
      });

      const result = validateSignatureImageFile(oversizedFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/2 MB limit/i);
    });

    it("rejects null or missing file", () => {
      expect(validateSignatureImageFile(null).valid).toBe(false);
      expect(validateSignatureImageFile(undefined).valid).toBe(false);
    });
  });

  describe("2. Company Profile & Invoice Service Persistence Mapping", () => {
    it("normalizes signatureReference in CompanyProfile DTO correctly", () => {
      const rawProfile = {
        id: "cp-101",
        legalName: "Paves Technologies Pvt Ltd",
        signatureReference: "https://storage.enterprise.local/signatures/auth-sig-1.png",
      };

      const normalized = normalizeCompanyProfile(rawProfile);
      expect(normalized.signatureReference).toBe(
        "https://storage.enterprise.local/signatures/auth-sig-1.png"
      );
      expect(normalized.signatureUrl).toBe(
        "https://storage.enterprise.local/signatures/auth-sig-1.png"
      );
    });

    it("handles alternative backend DTO field names for signature reference", () => {
      const rawWithSnakeCase = {
        id: "cp-102",
        legalName: "Paves Technologies Pvt Ltd",
        signature_reference: "/media/signatures/corp_sign.png",
      };

      const normalized = normalizeCompanyProfile(rawWithSnakeCase);
      expect(normalized.signatureReference).toBe("/media/signatures/corp_sign.png");
    });

    it("normalizes sellerSignatureReference on Invoice DTO correctly", () => {
      const rawInvoice = {
        invoiceId: "inv-901",
        invoiceNumber: "INV-2026-0001",
        sellerSignatureReference: "https://storage.enterprise.local/signatures/historical-sig.png",
      };

      const normalized = normalizeInvoice(rawInvoice);
      expect(normalized.sellerSignatureReference).toBe(
        "https://storage.enterprise.local/signatures/historical-sig.png"
      );
      expect(normalized.sellerInfo.signatureUrl).toBe(
        "https://storage.enterprise.local/signatures/historical-sig.png"
      );
    });
  });

  describe("3. Dedicated Backend API Service Integrations", () => {
    it("calls PUT /api/v1/company-profile/{id}/signature with multipart FormData 'file'", async () => {
      api.put.mockResolvedValueOnce({
        data: { success: true, data: { signatureReference: "sig_123.png" } },
      });

      const file = new File(["valid image"], "sig.png", { type: "image/png" });
      const res = await uploadCompanyProfileSignature("cp-100", file);

      expect(api.put).toHaveBeenCalledTimes(1);
      const [url, formData] = api.put.mock.calls[0];
      expect(url).toContain("/api/v1/company-profile/cp-100/signature");
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get("file")).toBe(file);
      expect(res).toEqual({ signatureReference: "sig_123.png" });
    });

    it("calls DELETE /api/v1/company-profile/{id}/signature on removal", async () => {
      api.delete.mockResolvedValueOnce({
        data: { success: true, message: "Signature deleted" },
      });

      const res = await deleteCompanyProfileSignature("cp-100");

      expect(api.delete).toHaveBeenCalledTimes(1);
      const [url] = api.delete.mock.calls[0];
      expect(url).toContain("/api/v1/company-profile/cp-100/signature");
      expect(res).toEqual({ success: true, message: "Signature deleted" });
    });

    it("calls GET /api/v1/company-profile/{id}/signature to retrieve signature metadata", async () => {
      api.get.mockResolvedValueOnce({
        data: { success: true, data: { signatureReference: "sig_ref_99.png" } },
      });

      const res = await getCompanyProfileSignature("cp-100");

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/company-profile/cp-100/signature")
      );
      expect(res).toEqual({ signatureReference: "sig_ref_99.png" });
    });

    it("calls GET /api/v1/company-profile/signature-assets/{ref} with responseType blob", async () => {
      const dummyBlob = new Blob(["image data"], { type: "image/png" });
      api.get.mockResolvedValueOnce({ data: dummyBlob });

      const res = await fetchSignatureAssetBlob("sig_asset_001.png");

      expect(api.get).toHaveBeenCalledTimes(1);
      const [url, config] = api.get.mock.calls[0];
      expect(url).toContain("/api/v1/company-profile/signature-assets/sig_asset_001.png");
      expect(config).toEqual({ responseType: "blob" });
      expect(res).toBe(dummyBlob);
    });

    it("supports signature replacement by uploading a new image file over an existing reference", async () => {
      api.put.mockResolvedValueOnce({
        data: { success: true, data: { signatureReference: "replaced_sig_456.png" } },
      });

      const newFile = new File(["replacement image"], "new_sig.png", { type: "image/png" });
      const res = await uploadCompanyProfileSignature("cp-100", newFile);

      expect(api.put).toHaveBeenCalledTimes(1);
      const [url, formData] = api.put.mock.calls[0];
      expect(url).toContain("/api/v1/company-profile/cp-100/signature");
      expect(formData.get("file")).toBe(newFile);
      expect(res.signatureReference).toBe("replaced_sig_456.png");
    });

    it("propagates 401 Unauthorized when auth token is missing or expired during upload", async () => {
      const authError = new Error("Request failed with status code 401");
      authError.response = { status: 401, data: { message: "Unauthorized - Token expired or invalid" } };
      api.put.mockRejectedValueOnce(authError);

      const file = new File(["valid image"], "sig.png", { type: "image/png" });
      await expect(uploadCompanyProfileSignature("cp-100", file)).rejects.toThrow();
    });

    it("propagates 403 Forbidden when user lacks FINANCE_EXECUTIVE role on upload or deletion", async () => {
      const forbiddenError = new Error("Request failed with status code 403");
      forbiddenError.response = { status: 403, data: { message: "Access Denied: Requires FINANCE_EXECUTIVE authority" } };
      api.put.mockRejectedValueOnce(forbiddenError);

      const file = new File(["valid image"], "sig.png", { type: "image/png" });
      await expect(uploadCompanyProfileSignature("cp-100", file)).rejects.toThrow();

      api.delete.mockRejectedValueOnce(forbiddenError);
      await expect(deleteCompanyProfileSignature("cp-100")).rejects.toThrow();
    });

    it("propagates 401 Unauthorized when fetching protected signature asset fails", async () => {
      const unauthorizedError = new Error("Unauthorized");
      unauthorizedError.response = { status: 401, data: { message: "Bearer token required" } };
      api.get.mockRejectedValueOnce(unauthorizedError);

      await expect(fetchSignatureAssetBlob("protected_ref.png")).rejects.toThrow();
    });
  });

  describe("4. Authenticated Blob URL Lifecycle and Revocation", () => {
    it("fetches blob, creates Object URL, and revokes it on unmount", async () => {
      const dummyBlob = new Blob(["image data"], { type: "image/png" });
      api.get.mockResolvedValueOnce({ data: dummyBlob });

      const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/mock-uuid-1");
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const { result, unmount } = renderHook(() =>
        useSignatureImage("sig_asset_002.png")
      );

      await waitFor(() => {
        expect(result.current.imageUrl).toBe("blob:http://localhost/mock-uuid-1");
      });

      expect(createObjectURLMock).toHaveBeenCalledWith(dummyBlob);

      // Unmount hook: must revoke Object URL to prevent memory leaks
      unmount();
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/mock-uuid-1");
    });

    it("revokes previous Object URL and allocates new one when signatureRef changes", async () => {
      const blobA = new Blob(["image A"], { type: "image/png" });
      const blobB = new Blob(["image B"], { type: "image/png" });
      api.get.mockResolvedValueOnce({ data: blobA }).mockResolvedValueOnce({ data: blobB });

      let callCount = 0;
      const createObjectURLMock = vi.fn(() => `blob:http://localhost/mock-uuid-${++callCount}`);
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const { result, rerender } = renderHook(
        ({ ref }) => useSignatureImage(ref),
        { initialProps: { ref: "sig_first.png" } }
      );

      await waitFor(() => {
        expect(result.current.imageUrl).toBe("blob:http://localhost/mock-uuid-1");
      });

      // Change signature reference (e.g. after replacement)
      rerender({ ref: "sig_second.png" });

      await waitFor(() => {
        expect(result.current.imageUrl).toBe("blob:http://localhost/mock-uuid-2");
      });

      // Must have revoked the first URL
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/mock-uuid-1");
    });

    it("handles 401 or network errors gracefully: sets error and leaves imageUrl null", async () => {
      const authErr = new Error("Unauthorized asset access");
      authErr.response = { status: 401 };
      api.get.mockRejectedValueOnce(authErr);

      const { result } = renderHook(() =>
        useSignatureImage("unauthorized_sig.png")
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(authErr);
      expect(result.current.imageUrl).toBeNull();
    });

    it("handles null or blank signatureRef without making any API request", () => {
      const { result } = renderHook(() => useSignatureImage(null));
      expect(result.current.imageUrl).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe("5. Historical Invoice Snapshotting Independence", () => {
    it("preserves historical invoice snapshotted signature even when current Company Profile changes", () => {
      const historicalInvoice = {
        isDraftPreview: false,
        generated: true,
        invoiceNumber: "INV-2025-0042",
        sellerName: "Paves Technologies Pvt Ltd",
        sellerSignatureReference: "https://storage.enterprise.local/signatures/old-signatory-2025.png",
        subtotal: 1000,
        totalTax: 0,
        grandTotal: 1000,
        items: [],
      };

      const updatedCompanyProfile = {
        companyProfileId: "cp-1",
        legalName: "Paves Technologies Pvt Ltd",
        signatureReference: "https://storage.enterprise.local/signatures/new-signatory-2026.png",
      };

      render(
        <InvoicePreviewDocument
          invoice={historicalInvoice}
          companyProfile={updatedCompanyProfile}
        />
      );

      const sigImg = screen.getByAltText("Authorized Signatory Signature");
      expect(sigImg).toBeInTheDocument();
      expect(sigImg).toHaveAttribute(
        "src",
        "https://storage.enterprise.local/signatures/old-signatory-2025.png"
      );
    });
  });

  describe("6. Signature Rendering in Draft Preview & PDF / Print Layout", () => {
    it("renders signature image inside Authorized Signatory box when valid signature exists", () => {
      const invoiceWithSignature = {
        isDraftPreview: true,
        generated: false,
        sellerName: "Paves Technologies Pvt Ltd",
        sellerSignatureReference: "https://storage.enterprise.local/signatures/signatory.png",
        subtotal: 2500,
        totalTax: 0,
        grandTotal: 2500,
        items: [],
      };

      render(<InvoicePreviewDocument invoice={invoiceWithSignature} />);

      const sigImg = screen.getByAltText("Authorized Signatory Signature");
      expect(sigImg).toBeInTheDocument();
      expect(sigImg).toHaveAttribute(
        "src",
        "https://storage.enterprise.local/signatures/signatory.png"
      );

      expect(screen.getByText("For Paves Technologies Pvt Ltd")).toBeInTheDocument();
      expect(screen.getByText("Authorized Signatory")).toBeInTheDocument();
    });

    it("renders clean signatory area without fabricated signature when signature is absent", () => {
      const invoiceWithoutSignature = {
        isDraftPreview: true,
        generated: false,
        sellerName: "Paves Technologies Pvt Ltd",
        sellerSignatureReference: null,
        subtotal: 1200,
        totalTax: 0,
        grandTotal: 1200,
        items: [],
      };

      render(<InvoicePreviewDocument invoice={invoiceWithoutSignature} />);

      expect(
        screen.queryByAltText("Authorized Signatory Signature")
      ).not.toBeInTheDocument();

      expect(
        screen.getByText("(Draft Preview — Pending Generation)")
      ).toBeInTheDocument();
      expect(screen.getByText("Authorized Signatory")).toBeInTheDocument();
    });

    it("does not claim that image constitutes digital signing or verified approval", () => {
      const invoiceWithSignature = {
        isDraftPreview: false,
        generated: true,
        invoiceNumber: "INV-2026-101",
        sellerName: "Paves Technologies Pvt Ltd",
        sellerSignatureReference: "https://storage.enterprise.local/signatures/signatory.png",
        subtotal: 5000,
        totalTax: 0,
        grandTotal: 5000,
        items: [],
      };

      render(<InvoicePreviewDocument invoice={invoiceWithSignature} />);

      expect(screen.queryByText(/Digitally Signed/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Cryptographically Verified/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Digital Certificate/i)).not.toBeInTheDocument();
    });

    it("keeps seller signature separate from client and project particulars", () => {
      const invoice = {
        isDraftPreview: true,
        generated: false,
        sellerName: "Seller Legal Corp",
        sellerSignatureReference: "https://storage.enterprise.local/signatures/seller-sig.png",
        clientName: "Client Global Inc",
        projectName: "Global Core ERP",
        subtotal: 4000,
        totalTax: 0,
        grandTotal: 4000,
        items: [],
      };

      render(<InvoicePreviewDocument invoice={invoice} />);

      expect(screen.getByText("For Seller Legal Corp")).toBeInTheDocument();
      expect(screen.queryByText("For Client Global Inc")).not.toBeInTheDocument();
    });

    it("preserves print and PDF layout classes without unwanted breaks or overflows", () => {
      const invoice = {
        isDraftPreview: true,
        generated: false,
        sellerName: "Paves Technologies Pvt Ltd",
        sellerSignatureReference: "https://storage.enterprise.local/signatures/signatory.png",
        subtotal: 3000,
        totalTax: 0,
        grandTotal: 3000,
        items: [],
      };

      const { container } = render(<InvoicePreviewDocument invoice={invoice} />);
      const paperSheet = container.querySelector(".print\\:shadow-none");
      expect(paperSheet).toBeInTheDocument();
      expect(paperSheet).toHaveClass("print:shadow-none");
      expect(paperSheet).toHaveClass("print:border-none");
    });
  });
});
